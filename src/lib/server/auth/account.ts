/** Taking an account away (deletion) and handing over its data (export), as privacy law expects. */
import { and, desc, eq, inArray, like } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import {
	auditLog,
	collectionProjects,
	collections,
	follows,
	oauthAccounts,
	projectMembers,
	projects,
	reviews,
	sessions,
	users
} from '../db/schema.ts';
import { recountProjects } from '../marketplace/stats.ts';

/**
 * Deletes the account and every project it owns. Projects it only helped with stay (without
 * it); its reviews and follows go, and the counts on those projects are corrected.
 */
export async function deleteAccount(
	db: Database,
	userId: string
): Promise<{ deletedProjects: string[] }> {
	return db.transaction(async (tx) => {
		const owned = await tx
			.select({ id: projectMembers.projectId })
			.from(projectMembers)
			.where(and(eq(projectMembers.userId, userId), eq(projectMembers.role, 'owner')));
		const touched = [
			...(await tx
				.select({ id: reviews.projectId })
				.from(reviews)
				.where(eq(reviews.userId, userId))),
			...(await tx
				.select({ id: follows.projectId })
				.from(follows)
				.where(eq(follows.userId, userId)))
		].map((row) => row.id);
		const ownedIds = owned.map((row) => row.id);
		if (ownedIds.length) await tx.delete(projects).where(inArray(projects.id, ownedIds));
		await tx.delete(users).where(eq(users.id, userId));
		const db2 = tx as unknown as Database;
		await recountProjects(
			db2,
			touched.filter((id) => !ownedIds.includes(id))
		);
		return { deletedProjects: ownedIds };
	});
}

/** Everything stored about a person, as one JSON document they can download. */
export async function exportAccount(db: Database, userId: string) {
	const [user] = await db.select().from(users).where(eq(users.id, userId));
	if (!user) return null;
	const [providers, devices, memberships, written, saved, followed, activity] = await Promise.all([
		db
			.select({
				provider: oauthAccounts.provider,
				username: oauthAccounts.providerUsername,
				linkedAt: oauthAccounts.createdAt
			})
			.from(oauthAccounts)
			.where(eq(oauthAccounts.userId, userId)),
		db
			.select({
				createdAt: sessions.createdAt,
				lastSeenAt: sessions.lastSeenAt,
				userAgent: sessions.userAgent
			})
			.from(sessions)
			.where(eq(sessions.userId, userId)),
		db
			.select({ project: projects.name, slug: projects.slug, role: projectMembers.role })
			.from(projectMembers)
			.innerJoin(projects, eq(projects.id, projectMembers.projectId))
			.where(eq(projectMembers.userId, userId)),
		db
			.select({
				project: projects.name,
				rating: reviews.rating,
				body: reviews.body,
				createdAt: reviews.createdAt
			})
			.from(reviews)
			.innerJoin(projects, eq(projects.id, reviews.projectId))
			.where(eq(reviews.userId, userId)),
		db
			.select({
				name: collections.name,
				description: collections.description,
				visibility: collections.visibility,
				id: collections.id
			})
			.from(collections)
			.where(eq(collections.ownerId, userId)),
		db
			.select({ project: projects.name, since: follows.createdAt })
			.from(follows)
			.innerJoin(projects, eq(projects.id, follows.projectId))
			.where(eq(follows.userId, userId)),
		db
			.select({ action: auditLog.action, at: auditLog.createdAt })
			.from(auditLog)
			.where(and(eq(auditLog.actorId, userId), like(auditLog.action, 'auth.%')))
			.orderBy(desc(auditLog.createdAt))
			.limit(200)
	]);
	const items = saved.length
		? await db
				.select({ collection: collectionProjects.collectionId, project: projects.name })
				.from(collectionProjects)
				.innerJoin(projects, eq(projects.id, collectionProjects.projectId))
				.where(
					inArray(
						collectionProjects.collectionId,
						saved.map((c) => c.id)
					)
				)
		: [];
	return {
		exportedAt: new Date().toISOString(),
		profile: {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			email: user.email,
			emailVerified: !!user.emailVerifiedAt,
			role: user.role,
			twoFactor: !!user.totpEnabledAt,
			createdAt: user.createdAt
		},
		signInMethods: { password: !!user.passwordHash, providers },
		sessions: devices,
		projects: memberships,
		reviews: written,
		collections: saved.map(({ id, ...c }) => ({
			...c,
			projects: items.filter((i) => i.collection === id).map((i) => i.project)
		})),
		follows: followed,
		securityActivity: activity
	};
}
