import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { sessions, users } from '../db/schema.ts';
import { sha256 } from '../security/crypto.ts';
import {
	ABSOLUTE_MS,
	completeTwoFactor,
	createSession,
	deleteSession,
	deleteUserSessions,
	grantSudo,
	hasSudo,
	IDLE_MS,
	SESSION_COOKIE,
	sessionCookieOptions,
	SUDO_MS,
	validateSession
} from './session.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

const T0 = new Date('2026-01-01T00:00:00Z');
const later = (ms: number) => new Date(T0.getTime() + ms);
const input = (userId: string) => ({ userId, ipHash: 'ip', userAgent: 'test' });

describe('sessions', () => {
	it('stores only the hash of the token, and finds the user from the token', async () => {
		const user = await makeUser(db);
		const { token, session } = await createSession(db, input(user.id), T0);

		expect(session.id).toBe(sha256(token));
		expect(session.id).not.toContain(token);
		expect(session.expiresAt).toEqual(later(ABSOLUTE_MS));
		expect(session.sudoUntil).toEqual(later(SUDO_MS));

		const found = await validateSession(db, token, later(1000));
		expect(found?.user.id).toBe(user.id);
		expect(await validateSession(db, 'not-a-token', T0)).toBeNull();
	});

	it('ends a session that sat idle too long, and deletes it', async () => {
		const user = await makeUser(db);
		const { token, session } = await createSession(db, input(user.id), T0);

		expect(await validateSession(db, token, later(IDLE_MS))).toBeNull();
		expect(await db.select().from(sessions).where(eq(sessions.id, session.id))).toEqual([]);
	});

	it('keeps an active session alive until its hard limit', async () => {
		const user = await makeUser(db);
		const { token } = await createSession(db, input(user.id), T0);

		// Used every 6 days: never idle for 7.
		for (let day = 6; day < 30; day += 6)
			expect(await validateSession(db, token, later(day * 86_400_000))).not.toBeNull();
		expect(await validateSession(db, token, later(ABSOLUTE_MS))).toBeNull();
	});

	it('only writes last-seen once an hour', async () => {
		const user = await makeUser(db);
		const { token, session } = await createSession(db, input(user.id), T0);

		const soon = await validateSession(db, token, later(30 * 60_000));
		expect(soon?.session.lastSeenAt).toEqual(T0);

		const hourLater = await validateSession(db, token, later(61 * 60_000));
		expect(hourLater?.session.lastSeenAt).toEqual(later(61 * 60_000));
		const [stored] = await db.select().from(sessions).where(eq(sessions.id, session.id));
		expect(stored?.lastSeenAt).toEqual(later(61 * 60_000));
	});

	it('refuses and deletes the sessions of a banned user', async () => {
		const user = await makeUser(db);
		const { token } = await createSession(db, input(user.id), T0);
		await db.update(users).set({ bannedAt: T0 }).where(eq(users.id, user.id));

		expect(await validateSession(db, token, later(1000))).toBeNull();
	});

	it('signs out one session, or every session but the current one', async () => {
		const user = await makeUser(db);
		const a = await createSession(db, input(user.id), T0);
		const b = await createSession(db, input(user.id), T0);
		const c = await createSession(db, input(user.id), T0);

		await deleteSession(db, a.session.id);
		expect(await validateSession(db, a.token, T0)).toBeNull();

		await deleteUserSessions(db, user.id, b.session.id);
		expect(await validateSession(db, b.token, T0)).not.toBeNull();
		expect(await validateSession(db, c.token, T0)).toBeNull();

		await deleteUserSessions(db, user.id);
		expect(await validateSession(db, b.token, T0)).toBeNull();
	});

	it('holds back sudo until the second factor is done, then grants it', async () => {
		const user = await makeUser(db);
		const { token, session } = await createSession(
			db,
			{ ...input(user.id), pendingTwoFactor: true },
			T0
		);
		expect(session.pendingTwoFactor).toBe(true);
		expect(hasSudo(session, T0)).toBe(false);

		await completeTwoFactor(db, session.id, T0);
		const done = await validateSession(db, token, T0);
		expect(done?.session.pendingTwoFactor).toBe(false);
		expect(done?.session.twoFactorVerified).toBe(true);
		expect(hasSudo(done!.session, later(SUDO_MS - 1))).toBe(true);
		expect(hasSudo(done!.session, later(SUDO_MS))).toBe(false);

		await grantSudo(db, session.id, later(SUDO_MS));
		const renewed = await validateSession(db, token, later(SUDO_MS));
		expect(hasSudo(renewed!.session, later(SUDO_MS + 1))).toBe(true);
	});

	it('uses a host-only, HttpOnly, Secure, Lax cookie', () => {
		expect(SESSION_COOKIE.startsWith('__Host-')).toBe(true);
		expect(sessionCookieOptions(T0)).toEqual({
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			expires: T0
		});
	});
});
