/**
 * Sessions. The browser holds a 256-bit random token in an HttpOnly cookie; the database holds
 * only its SHA-256, so a leaked database cannot be replayed as cookies.
 */
import { and, eq, ne } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { sessions, users } from '../db/schema.ts';
import { randomToken, sha256 } from '../security/crypto.ts';

export const SESSION_COOKIE = '__Host-vl_session';
const DAY = 24 * 60 * 60 * 1000;
/** A session ends after this long without use... */
export const IDLE_MS = 7 * DAY;
/** ...and after this long in total, however active. */
export const ABSOLUTE_MS = 30 * DAY;
/** Recent re-authentication unlocks sensitive actions for this long. */
export const SUDO_MS = 10 * 60 * 1000;
/** Only write last-seen once an hour, not on every request. */
const TOUCH_MS = 60 * 60 * 1000;

export type Session = typeof sessions.$inferSelect;
export type User = typeof users.$inferSelect;

export interface NewSession {
	userId: string;
	ipHash: string;
	userAgent: string;
	/** The password or provider is checked but the second factor is still owed. */
	pendingTwoFactor?: boolean;
	twoFactorVerified?: boolean;
}

export async function createSession(
	db: Database,
	input: NewSession,
	now = new Date()
): Promise<{ token: string; session: Session }> {
	const token = randomToken();
	const [session] = await db
		.insert(sessions)
		.values({
			id: sha256(token),
			userId: input.userId,
			createdAt: now,
			lastSeenAt: now,
			expiresAt: new Date(now.getTime() + ABSOLUTE_MS),
			pendingTwoFactor: input.pendingTwoFactor ?? false,
			twoFactorVerified: input.twoFactorVerified ?? false,
			// Signing in is itself a fresh re-authentication.
			sudoUntil: input.pendingTwoFactor ? null : new Date(now.getTime() + SUDO_MS),
			ipHash: input.ipHash,
			userAgent: input.userAgent.slice(0, 400)
		})
		.returning();
	return { token, session: session! };
}

export const isExpired = (session: Session, now: Date): boolean =>
	session.expiresAt <= now || session.lastSeenAt.getTime() + IDLE_MS <= now.getTime();

/** The session and its user for a cookie token, or null if it is unknown, expired or banned. */
export async function validateSession(
	db: Database,
	token: string,
	now = new Date()
): Promise<{ session: Session; user: User } | null> {
	const id = sha256(token);
	const [row] = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id));
	if (!row) return null;
	if (isExpired(row.session, now) || row.user.bannedAt) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	if (now.getTime() - row.session.lastSeenAt.getTime() > TOUCH_MS) {
		await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
		row.session.lastSeenAt = now;
	}
	return row;
}

export async function deleteSession(db: Database, id: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, id));
}

/** Signs a user out everywhere, optionally keeping the session they are using right now. */
export async function deleteUserSessions(db: Database, userId: string, keepId?: string) {
	await db
		.delete(sessions)
		.where(
			keepId
				? and(eq(sessions.userId, userId), ne(sessions.id, keepId))
				: eq(sessions.userId, userId)
		);
}

export async function grantSudo(db: Database, id: string, now = new Date()): Promise<void> {
	await db
		.update(sessions)
		.set({ sudoUntil: new Date(now.getTime() + SUDO_MS) })
		.where(eq(sessions.id, id));
}

export const hasSudo = (session: Session, now = new Date()): boolean =>
	!!session.sudoUntil && session.sudoUntil > now;

/** Second factor passed: the session becomes a full one. */
export async function completeTwoFactor(db: Database, id: string, now = new Date()) {
	await db
		.update(sessions)
		.set({
			pendingTwoFactor: false,
			twoFactorVerified: true,
			sudoUntil: new Date(now.getTime() + SUDO_MS)
		})
		.where(eq(sessions.id, id));
}

export function sessionCookieOptions(expiresAt: Date) {
	return {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax' as const,
		expires: expiresAt
	};
}
