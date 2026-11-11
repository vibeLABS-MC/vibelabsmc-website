import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { consumeEmailToken, peekEmailToken } from '#lib/server/auth/email-tokens.ts';
import { hashPassword, isBreached, passwordProblem } from '#lib/server/auth/password.ts';
import { deleteUserSessions } from '#lib/server/auth/session.ts';
import { findUserById } from '#lib/server/auth/users.ts';
import { users } from '#lib/server/db/schema.ts';
import { field, limitAction, rawField } from '#lib/server/http.ts';
import { passwordChanged } from '#lib/server/mail/templates.ts';
import type { Actions, PageServerLoad } from './$types';

const EXPIRED = 'This link has expired or was already used. Ask for a new one.';

/** Showing the form and checking the new password don't spend the token; saving does. */
export const load: PageServerLoad = async ({ url, locals }) => {
	const token = url.searchParams.get('token') ?? '';
	return { token, valid: !!(token && (await peekEmailToken(locals.db, token, 'reset_password'))) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const token = field(data, 'token');
		const password = rawField(data, 'password');
		const limited = limitAction(locals, 'login', locals.ipHash);
		if (limited) return fail(429, { token, message: limited.data.message });

		const pending = await peekEmailToken(locals.db, token, 'reset_password');
		const user = pending ? await findUserById(locals.db, pending.userId) : null;
		if (!pending || !user) return fail(400, { message: EXPIRED });

		const problem =
			passwordProblem(password, { email: user.email, username: user.username }) ??
			((await isBreached(fetch, locals.config.endpoints.hibp, password))
				? 'This password has appeared in a data breach, so attackers try it first. Choose another one.'
				: null);
		if (problem) return fail(400, { token, message: problem });

		if (!(await consumeEmailToken(locals.db, token, 'reset_password')))
			return fail(400, { message: EXPIRED });
		await locals.db
			.update(users)
			.set({
				passwordHash: await hashPassword(password),
				// Following the emailed link proves the address belongs to them.
				emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
				updatedAt: new Date()
			})
			.where(eq(users.id, user.id));
		await deleteUserSessions(locals.db, user.id);
		await audit(locals.db, {
			actorId: user.id,
			action: 'auth.password_reset',
			targetType: 'user',
			targetId: user.id,
			ipHash: locals.ipHash
		});
		await locals.mailer.send(passwordChanged(pending.email));
		redirect(303, '/login?notice=reset');
	}
};
