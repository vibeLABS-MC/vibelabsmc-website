import { redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { clearSessionCookie } from '#lib/server/auth/flow.ts';
import { safeNext } from '#lib/server/auth/next.ts';
import { deleteSession } from '#lib/server/auth/session.ts';
import type { Actions, PageServerLoad } from './$types';

/** Visiting /logout (e.g. from the docs site) asks first; signing out is always a POST. */
export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.session && !locals.pendingSession) redirect(303, '/');
	return {
		next: safeNext(
			url.searchParams.get('next'),
			locals.config.origin,
			locals.config.accountOrigins,
			'/'
		),
		name: locals.user?.displayName ?? null
	};
};

export const actions: Actions = {
	default: async ({ locals, cookies, url }) => {
		const session = locals.session ?? locals.pendingSession;
		if (session) {
			await deleteSession(locals.db, session.id);
			await audit(locals.db, {
				actorId: session.userId,
				action: 'auth.sign_out',
				targetType: 'user',
				targetId: session.userId,
				ipHash: locals.ipHash
			});
		}
		clearSessionCookie(cookies);
		redirect(
			303,
			safeNext(
				url.searchParams.get('next'),
				locals.config.origin,
				locals.config.accountOrigins,
				'/'
			),
			{ external: locals.config.accountOrigins }
		);
	}
};
