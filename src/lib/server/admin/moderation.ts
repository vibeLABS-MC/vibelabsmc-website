/**
 * Staff actions: deciding on submitted projects, withholding content, reviewing files the
 * scanner couldn't clear, managing users. Every action notifies whoever it affects and is
 * written to the audit log by the caller.
 */
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import {
	auditLog,
	files,
	projectMembers,
	projects,
	reports,
	sessions,
	users,
	versions
} from '../db/schema.ts';
import { notify, type NotificationKind } from '../community/notifications.ts';
import { deleteUserSessions } from '../auth/session.ts';
import type { Role } from '../auth/access.ts';

export type Decision = 'approve' | 'reject' | 'changes' | 'withhold' | 'restore';

const OUTCOME: Record<
	Decision,
	{
		status: 'approved' | 'rejected' | 'draft' | 'withheld';
		kind: NotificationKind;
		needsMessage: boolean;
	}
> = {
	approve: { status: 'approved', kind: 'project_approved', needsMessage: false },
	restore: { status: 'approved', kind: 'project_approved', needsMessage: false },
	reject: { status: 'rejected', kind: 'project_rejected', needsMessage: true },
	changes: { status: 'draft', kind: 'project_changes_requested', needsMessage: true },
	withhold: { status: 'withheld', kind: 'project_withheld', needsMessage: true }
};

/** Which decisions make sense for a project in this state. */
export function allowedDecisions(status: string): Decision[] {
	switch (status) {
		case 'in_review':
			return ['approve', 'changes', 'reject'];
		case 'approved':
			return ['withhold'];
		case 'withheld':
			return ['restore'];
		case 'rejected':
			return ['approve'];
		default:
			return ['approve', 'reject'];
	}
}

export async function teamIds(db: Database, projectId: string): Promise<string[]> {
	const rows = await db
		.select({ id: projectMembers.userId })
		.from(projectMembers)
		.where(eq(projectMembers.projectId, projectId));
	return rows.map((r) => r.id);
}

export async function decide(
	db: Database,
	projectId: string,
	decision: Decision,
	message: string
): Promise<'done' | 'needs-message' | 'not-allowed' | 'missing'> {
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) return 'missing';
	if (!allowedDecisions(project.status).includes(decision)) return 'not-allowed';
	const outcome = OUTCOME[decision];
	if (outcome.needsMessage && !message.trim()) return 'needs-message';
	await db
		.update(projects)
		.set({
			status: outcome.status,
			moderationMessage: outcome.needsMessage ? message.trim() : null,
			publishedAt:
				outcome.status === 'approved' ? (project.publishedAt ?? new Date()) : project.publishedAt
		})
		.where(eq(projects.id, projectId));
	await notify(db, await teamIds(db, projectId), outcome.kind, {
		projectId,
		projectName: project.name,
		projectType: project.type,
		slug: project.slug,
		message: outcome.needsMessage ? message.trim() : null
	});
	return 'done';
}

export async function reviewQueue(db: Database) {
	return db
		.select({
			project: projects,
			owner: { username: users.username, displayName: users.displayName }
		})
		.from(projects)
		.leftJoin(
			projectMembers,
			and(eq(projectMembers.projectId, projects.id), eq(projectMembers.role, 'owner'))
		)
		.leftJoin(users, eq(users.id, projectMembers.userId))
		.where(eq(projects.status, 'in_review'))
		.orderBy(asc(projects.submittedAt));
}

/** Files the scanner sent to a person (too big to scan, or the scanner was down). */
export async function fileQueue(db: Database) {
	return db
		.select({
			file: files,
			version: { id: versions.id, number: versions.versionNumber },
			project: { id: projects.id, name: projects.name, slug: projects.slug, type: projects.type }
		})
		.from(files)
		.innerJoin(versions, eq(versions.id, files.versionId))
		.innerJoin(projects, eq(projects.id, versions.projectId))
		.where(
			or(
				eq(files.scanStatus, 'review'),
				eq(files.scanStatus, 'error'),
				eq(files.scanStatus, 'pending')
			)
		)
		.orderBy(asc(files.createdAt));
}

