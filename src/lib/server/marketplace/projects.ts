/** Projects and their teams: creating, editing, inviting, submitting for review, deleting. */
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { isUniqueViolation } from '../db/errors.ts';
import { files, projectMembers, projects, users, versions } from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import type { ProjectType } from '../../marketplace/taxonomy.ts';
import { isStaff, type Role } from '../auth/access.ts';

export type Project = typeof projects.$inferSelect;
export type MemberRole = 'owner' | 'maintainer';

export async function createProject(
	db: Database,
	input: { ownerId: string; type: ProjectType; name: string; slug: string; summary: string }
): Promise<{ project: Project } | { problem: 'slug-taken' }> {
	try {
		const project = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(projects)
				.values({
					id: newId(),
					type: input.type,
					name: input.name,
					slug: input.slug,
					summary: input.summary
				})
				.returning();
			await tx.insert(projectMembers).values({
				projectId: created!.id,
				userId: input.ownerId,
				role: 'owner',
				acceptedAt: new Date()
			});
			return created!;
		});
		return { project };
	} catch (error) {
		if (isUniqueViolation(error)) return { problem: 'slug-taken' };
		throw error;
	}
}

export async function getProject(db: Database, id: string): Promise<Project | null> {
	const [row] = await db.select().from(projects).where(eq(projects.id, id));
	return row ?? null;
}

export async function getProjectBySlug(
	db: Database,
	type: ProjectType,
	slug: string
): Promise<Project | null> {
	const [row] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.type, type), sql`lower(${projects.slug}) = ${slug.toLowerCase()}`));
	return row ?? null;
}

/** The user's accepted role on the project, or null. */
export async function memberRole(
	db: Database,
	projectId: string,
	userId: string | undefined
): Promise<MemberRole | null> {
	if (!userId) return null;
	const [row] = await db
		.select({ role: projectMembers.role })
		.from(projectMembers)
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, userId),
				isNotNull(projectMembers.acceptedAt)
			)
		);
	return row?.role ?? null;
}

/** Approved projects are public; anything else only its team and staff can see. */
export const canView = (
	project: Pick<Project, 'status'>,
	role: MemberRole | null,
	viewerRole: Role | null
): boolean =>
	project.status === 'approved' || role !== null || (viewerRole !== null && isStaff(viewerRole));

export interface Member {
	userId: string;
	username: string | null;
	displayName: string;
	avatarKey: string | null;
	role: MemberRole;
	accepted: boolean;
}

export async function listMembers(
	db: Database,
	projectId: string,
	includeInvites = false
): Promise<Member[]> {
	const rows = await db
		.select({
			userId: users.id,
			username: users.username,
			displayName: users.displayName,
			avatarKey: users.avatarKey,
			role: projectMembers.role,
			acceptedAt: projectMembers.acceptedAt
		})
		.from(projectMembers)
		.innerJoin(users, eq(users.id, projectMembers.userId))
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				includeInvites ? undefined : isNotNull(projectMembers.acceptedAt)
			)
		)
		.orderBy(asc(projectMembers.role), asc(projectMembers.createdAt));
	return rows.map(({ acceptedAt, ...m }) => ({ ...m, accepted: !!acceptedAt }));
}

export type InviteResult = 'invited' | 'no-user' | 'already';

export async function inviteMember(
	db: Database,
	projectId: string,
	username: string,
	role: MemberRole = 'maintainer'
): Promise<{ result: InviteResult; userId?: string }> {
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(sql`lower(${users.username}) = ${username.toLowerCase()}`);
	if (!user) return { result: 'no-user' };
	const inserted = await db
		.insert(projectMembers)
		.values({ projectId, userId: user.id, role })
		.onConflictDoNothing()
		.returning();
	return { result: inserted.length ? 'invited' : 'already', userId: user.id };
}

export async function answerInvite(
	db: Database,
	projectId: string,
	userId: string,
	accept: boolean
): Promise<boolean> {
	const where = and(
		eq(projectMembers.projectId, projectId),
		eq(projectMembers.userId, userId),
		sql`${projectMembers.acceptedAt} is null`
	);
	const changed = accept
		? await db.update(projectMembers).set({ acceptedAt: new Date() }).where(where).returning()
		: await db.delete(projectMembers).where(where).returning();
	return changed.length > 0;
}

/** Removes a member; the owner can't be removed (transfer ownership first). */
export async function removeMember(
	db: Database,
	projectId: string,
	userId: string
): Promise<boolean> {
	const removed = await db
		.delete(projectMembers)
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, userId),
				eq(projectMembers.role, 'maintainer')
			)
		)
		.returning();
	return removed.length > 0;
}

