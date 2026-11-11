/**
 * The last step of every sign-in (password, GitHub, Discord): start a session, owe the second
 * factor if the account has one, record it, and decide where to go next.
 */
import type { Cookies } from '@sveltejs/kit';
import { audit } from '../audit.ts';
import { SESSION_COOKIE, createSession, sessionCookieOptions, type User } from './session.ts';

export type SignInMethod = 'password' | 'github' | 'discord';

export interface SignInContext {
	locals: App.Locals;
	cookies: Cookies;
	userAgent: string;
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, sessionCookieOptions(new Date(0)));
}

/** Where to go after signing in: the second factor, then choosing a username, then `next`. */
export function afterSignIn(user: Pick<User, 'username' | 'totpEnabledAt'>, next: string): string {
	if (user.totpEnabledAt) return `/auth/2fa?next=${encodeURIComponent(next)}`;
	if (!user.username) return `/onboarding?next=${encodeURIComponent(next)}`;
	return next;
}

/** Starts a session for someone who just proved who they are. Returns where to send them. */
export async function signIn(
	context: SignInContext,
	user: User,
	method: SignInMethod,
	next: string
): Promise<string> {
	const { locals, cookies } = context;
	const pending = !!user.totpEnabledAt;
	const { token, session } = await createSession(locals.db, {
		userId: user.id,
		ipHash: locals.ipHash,
		userAgent: context.userAgent,
		pendingTwoFactor: pending
	});
	setSessionCookie(cookies, token, session.expiresAt);
	await audit(locals.db, {
		actorId: user.id,
		action: pending ? 'auth.sign_in.pending_2fa' : 'auth.sign_in',
		targetType: 'user',
		targetId: user.id,
		details: { method },
		ipHash: locals.ipHash
	});
	return afterSignIn(user, next);
}
