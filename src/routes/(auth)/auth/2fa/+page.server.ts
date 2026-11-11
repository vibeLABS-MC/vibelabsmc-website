import { fail, redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { clearSessionCookie } from '#lib/server/auth/flow.ts';
import { nextFrom } from '#lib/server/auth/pages.ts';
import { completeTwoFactor, deleteSession } from '#lib/server/auth/session.ts';
import { verifySecondFactor } from '#lib/server/auth/two-factor.ts';
import { findUserById } from '#lib/server/auth/users.ts';
import { field, limitAction } from '#lib/server/http.ts';
import type { Actions, PageServerLoad } from './$types';

/** The session that owes a second factor: a half-finished sign-in, or a step-up for the admin area. */
function owing(locals: App.Locals) {
	if (locals.pendingSession) return locals.pendingSession;
	if (locals.session && locals.user?.totpEnabled && !locals.session.twoFactorVerified)
		return locals.session;
	return null;
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (!owing(locals))
		redirect(303, locals.user ? nextFrom(locals, url) : '/login', {
			external: locals.config.accountOrigins
		});
	return { next: nextFrom(locals, url) };
};

export const actions: Actions = {
	verify: async ({ request, locals, url }) => {
		const session = owing(locals);
		if (!session) redirect(303, '/login?notice=expired');
		const limited = limitAction(locals, 'twoFactor', session.userId);
		if (limited) return fail(429, { message: limited.data.message });

		const code = field(await request.formData(), 'code');
		const user = await findUserById(locals.db, session.userId);
		const factor = user ? await verifySecondFactor(locals.db, locals.keys.totp, user, code) : null;
		if (!user || !factor)
			return fail(400, {
				message: 'That code didn’t work. Check the time on your phone and try again.'
			});

		await completeTwoFactor(locals.db, session.id);
		locals.limiter.reset(`twoFactor:${session.userId}`);
		await audit(locals.db, {
			actorId: user.id,
			action: factor === 'recovery' ? 'auth.2fa.recovery_code_used' : 'auth.2fa.passed',
			targetType: 'user',
			targetId: user.id,
			ipHash: locals.ipHash
		});
		const next = nextFrom(locals, url);
		redirect(303, user.username ? next : `/onboarding?next=${encodeURIComponent(next)}`, {
			external: locals.config.accountOrigins
		});
	},
	cancel: async ({ locals, cookies }) => {
		const session = owing(locals);
		if (session) await deleteSession(locals.db, session.id);
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
};
