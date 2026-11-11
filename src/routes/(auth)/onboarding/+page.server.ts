import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { nextFrom } from '#lib/server/auth/pages.ts';
import { suggestUsername, usernameProblem } from '#lib/server/auth/username.ts';
import { isUsernameTaken, setUsername, signInMethods } from '#lib/server/auth/users.ts';
import { users } from '#lib/server/db/schema.ts';
import { field } from '#lib/server/http.ts';
import type { Actions, PageServerLoad } from './$types';

/** First sign-in with GitHub or Discord: pick the public username (and display name). */
export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) redirect(303, '/login');
	if (user.username)
		redirect(303, nextFrom(locals, url), { external: locals.config.accountOrigins });
	const methods = await signInMethods(locals.db, user.id);
	let suggestion = suggestUsername(methods.providers[0]?.username ?? user.displayName);
	if (await isUsernameTaken(locals.db, suggestion))
		suggestion = suggestUsername(`${suggestion}-x`).replace(/-x$/, '');
	if (await isUsernameTaken(locals.db, suggestion)) suggestion = '';
	return { suggestion, displayName: user.displayName, next: nextFrom(locals, url) };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');
		const data = await request.formData();
		const username = field(data, 'username');
		const displayName = field(data, 'displayName').slice(0, 64) || username;
		const problem = usernameProblem(username);
		if (problem) return fail(400, { username, displayName, message: problem });
		if (!(await setUsername(locals.db, user.id, username)))
			return fail(400, { username, displayName, message: 'That username is taken.' });
		await locals.db.update(users).set({ displayName }).where(eq(users.id, user.id));
		await audit(locals.db, {
			actorId: user.id,
			action: 'account.username_set',
			targetType: 'user',
			targetId: user.id,
			details: { username },
			ipHash: locals.ipHash
		});
		redirect(303, nextFrom(locals, url), { external: locals.config.accountOrigins });
	}
};
