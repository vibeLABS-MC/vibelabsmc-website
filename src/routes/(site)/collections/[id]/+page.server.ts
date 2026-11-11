import { error } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { isStaff } from '#lib/server/auth/access.ts';
import {
	canSeeCollection,
	collectionProjectIds,
	getCollection
} from '#lib/server/community/community.ts';
import { projects, users } from '#lib/server/db/schema.ts';
import { projectCards } from '#lib/server/marketplace/search.ts';
import { parseSetup, SETUP_COOKIE } from '#lib/marketplace/setup.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, cookies }) => {
	const collection = await getCollection(locals.db, params.id);
	if (
		!collection ||
		!canSeeCollection(collection, locals.user?.id, !!locals.user && isStaff(locals.user.role))
	)
		error(404, 'Not found');
	const [owner] = await locals.db
		.select({
			username: users.username,
			displayName: users.displayName,
			avatarKey: users.avatarKey
		})
		.from(users)
		.where(eq(users.id, collection.ownerId));
	const ids = await collectionProjectIds(locals.db, collection.id);
	const cards = ids.length ? await projectCards(locals.db, inArray(projects.id, ids), [], 200) : [];
	return {
		collection,
		owner: owner ?? null,
		mine: collection.ownerId === locals.user?.id,
		projects: ids.map((id) => cards.find((c) => c.id === id)!).filter(Boolean),
		setup: parseSetup(cookies.get(SETUP_COOKIE))
	};
};
