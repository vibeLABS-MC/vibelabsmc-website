/**
 * The counters kept on each project (followers, rating) recomputed from the rows they count,
 * after anything that could have changed them in bulk (deleting an account, hiding reviews).
 */
import { inArray, sql } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { projects } from '../db/schema.ts';

export async function recountProjects(db: Database, ids: string[]): Promise<void> {
	const unique = [...new Set(ids)];
	if (unique.length === 0) return;
	await db
		.update(projects)
		.set({
			follows: sql`(select count(*) from follows f where f.project_id = ${projects.id})::int`,
			ratingSum: sql`(select coalesce(sum(r.rating), 0) from reviews r where r.project_id = ${projects.id} and r.status = 'visible')::int`,
			ratingCount: sql`(select count(*) from reviews r where r.project_id = ${projects.id} and r.status = 'visible')::int`
		})
		.where(inArray(projects.id, unique));
}
