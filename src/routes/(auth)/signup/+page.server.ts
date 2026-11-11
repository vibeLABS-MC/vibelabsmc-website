import { fail } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { createEmailToken } from '#lib/server/auth/email-tokens.ts';
import { authPageData, skipIfSignedIn } from '#lib/server/auth/pages.ts';
import { hashPassword, isBreached, passwordProblem } from '#lib/server/auth/password.ts';
import { usernameProblem } from '#lib/server/auth/username.ts';
import { createEmailUser, findUserByEmail } from '#lib/server/auth/users.ts';
import { emailProblem, field, limitAction, rawField } from '#lib/server/http.ts';
import { alreadyRegistered, verifyEmail } from '#lib/server/mail/templates.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	skipIfSignedIn(locals, url);
	return authPageData(locals, url);
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.mailer.available)
			return fail(503, { message: 'Email sign-up is not available yet. Use GitHub or Discord.' });

		const data = await request.formData();
		const username = field(data, 'username');
		const email = field(data, 'email').toLowerCase();
		const password = rawField(data, 'password');
		const values = { username, email };

		const errors: Record<string, string> = {};
		const nameIssue = usernameProblem(username);
		if (nameIssue) errors.username = nameIssue;
		const emailIssue = emailProblem(email);
		if (emailIssue) errors.email = emailIssue;
		const passwordIssue = passwordProblem(password, { email, username });
		if (passwordIssue) errors.password = passwordIssue;
		if (data.get('terms') !== 'on') errors.terms = 'Please accept the terms and content rules.';
		if (Object.keys(errors).length) return fail(400, { ...values, errors });

		const limited = limitAction(locals, 'signup', locals.ipHash);
		if (limited) return fail(429, { ...values, message: limited.data.message });

		if (await isBreached(fetch, locals.config.endpoints.hibp, password))
			return fail(400, {
				...values,
				errors: {
					password:
						'This password has appeared in a data breach, so attackers try it first. Choose another one.'
				}
			});

		const origin = locals.config.origin;
		const existing = await findUserByEmail(locals.db, email);
		if (existing) {
			// Say the same thing as for a new account, and tell the owner by email instead.
			await locals.mailer.send(
				alreadyRegistered(email, `${origin}/login`, `${origin}/forgot-password`)
			);
			return { sent: email };
		}

		const created = await createEmailUser(locals.db, {
			username,
			email,
			passwordHash: await hashPassword(password)
		});
		if ('problem' in created) {
			if (created.problem === 'username-taken')
				return fail(400, { ...values, errors: { username: 'That username is taken.' } });
			return { sent: email };
		}

		const token = await createEmailToken(locals.db, {
			userId: created.user.id,
			purpose: 'verify_email',
			email
		});
		await locals.mailer.send(verifyEmail(email, `${origin}/verify-email?token=${token}`));
		await audit(locals.db, {
			actorId: created.user.id,
			action: 'auth.sign_up',
			targetType: 'user',
			targetId: created.user.id,
			details: { method: 'password' },
			ipHash: locals.ipHash
		});
		return { sent: email };
	}
};
