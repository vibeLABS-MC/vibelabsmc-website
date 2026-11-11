/** Checks route code makes before acting: signed in, staff, recently re-confirmed. */
import { error, fail, redirect } from '@sveltejs/kit';
import { isStaff } from './access.ts';
import { hasSudo, type Session } from './session.ts';
import type { SessionUser } from './viewer.ts';

export function requireUser(
	locals: App.Locals,
	url?: URL
): { user: SessionUser; session: Session } {
	if (!locals.user || !locals.session)
		redirect(303, url ? `/login?next=${encodeURIComponent(url.pathname + url.search)}` : '/login');
	return { user: locals.user, session: locals.session };
}

/** Staff with two-factor passed in this session; others get a 404, as if the page did not exist. */
export function requireStaff(locals: App.Locals): { user: SessionUser; session: Session } {
	const user = locals.user;
	const session = locals.session;
	if (!user || !session || !isStaff(user.role) || !user.totpEnabled || !session.twoFactorVerified)
		error(404, 'Not found');
	return { user, session };
}

export function requireAdmin(locals: App.Locals): { user: SessionUser; session: Session } {
	const staff = requireStaff(locals);
	if (staff.user.role !== 'admin') error(403, 'Only admins can do that.');
	return staff;
}

export const confirmUrl = (path: string) => `/auth/confirm?next=${encodeURIComponent(path)}`;

/** For sensitive form actions: a failure asking for re-confirmation, or null when recently confirmed. */
export function sudoFailure(locals: App.Locals, returnTo: string) {
	if (locals.session && hasSudo(locals.session)) return null;
	return fail(403, { sudo: confirmUrl(returnTo), message: 'Confirm it’s you first.' });
}
