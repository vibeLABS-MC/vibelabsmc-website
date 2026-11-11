import { fail, redirect } from '@sveltejs/kit';
import { createEmailToken } from '#lib/server/auth/email-tokens.ts';
import { signIn } from '#lib/server/auth/flow.ts';
import { authPageData, nextFrom, skipIfSignedIn } from '#lib/server/auth/pages.ts';
import { verifyPassword } from '#lib/server/auth/password.ts';
import { findUserByEmail } from '#lib/server/auth/users.ts';
import { field, limitAction, rawField } from '#lib/server/http.ts';
import { verifyEmail } from '#lib/server/mail/templates.ts';
import type { Actions, PageServerLoad } from './$types';

const NOTICES: Record<string, string> = {
	verified: 'Your email address is confirmed. Sign in to continue.',
	reset: 'Your password is changed and every other device is signed out. Sign in with the new one.',
	'signed-out': 'You are signed out.',
	expired: 'That sign-in took too long or was interrupted. Please try again.',
	deleted: 'Your account and everything in it is deleted.'
};

/** Messages are picked by code, so a link can never put its own words on this page. */
const ERRORS: Record<string, string> = {
	'provider-failed': 'GitHub or Discord didn’t let us sign you in. Please try again.',
	cancelled: 'Signing in was cancelled.',
	suspended: 'This account is suspended. Contact the vibeLABS team if you think this is a mistake.'
};

export const load: PageServerLoad = ({ locals, url }) => {
	skipIfSignedIn(locals, url);
	return {
		...authPageData(locals, url),
		notice: NOTICES[url.searchParams.get('notice') ?? ''] ?? null,
		error: ERRORS[url.searchParams.get('error') ?? ''] ?? null
	};
};

const WRONG = 'Email or password is wrong.';

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		const data = await request.formData();
		const email = field(data, 'email').toLowerCase();
		const password = rawField(data, 'password');
		const values = { email };

		const limited =
			limitAction(locals, 'login', locals.ipHash) ?? limitAction(locals, 'loginAccount', email);
		if (limited) return fail(429, { ...values, message: limited.data.message });
		if (!email || !password)
			return fail(400, { ...values, message: 'Enter your email and password.' });

		const user = await findUserByEmail(locals.db, email);
		const valid = await verifyPassword(user?.passwordHash ?? null, password);
		if (!user || !valid) return fail(400, { ...values, message: WRONG });

		if (user.bannedAt)
			return fail(403, {
				...values,
				message: `This account is suspended${user.banReason ? `: ${user.banReason}` : '.'}`
			});

		if (!user.emailVerifiedAt) {
			if (!limitAction(locals, 'emailSend', user.id)) {
				const token = await createEmailToken(locals.db, {
					userId: user.id,
					purpose: 'verify_email',
					email: user.email!
				});
				await locals.mailer.send(
					verifyEmail(user.email!, `${locals.config.origin}/verify-email?token=${token}`)
				);
			}
			return fail(403, {
				...values,
				message: 'Confirm your email address first. We sent you a new link.'
			});
		}

		locals.limiter.reset(`loginAccount:${email}`);
		const to = await signIn(
			{ locals, cookies, userAgent: request.headers.get('user-agent') ?? '' },
			user,
			'password',
			nextFrom(locals, url)
		);
		redirect(303, to, { external: locals.config.accountOrigins });
	}
};
