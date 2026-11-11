import { fail } from '@sveltejs/kit';
import { createEmailToken } from '#lib/server/auth/email-tokens.ts';
import { skipIfSignedIn } from '#lib/server/auth/pages.ts';
import { findUserByEmail } from '#lib/server/auth/users.ts';
import { emailProblem, field, limitAction } from '#lib/server/http.ts';
import { resetPassword, verifyEmail } from '#lib/server/mail/templates.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	skipIfSignedIn(locals, url);
	return { emailEnabled: locals.mailer.available };
};

export const actions: Actions = {
	/** Always answers the same way, so it can't be used to find out who has an account. */
	default: async ({ request, locals }) => {
		const email = field(await request.formData(), 'email').toLowerCase();
		const problem = emailProblem(email);
		if (problem) return fail(400, { email, message: problem });
		const limited =
			limitAction(locals, 'emailSend', locals.ipHash) ?? limitAction(locals, 'emailSend', email);
		if (limited) return fail(429, { email, message: limited.data.message });

		const user = await findUserByEmail(locals.db, email);
		if (user && !user.bannedAt) {
			const origin = locals.config.origin;
			// Only a confirmed address can receive a reset link; an unconfirmed one gets the
			// confirmation link instead, so typing someone else's address never hands them an account.
			const purpose = user.emailVerifiedAt ? 'reset_password' : 'verify_email';
			const token = await createEmailToken(locals.db, { userId: user.id, purpose, email });
			await locals.mailer.send(
				purpose === 'reset_password'
					? resetPassword(email, `${origin}/reset-password?token=${token}`)
					: verifyEmail(email, `${origin}/verify-email?token=${token}`)
			);
		}
		return { sent: email };
	}
};
