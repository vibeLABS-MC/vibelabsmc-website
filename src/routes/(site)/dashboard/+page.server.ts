import { fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { field } from '#lib/server/http.ts';
import { updateFeed } from '#lib/server/marketplace/feed.ts';
import { answerInvite, userProjects } from '#lib/server/marketplace/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals, url);
	const [mine, feed] = await Promise.all([
		userProjects(locals.db, user.id),
		updateFeed(locals.db, user.id)
	]);
	const strip = ({ search: _s, ...p }: (typeof mine)[number]['project']) => p;
	return {
		projects: mine.filter((m) => m.acceptedAt).map((m) => ({ ...strip(m.project), role: m.role })),
		invites: mine
			.filter((m) => !m.acceptedAt)
			.map((m) => ({
				id: m.project.id,
				name: m.project.name,
				type: m.project.type,
				iconKey: m.project.iconKey
			})),
		feed,
		name: user.displayName
	};
};

export const actions: Actions = {
	invite: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const data = await request.formData();
		const ok = await answerInvite(
			locals.db,
			field(data, 'project'),
			user.id,
			field(data, 'accept') === '1'
		);
		return ok ? { answered: true } : fail(404, { message: 'That invitation is gone.' });
	}
};
