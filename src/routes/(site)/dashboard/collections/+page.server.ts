import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import {
	collectionProblem,
	createCollection,
	setInCollection,
	userCollections,
	type Visibility
} from '#lib/server/community/community.ts';
import { field, limitAction } from '#lib/server/http.ts';
import { getProject } from '#lib/server/marketplace/projects.ts';
import type { Actions, PageServerLoad } from './$types';

const VISIBILITY: Visibility[] = ['public', 'unlisted', 'private'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals, url);
	const add = url.searchParams.get('add');
	const adding = add ? await getProject(locals.db, add) : null;
	return {
		collections: (await userCollections(locals.db, user.id)).map((c) => ({
			...c.collection,
			size: c.size
		})),
		adding: adding?.status === 'approved' ? { id: adding.id, name: adding.name } : null
	};
};

export const actions: Actions = {
	create: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return limited;
		const data = await request.formData();
		const name = field(data, 'name');
		const description = field(data, 'description');
		const visibility = field(data, 'visibility') as Visibility;
		const problem =
			collectionProblem(name, description) ??
			(VISIBILITY.includes(visibility) ? null : 'Choose who can see it.');
		if (problem) return fail(400, { message: problem });
		const collection = await createCollection(locals.db, user.id, {
			name,
			description,
			visibility
		});
		const add = field(data, 'add');
		if (add && (await getProject(locals.db, add))?.status === 'approved')
			await setInCollection(locals.db, collection.id, add, true);
		redirect(303, `/dashboard/collections/${collection.id}`);
	}
};
