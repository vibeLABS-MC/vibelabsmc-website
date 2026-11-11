import { fail, redirect } from '@sveltejs/kit';
import { enabledProviders, nextFrom } from '#lib/server/auth/pages.ts';
import { verifyPassword } from '#lib/server/auth/password.ts';
import { grantSudo } from '#lib/server/auth/session.ts';
import { verifySecondFactor } from '#lib/server/auth/two-factor.ts';
import { findUserById, signInMethods } from '#lib/server/auth/users.ts';
import { field, limitAction, rawField } from '#lib/server/http.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * "Confirm it's you" before a sensitive change (password, email, two-factor, sign-in methods,
 * deleting the account, staff actions). Any one of the account's own sign-in methods works.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	const methods = await signInMethods(locals.db, locals.user.id);
	const enabled = enabledProviders(locals.config);
	return {
		next: nextFrom(locals, url, '/settings'),
		password: locals.user.hasPassword && locals.user.emailVerified,
		totp: locals.user.totpEnabled,
		providers: methods.providers.map((p) => p.provider).filter((p) => enabled.includes(p)),
		error:
			url.searchParams.get('error') === 'wrong-account'
				? 'That account isn’t linked to yours.'
				: null
	};
};

async function confirmed(locals: App.Locals, url: URL) {
	await grantSudo(locals.db, locals.session!.id);
	locals.limiter.reset(`twoFactor:${locals.user!.id}`);
	redirect(303, nextFrom(locals, url, '/settings'), { external: locals.config.accountOrigins });
}

export const actions: Actions = {
	password: async ({ request, locals, url }) => {
		if (!locals.user || !locals.session) redirect(303, '/login');
		const limited = limitAction(locals, 'twoFactor', locals.user.id);
		if (limited) return fail(429, { message: limited.data.message });
		const user = await findUserById(locals.db, locals.user.id);
		if (
			!(await verifyPassword(
				user?.passwordHash ?? null,
				rawField(await request.formData(), 'password')
			))
		)
			return fail(400, { message: 'That password is wrong.' });
		return confirmed(locals, url);
	},
	code: async ({ request, locals, url }) => {
		if (!locals.user || !locals.session) redirect(303, '/login');
		const limited = limitAction(locals, 'twoFactor', locals.user.id);
		if (limited) return fail(429, { message: limited.data.message });
		const user = await findUserById(locals.db, locals.user.id);
		const factor = user
			? await verifySecondFactor(
					locals.db,
					locals.keys.totp,
					user,
					field(await request.formData(), 'code')
				)
			: null;
		if (!factor) return fail(400, { message: 'That code didn’t work.' });
		return confirmed(locals, url);
	}
};
