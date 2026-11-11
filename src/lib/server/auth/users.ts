/** Accounts and the ways to sign in to them. */
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { isUniqueViolation } from '../db/errors.ts';
import { oauthAccounts, users } from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import type { ProviderId, ProviderProfile } from './oauth.ts';
import type { User } from './session.ts';

const displayNameOf = (value: string) => value.trim().slice(0, 64) || 'Crafter';

export async function findUserByEmail(db: Database, email: string): Promise<User | null> {
	const [user] = await db
		.select()
		.from(users)
		.where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
	return user ?? null;
}

export async function findUserById(db: Database, id: string): Promise<User | null> {
	const [user] = await db.select().from(users).where(eq(users.id, id));
	return user ?? null;
}

export async function isUsernameTaken(db: Database, username: string): Promise<boolean> {
	const [row] = await db
		.select({ id: users.id })
		.from(users)
		.where(sql`lower(${users.username}) = ${username.toLowerCase()}`);
	return !!row;
}

/** GitHub accounts listed in ADMIN_GITHUB_IDS are admins; everyone else starts as a user. */
const bootstrapRole = (provider: ProviderId, profile: ProviderProfile, adminGithubIds: string[]) =>
	provider === 'github' && adminGithubIds.includes(profile.id) ? 'admin' : 'user';

export interface OAuthSignIn {
	user: User;
	created: boolean;
	promoted: boolean;
}

/** Finds the account linked to this provider identity, or creates a new one (no merging by email). */
export async function oauthSignIn(
	db: Database,
	input: {
		provider: ProviderId;
		profile: ProviderProfile;
		adminGithubIds: string[];
		avatarKey: string | null;
	}
): Promise<OAuthSignIn> {
	const { provider, profile } = input;
	const role = bootstrapRole(provider, profile, input.adminGithubIds);
	const [linked] = await db
		.select({ user: users })
		.from(oauthAccounts)
		.innerJoin(users, eq(users.id, oauthAccounts.userId))
		.where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, profile.id)));

	if (linked) {
		await db
			.update(oauthAccounts)
			.set({ providerUsername: profile.username })
			.where(
				and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, profile.id))
			);
		const promoted = role === 'admin' && linked.user.role !== 'admin';
		if (promoted) await db.update(users).set({ role }).where(eq(users.id, linked.user.id));
		return { user: promoted ? { ...linked.user, role } : linked.user, created: false, promoted };
	}

	const user = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(users)
			.values({
				id: newId(),
				displayName: displayNameOf(profile.displayName),
				role,
				avatarKey: input.avatarKey
			})
			.returning();
		await tx.insert(oauthAccounts).values({
			provider,
			providerUserId: profile.id,
			userId: created!.id,
			providerUsername: profile.username
		});
		return created!;
	});
	return { user, created: true, promoted: role === 'admin' };
}

export type LinkResult = 'linked' | 'taken' | 'has-provider';

/** Adds a provider to the signed-in account. Refuses an identity that belongs to someone else. */
export async function linkProvider(
	db: Database,
	userId: string,
	provider: ProviderId,
	profile: ProviderProfile,
	adminGithubIds: string[] = []
): Promise<LinkResult> {
	const [existing] = await db
		.select({ userId: oauthAccounts.userId })
		.from(oauthAccounts)
		.where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, profile.id)));
	if (existing) return existing.userId === userId ? 'linked' : 'taken';
	try {
		await db.insert(oauthAccounts).values({
			provider,
			providerUserId: profile.id,
			userId,
			providerUsername: profile.username
		});
	} catch (error) {
		if (isUniqueViolation(error)) return 'has-provider';
		throw error;
	}
	if (bootstrapRole(provider, profile, adminGithubIds) === 'admin')
		await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
	return 'linked';
}

export interface SignInMethods {
	providers: { provider: ProviderId; username: string }[];
	password: boolean;
}

export async function signInMethods(db: Database, userId: string): Promise<SignInMethods> {
	const providers = await db
		.select({ provider: oauthAccounts.provider, username: oauthAccounts.providerUsername })
		.from(oauthAccounts)
		.where(eq(oauthAccounts.userId, userId))
		.orderBy(oauthAccounts.provider);
	const [user] = await db
		.select({ hash: users.passwordHash, verified: users.emailVerifiedAt })
		.from(users)
		.where(eq(users.id, userId));
	return { providers, password: !!(user?.hash && user.verified) };
}

export type UnlinkResult = 'unlinked' | 'not-linked' | 'last-method';

/** Removes a provider, but never the last way into the account. */
export async function unlinkProvider(
	db: Database,
	userId: string,
	provider: ProviderId
): Promise<UnlinkResult> {
	const methods = await signInMethods(db, userId);
	if (!methods.providers.some((p) => p.provider === provider)) return 'not-linked';
	if (methods.providers.length + (methods.password ? 1 : 0) <= 1) return 'last-method';
	await db
		.delete(oauthAccounts)
		.where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
	return 'unlinked';
}

export type EmailSignUp = { user: User } | { problem: 'username-taken' | 'email-taken' };

export async function createEmailUser(
	db: Database,
	input: { username: string; email: string; passwordHash: string }
): Promise<EmailSignUp> {
	if (await isUsernameTaken(db, input.username)) return { problem: 'username-taken' };
	try {
		const [user] = await db
			.insert(users)
			.values({
				id: newId(),
				username: input.username,
				displayName: input.username,
				email: input.email,
				passwordHash: input.passwordHash
			})
			.returning();
		return { user: user! };
	} catch (error) {
		if (!isUniqueViolation(error)) throw error;
		return {
			problem: (await isUsernameTaken(db, input.username)) ? 'username-taken' : 'email-taken'
		};
	}
}

/** Sets the username chosen at onboarding (or changed in settings). False if it is taken. */
export async function setUsername(
	db: Database,
	userId: string,
	username: string
): Promise<boolean> {
	try {
		await db.update(users).set({ username, updatedAt: new Date() }).where(eq(users.id, userId));
		return true;
	} catch (error) {
		if (isUniqueViolation(error)) return false;
		throw error;
	}
}