export async function setFileVerdict(
	db: Database,
	fileId: string,
	verdict: 'clean' | 'infected',
	note: string
): Promise<boolean> {
	const updated = await db
		.update(files)
		.set({
			scanStatus: verdict,
			scanDetail:
				note || (verdict === 'clean' ? 'Cleared by a moderator.' : 'Removed by a moderator.'),
			scannedAt: new Date()
		})
		.where(eq(files.id, fileId))
		.returning({ versionId: files.versionId });
	if (!updated.length) return false;
	if (verdict === 'infected') {
		const [owner] = await db
			.select({
				projectId: versions.projectId,
				name: projects.name,
				slug: projects.slug,
				type: projects.type
			})
			.from(versions)
			.innerJoin(projects, eq(projects.id, versions.projectId))
			.where(eq(versions.id, updated[0]!.versionId));
		if (owner)
			await notify(db, await teamIds(db, owner.projectId), 'file_flagged', {
				projectId: owner.projectId,
				projectName: owner.name,
				slug: owner.slug,
				projectType: owner.type,
				message: note
			});
	}
	return true;
}

export async function listUsers(db: Database, search: string, limit = 50) {
	const term = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
	return db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			avatarKey: users.avatarKey,
			email: users.email,
			role: users.role,
			bannedAt: users.bannedAt,
			banReason: users.banReason,
			totp: users.totpEnabledAt,
			createdAt: users.createdAt
		})
		.from(users)
		.where(
			search
				? or(
						ilike(users.username, term),
						ilike(users.displayName, term),
						ilike(users.email, term),
						eq(users.id, search)
					)
				: undefined
		)
		.orderBy(desc(users.createdAt))
		.limit(limit);
}

export async function setRole(db: Database, userId: string, role: Role): Promise<void> {
	await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
	// A change of power ends every session, so new rights (or lost ones) apply at once.
	await deleteUserSessions(db, userId);
}

export async function setBan(db: Database, userId: string, reason: string | null): Promise<void> {
	await db
		.update(users)
		.set({ bannedAt: reason ? new Date() : null, banReason: reason, updatedAt: new Date() })
		.where(eq(users.id, userId));
	if (reason) await deleteUserSessions(db, userId);
}

export async function overview(db: Database) {
	const counted = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
	const [queue, flagged, openReports, totalUsers, totalProjects, approved, liveSessions] =
		await Promise.all([
			counted(db.select({ n: count() }).from(projects).where(eq(projects.status, 'in_review'))),
			counted(
				db
					.select({ n: count() })
					.from(files)
					.where(
						or(
							eq(files.scanStatus, 'review'),
							eq(files.scanStatus, 'error'),
							eq(files.scanStatus, 'pending')
						)
					)
			),
			counted(db.select({ n: count() }).from(reports).where(eq(reports.status, 'open'))),
			counted(db.select({ n: count() }).from(users)),
			counted(db.select({ n: count() }).from(projects)),
			counted(db.select({ n: count() }).from(projects).where(eq(projects.status, 'approved'))),
			counted(
				db
					.select({ n: count() })
					.from(sessions)
					.where(sql`${sessions.lastSeenAt} > now() - interval '1 day'`)
			)
		]);
	return { queue, flagged, openReports, totalUsers, totalProjects, approved, liveSessions };
}

export async function auditEntries(
	db: Database,
	options: { before?: number; limit?: number; action?: string } = {}
) {
	return db
		.select({
			entry: auditLog,
			actor: { username: users.username, displayName: users.displayName }
		})
		.from(auditLog)
		.leftJoin(users, eq(users.id, auditLog.actorId))
		.where(
			and(
				options.before ? sql`${auditLog.id} < ${options.before}` : undefined,
				options.action
					? ilike(auditLog.action, `${options.action.replace(/[%_\\]/g, '\\$&')}%`)
					: undefined
			)
		)
		.orderBy(desc(auditLog.id))
		.limit(options.limit ?? 50);
}
