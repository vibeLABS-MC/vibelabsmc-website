import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { isUniqueViolation } from '../db/errors.ts';
import { users } from '../db/schema.ts';
import {
	createEmailUser,
	findUserByEmail,
	findUserById,
	isUsernameTaken,
	linkProvider,
	oauthSignIn,
	setUsername,
	signInMethods,
	unlinkProvider
} from './users.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

const profile = (id: string, username = `gh${id}`) => ({
	id,
	username,
	displayName: `Name ${id}`,
	avatarUrl: null
});

describe('oauthSignIn', () => {
	it('creates an account on first sign-in, then finds the same one again', async () => {
		const first = await oauthSignIn(db, {
			provider: 'github',
			profile: profile('1'),
			adminGithubIds: [],
			avatarKey: 'k'
		});
		expect(first).toMatchObject({ created: true, promoted: false });
		expect(first.user).toMatchObject({
			username: null,
			displayName: 'Name 1',
			role: 'user',
			avatarKey: 'k'
		});

		const again = await oauthSignIn(db, {
			provider: 'github',
			profile: profile('1', 'renamed'),
			adminGithubIds: [],
			avatarKey: null
		});
		expect(again).toMatchObject({ created: false, promoted: false });
		expect(again.user.id).toBe(first.user.id);
		expect((await signInMethods(db, first.user.id)).providers).toEqual([
			{ provider: 'github', username: 'renamed' }
		]);
	});

	it('never joins a Discord identity to a GitHub account with the same name', async () => {
		const gh = await oauthSignIn(db, {
			provider: 'github',
			profile: profile('7', 'same'),
			adminGithubIds: [],
			avatarKey: null
		});
		const dc = await oauthSignIn(db, {
			provider: 'discord',
			profile: profile('7', 'same'),
			adminGithubIds: [],
			avatarKey: null
		});

		expect(dc.created).toBe(true);
		expect(dc.user.id).not.toBe(gh.user.id);
	});

	it('makes the GitHub IDs in ADMIN_GITHUB_IDS admins, now or on their next sign-in', async () => {
		const admin = await oauthSignIn(db, {
			provider: 'github',
			profile: profile('900'),
			adminGithubIds: ['900'],
			avatarKey: null
		});
		expect(admin).toMatchObject({ created: true, promoted: true });
		expect(admin.user.role).toBe('admin');

		await oauthSignIn(db, {
			provider: 'github',
			profile: profile('901'),
			adminGithubIds: [],
			avatarKey: null
		});
		const later = await oauthSignIn(db, {
			provider: 'github',
			profile: profile('901'),
			adminGithubIds: ['901'],
			avatarKey: null
		});
		expect(later).toMatchObject({ promoted: true });
		expect(later.user.role).toBe('admin');

		// A Discord account with that number is not the GitHub account.
		const dc = await oauthSignIn(db, {
			provider: 'discord',
			profile: profile('902'),
			adminGithubIds: ['902'],
			avatarKey: null
		});
		expect(dc.user.role).toBe('user');
	});

	it('gives nameless profiles a placeholder display name', async () => {
		const blank = await oauthSignIn(db, {
			provider: 'discord',
			profile: { id: '55', username: 'x', displayName: '   ', avatarUrl: null },
			adminGithubIds: [],
			avatarKey: null
		});
		expect(blank.user.displayName).toBe('Crafter');
	});
});

describe('linking providers', () => {
	it('adds a provider to an account, and refuses one linked to someone else', async () => {
		const owner = await makeUser(db);
		const other = await makeUser(db);

		expect(await linkProvider(db, owner.id, 'discord', profile('d1'))).toBe('linked');
		expect(await linkProvider(db, owner.id, 'discord', profile('d1'))).toBe('linked');
		expect(await linkProvider(db, other.id, 'discord', profile('d1'))).toBe('taken');
		expect(await linkProvider(db, owner.id, 'discord', profile('d2'))).toBe('has-provider');
	});

	it('promotes the account when the linked GitHub identity is a bootstrap admin', async () => {
		const user = await makeUser(db);

		await linkProvider(db, user.id, 'github', profile('777'), ['777']);
		expect((await findUserById(db, user.id))?.role).toBe('admin');
	});

	it('never removes the last way to sign in', async () => {
		const user = await makeUser(db);
		await linkProvider(db, user.id, 'github', profile('g-last'));
		await linkProvider(db, user.id, 'discord', profile('d-last'));

		expect(await unlinkProvider(db, user.id, 'discord')).toBe('unlinked');
		expect(await unlinkProvider(db, user.id, 'discord')).toBe('not-linked');
		expect(await unlinkProvider(db, user.id, 'github')).toBe('last-method');

		await db
			.update(users)
			.set({ passwordHash: 'h', emailVerifiedAt: new Date(), email: 'last@x.org' })
			.where(eq(users.id, user.id));
		expect((await signInMethods(db, user.id)).password).toBe(true);
		expect(await unlinkProvider(db, user.id, 'github')).toBe('unlinked');
	});

	it('does not count a password whose email was never confirmed', async () => {
		const user = await makeUser(db, { passwordHash: 'h', email: 'unverified@x.org' });

		expect((await signInMethods(db, user.id)).password).toBe(false);
	});
});

describe('email accounts', () => {
	it('creates one, and reports a taken username or email without revealing more', async () => {
		const made = await createEmailUser(db, {
			username: 'Alex',
			email: 'Alex@Example.org',
			passwordHash: 'h'
		});
		expect('user' in made && made.user.username).toBe('Alex');

		expect(
			await createEmailUser(db, { username: 'alex', email: 'new@example.org', passwordHash: 'h' })
		).toEqual({
			problem: 'username-taken'
		});
		expect(
			await createEmailUser(db, { username: 'alex2', email: 'alex@example.ORG', passwordHash: 'h' })
		).toEqual({
			problem: 'email-taken'
		});
		expect((await findUserByEmail(db, 'ALEX@example.org'))?.username).toBe('Alex');
		expect(await findUserByEmail(db, 'nobody@example.org')).toBeNull();
		expect(await findUserById(db, 'missing')).toBeNull();
	});

	it('sets a username once it is free, whatever the case', async () => {
		const user = await makeUser(db, { username: null });

		expect(await isUsernameTaken(db, 'ALEX')).toBe(true);
		expect(await setUsername(db, user.id, 'ALEX')).toBe(false);
		expect(await setUsername(db, user.id, 'Brand_New')).toBe(true);
		expect((await findUserById(db, user.id))?.username).toBe('Brand_New');
	});
});

describe('isUniqueViolation', () => {
	it('finds the code on the error or on a wrapped cause', () => {
		expect(isUniqueViolation({ code: '23505' })).toBe(true);
		expect(isUniqueViolation({ cause: { cause: { code: '23505' } } })).toBe(true);
		expect(isUniqueViolation({ code: '23503' })).toBe(false);
		expect(isUniqueViolation(new Error('x'))).toBe(false);
		expect(isUniqueViolation(null)).toBe(false);
	});
});
