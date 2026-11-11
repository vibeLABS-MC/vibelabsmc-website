import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { emailTokens } from '../db/schema.ts';
import {
	consumeEmailToken,
	createEmailToken,
	peekEmailToken,
	TOKEN_TTL_MS
} from './email-tokens.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

const T0 = new Date('2026-03-01T12:00:00Z');

describe('email tokens', () => {
	it('works once, for the purpose it was made for, and stores only a hash', async () => {
		const user = await makeUser(db);
		const token = await createEmailToken(
			db,
			{ userId: user.id, purpose: 'verify_email', email: 'a@b.org' },
			T0
		);

		const rows = await db.select().from(emailTokens);
		expect(rows.map((r) => r.id)).not.toContain(token);
		expect(await peekEmailToken(db, token, 'reset_password', T0)).toBeNull();
		expect(await consumeEmailToken(db, token, 'reset_password', T0)).toBeNull();
		expect(await peekEmailToken(db, token, 'verify_email', T0)).toEqual({
			userId: user.id,
			email: 'a@b.org'
		});
		expect(await consumeEmailToken(db, token, 'verify_email', T0)).toEqual({
			userId: user.id,
			email: 'a@b.org'
		});
		expect(await consumeEmailToken(db, token, 'verify_email', T0)).toBeNull();
		expect(await peekEmailToken(db, token, 'verify_email', T0)).toBeNull();
	});

	it('expires after 30 minutes', async () => {
		const user = await makeUser(db);
		const token = await createEmailToken(
			db,
			{ userId: user.id, purpose: 'reset_password', email: 'a@b.org' },
			T0
		);

		const expired = new Date(T0.getTime() + TOKEN_TTL_MS);
		expect(await peekEmailToken(db, token, 'reset_password', expired)).toBeNull();
		expect(await consumeEmailToken(db, token, 'reset_password', expired)).toBeNull();
	});

	it('cancels the older unused token when a new one is sent', async () => {
		const user = await makeUser(db);
		const first = await createEmailToken(
			db,
			{ userId: user.id, purpose: 'reset_password', email: 'a@b.org' },
			T0
		);
		const second = await createEmailToken(
			db,
			{ userId: user.id, purpose: 'reset_password', email: 'a@b.org' },
			T0
		);

		expect(await consumeEmailToken(db, first, 'reset_password', T0)).toBeNull();
		expect(await consumeEmailToken(db, second, 'reset_password', T0)).not.toBeNull();
	});

	it('lets only one of two simultaneous uses succeed', async () => {
		const user = await makeUser(db);
		const token = await createEmailToken(
			db,
			{ userId: user.id, purpose: 'verify_email', email: 'a@b.org' },
			T0
		);

		const results = await Promise.all([
			consumeEmailToken(db, token, 'verify_email', T0),
			consumeEmailToken(db, token, 'verify_email', T0)
		]);
		expect(results.filter(Boolean)).toHaveLength(1);
	});
});
