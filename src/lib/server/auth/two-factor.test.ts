import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { deriveKey } from '../security/crypto.ts';
import { codeForStep, stepAt } from './totp.ts';
import { findUserById } from './users.ts';
import {
	beginEnrollment,
	confirmEnrollment,
	disableTwoFactor,
	pendingSecret,
	regenerateRecoveryCodes,
	remainingRecoveryCodes,
	verifySecondFactor
} from './two-factor.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

const key = deriveKey(Buffer.alloc(32, 9), 'totp');
const T = new Date('2026-05-05T10:00:00Z');
const codeAt = (secret: string, time: Date, offset = 0) =>
	codeForStep(secret, stepAt(time) + offset);

async function enrolled() {
	const user = await makeUser(db);
	const secret = await beginEnrollment(db, key, user.id);
	const codes = await confirmEnrollment(db, key, user.id, codeAt(secret, T), T);
	return { user: (await findUserById(db, user.id))!, secret, codes: codes! };
}

describe('setting up two-factor', () => {
	it('keeps the secret sealed and off until a code from the app proves it', async () => {
		const user = await makeUser(db);
		const secret = await beginEnrollment(db, key, user.id);

		const stored = await findUserById(db, user.id);
		expect(stored?.totpSecret).toMatch(/^v1\./);
		expect(stored?.totpSecret).not.toContain(secret);
		expect(stored?.totpEnabledAt).toBeNull();
		expect(await pendingSecret(db, key, user.id)).toBe(secret);

		expect(await confirmEnrollment(db, key, user.id, '000000', T)).toBeNull();
		const codes = await confirmEnrollment(db, key, user.id, codeAt(secret, T), T);
		expect(codes).toHaveLength(10);
		expect((await findUserById(db, user.id))?.totpEnabledAt).toEqual(T);
		expect(await pendingSecret(db, key, user.id)).toBeNull();
		expect(await remainingRecoveryCodes(db, user.id)).toBe(10);
	});

	it('cannot be confirmed without starting first', async () => {
		const user = await makeUser(db);

		expect(await confirmEnrollment(db, key, user.id, '123456', T)).toBeNull();
		expect(await pendingSecret(db, key, 'nobody')).toBeNull();
	});
});

describe('checking the second factor', () => {
	it('accepts a fresh authenticator code once, never the same one twice', async () => {
		const { user, secret } = await enrolled();
		const later = new Date(T.getTime() + 60_000);
		const code = codeAt(secret, later);

		expect(await verifySecondFactor(db, key, user, code, later)).toBe('totp');
		const updated = (await findUserById(db, user.id))!;
		expect(await verifySecondFactor(db, key, updated, code, later)).toBeNull();
		expect(await verifySecondFactor(db, key, updated, '123', later)).toBeNull();
	});

	it('refuses the code already used to switch two-factor on', async () => {
		const { user, secret } = await enrolled();

		expect(await verifySecondFactor(db, key, user, codeAt(secret, T), T)).toBeNull();
	});

	it('accepts each recovery code once, in any format', async () => {
		const { user, codes } = await enrolled();

		expect(await verifySecondFactor(db, key, user, codes[0]!.toUpperCase(), T)).toBe('recovery');
		expect(await verifySecondFactor(db, key, user, codes[0]!, T)).toBeNull();
		expect(await verifySecondFactor(db, key, user, codes[1]!.replaceAll('-', ''), T)).toBe(
			'recovery'
		);
		expect(await verifySecondFactor(db, key, user, 'zzzz-zzzz-zz', T)).toBeNull();
		expect(await remainingRecoveryCodes(db, user.id)).toBe(8);
	});

	it('says no for an account without two-factor', async () => {
		const user = await makeUser(db);

		expect(await verifySecondFactor(db, key, user, '123456', T)).toBeNull();
	});
});

describe('managing two-factor', () => {
	it('replaces all recovery codes, so old ones stop working', async () => {
		const { user, codes } = await enrolled();
		await verifySecondFactor(db, key, user, codes[0]!, T);

		const fresh = await regenerateRecoveryCodes(db, user.id);
		expect(fresh).toHaveLength(10);
		expect(await remainingRecoveryCodes(db, user.id)).toBe(10);
		expect(await verifySecondFactor(db, key, user, codes[1]!, T)).toBeNull();
		expect(await verifySecondFactor(db, key, user, fresh[0]!, T)).toBe('recovery');
	});

	it('switches off completely', async () => {
		const { user, codes } = await enrolled();

		await disableTwoFactor(db, user.id);
		const off = (await findUserById(db, user.id))!;
		expect(off).toMatchObject({ totpSecret: null, totpEnabledAt: null, totpLastStep: null });
		expect(await remainingRecoveryCodes(db, user.id)).toBe(0);
		expect(await verifySecondFactor(db, key, off, codes[0]!, T)).toBeNull();
	});
});
