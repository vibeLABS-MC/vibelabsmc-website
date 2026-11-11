import { count, desc, eq, sql } from 'drizzle-orm';
import { projects } from '#lib/server/db/schema.ts';
import { projectCards } from '#lib/server/marketplace/search.ts';
import { parseSetup, SETUP_COOKIE } from '#lib/marketplace/setup.ts';
import type { PageServerLoad } from './$types';

/** The marketplace home: the four sections with their sizes, and three shelves of projects. */
export const load: PageServerLoad = async ({ locals, cookies }) => {
	const approved = eq(projects.status, 'approved');
	const [popular, updated, fresh, counts] = await Promise.all([
		projectCards(locals.db, approved, [desc(projects.downloads), desc(projects.follows)], 6),
		projectCards(locals.db, approved, [sql`${projects.latestVersionAt} desc nulls last`], 6),
		projectCards(locals.db, approved, [sql`${projects.publishedAt} desc nulls last`], 6),
		locals.db
			.select({ type: projects.type, n: count() })
			.from(projects)
			.where(approved)
			.groupBy(projects.type)
	]);
	return {
		popular,
		updated,
		fresh,
		counts: Object.fromEntries(counts.map((c) => [c.type, c.n])) as Record<string, number>,
		setup: parseSetup(cookies.get(SETUP_COOKIE))
	};
};