export async function transferOwnership(
	db: Database,
	projectId: string,
	fromId: string,
	toId: string
): Promise<boolean> {
	if ((await memberRole(db, projectId, toId)) !== 'maintainer') return false;
	await db.transaction(async (tx) => {
		await tx
			.update(projectMembers)
			.set({ role: 'maintainer' })
			.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, fromId)));
		await tx
			.update(projectMembers)
			.set({ role: 'owner' })
			.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, toId)));
	});
	return true;
}

export type ProjectDetails = Pick<
	Project,
	| 'name'
	| 'slug'
	| 'summary'
	| 'categories'
	| 'license'
	| 'licenseUrl'
	| 'sourceUrl'
	| 'issuesUrl'
	| 'wikiUrl'
	| 'discordUrl'
>;

export async function updateDetails(
	db: Database,
	projectId: string,
	details: ProjectDetails
): Promise<'saved' | 'slug-taken'> {
	try {
		await db
			.update(projects)
			.set({ ...details, updatedAt: new Date() })
			.where(eq(projects.id, projectId));
		return 'saved';
	} catch (error) {
		if (isUniqueViolation(error)) return 'slug-taken';
		throw error;
	}
}

export async function updateDescription(
	db: Database,
	projectId: string,
	description: string
): Promise<void> {
	await db
		.update(projects)
		.set({ description, updatedAt: new Date() })
		.where(eq(projects.id, projectId));
}

export async function setIcon(
	db: Database,
	projectId: string,
	iconKey: string | null
): Promise<void> {
	await db
		.update(projects)
		.set({ iconKey, updatedAt: new Date() })
		.where(eq(projects.id, projectId));
}

/** What still stops the project from being submitted (empty when it is ready). */
export async function missingForReview(db: Database, project: Project): Promise<string[]> {
	const missing: string[] = [];
	if (!project.iconKey) missing.push('an icon');
	if (project.summary.trim().length < 10) missing.push('a summary (at least 10 characters)');
	if (project.description.trim().length < 50)
		missing.push('a description (at least 50 characters)');
	if (!project.license) missing.push('a licence');
	const [ready] = await db
		.select({ id: versions.id })
		.from(versions)
		.innerJoin(files, eq(files.versionId, versions.id))
		.where(
			and(
				eq(versions.projectId, project.id),
				eq(versions.status, 'listed'),
				inArray(files.scanStatus, ['clean', 'review'])
			)
		)
		.limit(1);
	if (!ready) missing.push('a version with a file');
	return missing;
}

/** Sends a draft (or a rejected project, after changes) to the moderators. */
export async function submitForReview(db: Database, project: Project): Promise<string[]> {
	if (project.status !== 'draft' && project.status !== 'rejected')
		return ['The project is not a draft.'];
	const missing = await missingForReview(db, project);
	if (missing.length) return missing;
	await db
		.update(projects)
		.set({ status: 'in_review', submittedAt: new Date(), moderationMessage: null })
		.where(eq(projects.id, project.id));
	return [];
}

export async function withdrawSubmission(db: Database, projectId: string): Promise<void> {
	await db
		.update(projects)
		.set({ status: 'draft' })
		.where(and(eq(projects.id, projectId), eq(projects.status, 'in_review')));
}

export async function deleteProject(db: Database, projectId: string): Promise<void> {
	await db.delete(projects).where(eq(projects.id, projectId));
}

/** The projects a user owns or helps with, for the dashboard (invitations included). */
export async function userProjects(db: Database, userId: string) {
	return db
		.select({ project: projects, role: projectMembers.role, acceptedAt: projectMembers.acceptedAt })
		.from(projectMembers)
		.innerJoin(projects, eq(projects.id, projectMembers.projectId))
		.where(eq(projectMembers.userId, userId))
		.orderBy(desc(projects.updatedAt));
}

/** Keeps the project's version summary (game versions, loaders, last update) in step with its listed versions. */
export async function refreshProjectCache(db: Database, projectId: string): Promise<void> {
	await db
		.update(projects)
		.set({
			gameVersions: sql`coalesce((select array_agg(distinct g) from versions v, unnest(v.game_versions) g where v.project_id = ${projectId} and v.status = 'listed'), '{}')`,
			loaders: sql`coalesce((select array_agg(distinct l) from versions v, unnest(v.loaders) l where v.project_id = ${projectId} and v.status = 'listed'), '{}')`,
			latestVersionAt: sql`(select max(v.published_at) from versions v where v.project_id = ${projectId} and v.status = 'listed')`,
			updatedAt: new Date()
		})
		.where(eq(projects.id, projectId));
}
