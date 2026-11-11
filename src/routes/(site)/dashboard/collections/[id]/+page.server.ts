import { error, fail, redirect } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { requireUser } from '#lib/server/auth/guards.ts';
import {
	collectionProblem,
	collectionProjectIds,
	deleteCollection,
	getCollection,
	setInCollection,
	updateCollection,
	type Visibility
} from '#lib/server/community/community.ts';
import { projects } from '#lib/server/db/schema.ts';
import { field } from '#lib/server/http.ts';
import { projectCards } from '#lib/server/marketplace/search.ts';
import type { Actions, PageServerLoad } from './$types';

async function owned(locals: App.Locals, id: string, url: URL) {
	const { user } = requireUser(locals, url);
	const collection = await getCollection(locals.db, id);
	if (!collection || collection.ownerId !== user.id) error(404, 'Not found');
	return collection;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const collection = await owned(locals, params.id, url);
	const ids = await collectionProjectIds(locals.db, collection.id);
	const cards = ids.length ? await projectCards(locals.db, inArray(projects.id, ids), [], 200) : [];
	return { collection, projects: ids.map((id) => cards.find((c) => c.id === id)!).filter(Boolean) };
};

export const actions: Actions = {
	update: async ({ request, locals, params, url }) => {
		const collection = await owned(locals, params.id, url);
		const data = await request.formData();
		const name = field(data, 'name');
		const description = field(data, 'description');
		const visibility = field(data, 'visibility') as Visibility;
		const problem =
			collectionProblem(name, description) ??
			(['public', 'unlisted', 'private'].includes(visibility) ? null : 'Choose who can see it.');
		if (problem) return fail(400, { message: problem });
		await updateCollection(locals.db, collection.id, { name, description, visibility });
		return { saved: true };
	},
	remove: async ({ request, locals, params, url }) => {
		const collection = await owned(locals, params.id, url);
		await setInCollection(
			locals.db,
			collection.id,
			field(await request.formData(), 'project'),
			false
		);
		return { removed: true };
	},
	delete: async ({ locals, params, url }) => {
		const collection = await owned(locals, params.id, url);
		await deleteCollection(locals.db, collection.id);
		redirect(303, '/dashboard/collections');
	}
};
