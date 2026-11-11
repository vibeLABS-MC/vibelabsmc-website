/**
 * Two-factor sign-in with an authenticator app. The secret is sealed with AES-256-GCM before
 * it is stored; recovery codes are stored as hashes and each works once.
 */
import { and, count, eq, isNull } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { recoveryCodes, users } from '../db/schema.ts';
import { decrypt, encrypt } from '../security/crypto.ts';
import {
	hashRecoveryCode,
	looksLikeRecoveryCode,
	newRecoveryCodes,
	newTotpSecret,
	verifyTotp
} from './totp.ts';
import type { User } from './session.ts';

/** Starts setting up: a new secret is kept (sealed) but not switched on until a code proves it works. */
export async function beginEnrollment(db: Database, key: Buffer, userId: string): Promise<string> {
	const secret = newTotpSecret();
	await db
		.update(users)
		.set({ totpSecret: encrypt(key, secret), totpEnabledAt: null, totpLastStep: null })
		.where(eq(users.id, userId));
	return secret;
}

/** The secret being set up (for showing the QR code again), or null. */
export async function pendingSecret(
	db: Database,
	key: Buffer,
	userId: string
): Promise<string | null> {
	const [row] = await db
		.select({ secret: users.totpSecret, enabled: users.totpEnabledAt })
		.from(users)
		.where(eq(users.id, userId));
	return row?.secret && !row.enabled ? decrypt(key, row.secret) : null;
}

async function storeRecoveryCodes(db: Database, userId: string): Promise<string[]> {
	const { codes, hashes } = newRecoveryCodes();
	await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
	await db.insert(recoveryCodes).values(hashes.map((codeHash) => ({ userId, codeHash })));
	return codes;
}

/** Switches two-factor on once the first code checks out. Returns the recovery codes, or null. */
export async function confirmEnrollment(
	db: Database,
	key: Buffer,
	userId: string,
	code: string,
	now = new Date()
): Promise<string[] | null> {
	const secret = await pendingSecret(db, key, userId);
	const step = secret ? verifyTotp(secret, code, now) : null;
	if (step === null) return null;
	await db
		.update(users)
		.set({ totpEnabledAt: now, totpLastStep: step, updatedAt: now })
		.where(eq(users.id, userId));
	return storeRecoveryCodes(db, userId);
}

export type SecondFactor = 'totp' | 'recovery';

/** Checks an authenticator code or a recovery code, using either up so it can't be reused. */
export async function verifySecondFactor(
	db: Database,
	key: Buffer,
	user: Pick<User, 'id' | 'totpSecret' | 'totpEnabledAt' | 'totpLastStep'>,
	input: string,
	now = new Date()
): Promise<SecondFactor | null> {
	if (!user.totpSecret || !user.totpEnabledAt) return null;
	if (looksLikeRecoveryCode(input)) {
		const [used] = await db
			.update(recoveryCodes)
			.set({ usedAt: now })
			.where(
				and(
					eq(recoveryCodes.userId, user.id),
					eq(recoveryCodes.codeHash, hashRecoveryCode(input)),
					isNull(recoveryCodes.usedAt)
				)
			)
			.returning({ id: recoveryCodes.id });
		return used ? 'recovery' : null;
	}
	const step = verifyTotp(decrypt(key, user.totpSecret), input, now, user.totpLastStep);
	if (step === null) return null;
	await db.update(users).set({ totpLastStep: step }).where(eq(users.id, user.id));
	return 'totp';
}

export async function disableTwoFactor(db: Database, userId: string): Promise<void> {
	await db
		.update(users)
		.set({ totpSecret: null, totpEnabledAt: null, totpLastStep: null, updatedAt: new Date() })
		.where(eq(users.id, userId));
	await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
}

export const regenerateRecoveryCodes = storeRecoveryCodes;

export async function remainingRecoveryCodes(db: Database, userId: string): Promise<number> {
	const [row] = await db
		.select({ n: count() })
		.from(recoveryCodes)
		.where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));
	return row?.n ?? 0;
}
