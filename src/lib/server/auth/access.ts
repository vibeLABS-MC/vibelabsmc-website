/**
 * Who may open which part of the site. One pure function, so every rule is tested; the
 * request hook applies its answer before any page code runs.
 */

export type Role = 'user' | 'moderator' | 'admin';

export interface Viewer {
	role: Role;
	/** Has chosen a username. */
	onboarded: boolean;
	totpEnabled: boolean;
	/** This session passed the second factor (or the account has none). */
	twoFactorVerified: boolean;
}

export type Decision = { kind: 'allow' } | { kind: 'redirect'; to: string } | { kind: 'not-found' };

const ALLOW: Decision = { kind: 'allow' };

/** Pages for signed-in people only. */
const ACCOUNT_AREAS = ['/dashboard', '/settings', '/onboarding', '/notifications'];
/** Usable before a username is chosen. */
const ONBOARDING_FREE = ['/onboarding', '/logout', '/auth', '/legal', '/api', '/login'];

const within = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const anyWithin = (path: string, prefixes: string[]) => prefixes.some((p) => within(path, p));

export const isStaff = (role: Role) => role === 'moderator' || role === 'admin';

const toLogin = (pathAndQuery: string): Decision => ({
	kind: 'redirect',
	to: `/login?next=${encodeURIComponent(pathAndQuery)}`
});

function adminAccess(viewer: Viewer | null, pathAndQuery: string): Decision {
	if (!viewer) return toLogin(pathAndQuery);
	// Ordinary users don't learn that the admin area exists.
	if (!isStaff(viewer.role)) return { kind: 'not-found' };
	if (!viewer.totpEnabled) return { kind: 'redirect', to: '/settings/security?required=staff' };
	if (!viewer.twoFactorVerified)
		return { kind: 'redirect', to: `/auth/2fa?next=${encodeURIComponent(pathAndQuery)}` };
	return ALLOW;
}

export function decideAccess(path: string, search: string, viewer: Viewer | null): Decision {
	const pathAndQuery = path + search;
	if (within(path, '/admin')) return adminAccess(viewer, pathAndQuery);
	if (
		viewer &&
		!viewer.onboarded &&
		!anyWithin(path, ONBOARDING_FREE) &&
		!path.startsWith('/_app/')
	)
		return { kind: 'redirect', to: `/onboarding?next=${encodeURIComponent(pathAndQuery)}` };
	if (!viewer && anyWithin(path, ACCOUNT_AREAS)) return toLogin(pathAndQuery);
	return ALLOW;
}
