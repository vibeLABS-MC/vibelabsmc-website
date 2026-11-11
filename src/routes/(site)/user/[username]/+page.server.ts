import { error } from '@sveltejs/kit';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { userCollections } from '#lib/server/community/community.ts';
import { projectMembers, projects, reviews, users } from '#lib/server/db/schema.ts';
import { projectCards } from '#lib/server/marketplace/search.ts';
import { parseSetup, SETUP_COOKIE } from '#lib/marketplace/setup.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, cookies }) => {
	const [user] = await locals.db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			avatarKey: users.avatarKey,
			bio: users.bio,
			role: users.role,
			createdAt: users.createdAt,
			bannedAt: users.bannedAt
		})
		.from(users)
		.where(sql`lower(${users.username}) = ${params.username.toLowerCase()}`);
	if (!user || user.bannedAt) error(404, 'Not found');

	const memberOf = await locals.db
		.select({ id: projectMembers.projectId })
		.from(projectMembers)
		.where(and(eq(projectMembers.userId, user.id), sql`${projectMembers.acceptedAt} is not null`));
	const ids = memberOf.map((m) => m.id);
	const [cards, collections, written] = await Promise.all([
		ids.length
			? projectCards(
					locals.db,
					and(inArray(projects.id, ids), eq(projects.status, 'approved')),
					[desc(projects.downloads)],
					60
				)
			: Promise.resolve([]),
		userCollections(locals.db, user.id, { publicOnly: true }),
		locals.db
			.select({
				id: reviews.id,
				rating: reviews.rating,
				body: reviews.body,
				createdAt: reviews.createdAt,
				project: { name: projects.name, slug: projects.slug, type: projects.type }
			})
			.from(reviews)
			.innerJoin(projects, eq(projects.id, reviews.projectId))
			.where(
				and(
					eq(reviews.userId, user.id),
					eq(reviews.status, 'visible'),
					eq(projects.status, 'approved')
				)
			)
			.orderBy(desc(reviews.createdAt))
			.limit(10)
	]);
	const { bannedAt: _b, id: _id, ...profile } = user;
	return {
		profile,
		projects: cards,
		collections: collections.map((c) => ({
			id: c.collection.id,
			name: c.collection.name,
			description: c.collection.description,
			size: c.size
		})),
		reviews: written,
		stats: { downloads: cards.reduce((n, p) => n + p.downloads, 0), projects: cards.length },
		setup: parseSetup(cookies.get(SETUP_COOKIE))
	};
};
