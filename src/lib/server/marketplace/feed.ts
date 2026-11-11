/** The update feed: new versions of the projects someone follows, newest first. */
import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { follows, projects, versions } from '../db/schema.ts';

export async function updateFeed(db: Database, userId: string, limit = 20) {
	return db
		.select({
			versionId: versions.id,
			versionName: versions.name,
			versionNumber: versions.versionNumber,
			channel: versions.channel,
			gameVersions: versions.gameVersions,
			publishedAt: versions.publishedAt,
			project: {
				id: projects.id,
				name: projects.name,
				slug: projects.slug,
				type: projects.type,
				iconKey: projects.iconKey
			}
		})
		.from(versions)
		.innerJoin(follows, and(eq(follows.projectId, versions.projectId), eq(follows.userId, userId)))
		.innerJoin(projects, eq(projects.id, versions.projectId))
		.where(and(eq(versions.status, 'listed'), eq(projects.status, 'approved')))
		.orderBy(desc(versions.publishedAt))
		.limit(limit);
}
