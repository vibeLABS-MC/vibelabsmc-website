/**
 * Versions of a project and their files: staging uploads, publishing a version from them,
 * listing, editing and withholding versions, and resolving downloads.
 */
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { rm } from 'node:fs/promises';
import type { Database } from '../db/index.ts';
import {
	dependencies,
	downloadsDaily,
	files,
	follows,
	projects,
	stagedFiles,
	versions
} from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import { keep, stagedPath } from '../uploads/receive.ts';
import { notify } from '../community/notifications.ts';
import type { Loader } from '../../marketplace/taxonomy.ts';
import { refreshProjectCache, type MemberRole, type Project } from './projects.ts';
import { isStaff, type Role } from '../auth/access.ts';

export type Version = typeof versions.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type Staged = typeof stagedFiles.$inferSelect;
export type ScanStatus = FileRow['scanStatus'];

export async function stageFile(
	db: Database,
	input: Omit<typeof stagedFiles.$inferInsert, 'createdAt'>
): Promise<Staged> {
	const [row] = await db.insert(stagedFiles).values(input).returning();
	return row!;
}

export async function listStaged(
	db: Database,
	projectId: string,
	userId: string
): Promise<Staged[]> {
	return db
		.select()
		.from(stagedFiles)
		.where(and(eq(stagedFiles.projectId, projectId), eq(stagedFiles.userId, userId)))
		.orderBy(asc(stagedFiles.createdAt));
}

export async function discardStaged(
	db: Database,
	storageDir: string,
	id: string,
	userId: string
): Promise<boolean> {
	const removed = await db
		.delete(stagedFiles)
		.where(and(eq(stagedFiles.id, id), eq(stagedFiles.userId, userId)))
		.returning();
	if (removed.length) await rm(stagedPath(storageDir, id), { force: true });
	return removed.length > 0;
}

/** Deletes uploads that were never published (default: older than a day). */
export async function cleanupStaged(
	db: Database,
	storageDir: string,
	olderThan = new Date(Date.now() - 86_400_000)
): Promise<number> {
	const stale = await db
		.delete(stagedFiles)
		.where(lt(stagedFiles.createdAt, olderThan))
		.returning({ id: stagedFiles.id });
	await Promise.all(stale.map((s) => rm(stagedPath(storageDir, s.id), { force: true })));
	return stale.length;
}

export interface NewVersion {
	project: Project;
	authorId: string;
	versionNumber: string;
	name: string;
	changelog: string;
	channel: Version['channel'];
	gameVersions: string[];
	loaders: Loader[];
	stagedIds: string[];
	primaryId: string | null;
	dependencies: { projectId: string; kind: (typeof dependencies.$inferSelect)['kind'] }[];
}

export type PublishProblem = 'no-files' | 'infected' | 'duplicate-number' | 'foreign-file';

/** Publishes a version from staged uploads; the files move into permanent storage. */
export async function publishVersion(
	db: Database,
	storageDir: string,
	input: NewVersion
): Promise<{ version: Version } | { problem: PublishProblem }> {
	const staged = input.stagedIds.length
		? await db
				.select()
				.from(stagedFiles)
				.where(
					and(
						inArray(stagedFiles.id, input.stagedIds),
						eq(stagedFiles.projectId, input.project.id),
						eq(stagedFiles.userId, input.authorId)
					)
				)
		: [];
	if (!staged.length) return { problem: 'no-files' };
	if (staged.length !== new Set(input.stagedIds).size) return { problem: 'foreign-file' };
	if (staged.some((s) => s.scanStatus === 'infected')) return { problem: 'infected' };
	const [taken] = await db
		.select({ id: versions.id })
		.from(versions)
		.where(
			and(eq(versions.projectId, input.project.id), eq(versions.versionNumber, input.versionNumber))
		);
	if (taken) return { problem: 'duplicate-number' };

	for (const s of staged)
		await keep(storageDir, { path: stagedPath(storageDir, s.id), sha512: s.sha512 });
	const primary = staged.find((s) => s.id === input.primaryId) ?? staged[0]!;
	const version = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(versions)
			.values({
				id: newId(),
				projectId: input.project.id,
				versionNumber: input.versionNumber,
				name: input.name,
				changelog: input.changelog,
				channel: input.channel,
				gameVersions: input.gameVersions,
				loaders: input.loaders,
				authorId: input.authorId
			})
			.returning();
		await tx.insert(files).values(
			staged.map((s) => ({
				id: newId(),
				versionId: created!.id,
				filename: s.filename,
				size: s.size,
				sha1: s.sha1,
				sha512: s.sha512,
				primary: s.id === primary.id,
				scanStatus: s.scanStatus,
				scanDetail: s.scanDetail,
				scannedAt: s.scanStatus === 'pending' ? null : new Date()
			}))
		);
		const deps = input.dependencies.filter((d) => d.projectId !== input.project.id);
		if (deps.length)
			await tx
				.insert(dependencies)
				.values(deps.map((d) => ({ versionId: created!.id, ...d })))
				.onConflictDoNothing();
		await tx.delete(stagedFiles).where(
			inArray(
				stagedFiles.id,
				staged.map((s) => s.id)
			)
		);
		return created!;
	});
	await refreshProjectCache(db, input.project.id);
	if (input.project.status === 'approved') {
		const followers = await db
			.select({ userId: follows.userId })
			.from(follows)
			.where(eq(follows.projectId, input.project.id));
		await notify(
			db,
			followers.map((f) => f.userId).filter((id) => id !== input.authorId),
			'version_published',
			{
				projectId: input.project.id,
				projectName: input.project.name,
				projectType: input.project.type,
				slug: input.project.slug,
				versionId: version.id,
				versionNumber: version.versionNumber
			}
		);
	}
	return { version };
}

export interface VersionWithFiles extends Version {
	files: FileRow[];
	dependencies: { projectId: string; kind: string; name: string; slug: string; type: string }[];
}

export async function listVersions(
	db: Database,
	projectId: string,
	includeWithheld = false
): Promise<VersionWithFiles[]> {
	const list = await db
		.select()
		.from(versions)
		.where(
			and(
				eq(versions.projectId, projectId),
				includeWithheld ? undefined : eq(versions.status, 'listed')
			)
		)
		.orderBy(desc(versions.publishedAt));
	if (!list.length) return [];
	const ids = list.map((v) => v.id);
	const [fileRows, deps] = await Promise.all([
		db
			.select()
			.from(files)
			.where(inArray(files.versionId, ids))
			.orderBy(desc(files.primary), asc(files.filename)),
		db
			.select({
				versionId: dependencies.versionId,
				projectId: dependencies.projectId,
				kind: dependencies.kind,
				name: projects.name,
				slug: projects.slug,
				type: projects.type
			})
			.from(dependencies)
			.innerJoin(projects, eq(projects.id, dependencies.projectId))
			.where(inArray(dependencies.versionId, ids))
	]);
	return list.map((v) => ({
		...v,
		files: fileRows.filter((f) => f.versionId === v.id),
		dependencies: deps.filter((d) => d.versionId === v.id).map(({ versionId: _, ...d }) => d)
	}));
}

export async function getVersion(db: Database, id: string): Promise<Version | null> {
	const [row] = await db.select().from(versions).where(eq(versions.id, id));
	return row ?? null;
}

export async function updateVersion(
	db: Database,
	id: string,
	values: Pick<Version, 'name' | 'changelog' | 'channel' | 'gameVersions' | 'loaders'>
): Promise<void> {
	const [row] = await db
		.update(versions)
		.set(values)
		.where(eq(versions.id, id))
		.returning({ projectId: versions.projectId });
	if (row) await refreshProjectCache(db, row.projectId);
}

export async function setVersionStatus(
	db: Database,
	id: string,
	status: Version['status']
): Promise<void> {
	const [row] = await db
		.update(versions)
		.set({ status })
		.where(eq(versions.id, id))
		.returning({ projectId: versions.projectId });
	if (row) await refreshProjectCache(db, row.projectId);
}

export async function deleteVersion(db: Database, id: string): Promise<void> {
	const [row] = await db
		.delete(versions)
		.where(eq(versions.id, id))
		.returning({ projectId: versions.projectId });
	if (row) await refreshProjectCache(db, row.projectId);
}

export interface Download {
	file: FileRow;
	version: Version;
	project: Project;
}

/**
 * The file behind a download link, if this viewer may have it: the project must be public
 * (or the viewer on its team, or staff), the version listed, and the file scanned clean.
 * Files waiting for a moderator ("review") are only for the team and staff.
 */
export async function resolveDownload(
	db: Database,
	fileId: string,
	viewer: { role: Role; membership: (projectId: string) => Promise<MemberRole | null> } | null
): Promise<Download | null> {
	const [row] = await db
		.select({ file: files, version: versions, project: projects })
		.from(files)
		.innerJoin(versions, eq(versions.id, files.versionId))
		.innerJoin(projects, eq(projects.id, versions.projectId))
		.where(eq(files.id, fileId));
	if (!row || row.file.scanStatus === 'infected') return null;
	const insider = viewer
		? isStaff(viewer.role) || !!(await viewer.membership(row.project.id))
		: false;
	const publicFile =
		row.project.status === 'approved' &&
		row.version.status === 'listed' &&
		row.file.scanStatus === 'clean';
	if (publicFile) return row;
	return insider && row.file.scanStatus !== 'error' ? row : null;
}

/** Counts a download once per visitor per file per day; returns whether it counted. */
export class DownloadCounter {
	private readonly seen = new Map<string, number>();

	constructor(
		private readonly now: () => number = Date.now,
		private readonly maxKeys = 200_000
	) {}

	shouldCount(visitor: string, fileId: string): boolean {
		const key = `${visitor}:${fileId}`;
		const time = this.now();
		const last = this.seen.get(key);
		if (last !== undefined && time - last < 86_400_000) return false;
		if (this.seen.size >= this.maxKeys) this.seen.clear();
		this.seen.set(key, time);
		return true;
	}
}

export async function recordDownload(
	db: Database,
	download: Download,
	day = new Date().toISOString().slice(0, 10)
): Promise<void> {
	await db
		.update(versions)
		.set({ downloads: sql`${versions.downloads} + 1` })
		.where(eq(versions.id, download.version.id));
	await db
		.update(projects)
		.set({ downloads: sql`${projects.downloads} + 1` })
		.where(eq(projects.id, download.project.id));
	await db
		.insert(downloadsDaily)
		.values({ projectId: download.project.id, day, count: 1 })
		.onConflictDoUpdate({
			target: [downloadsDaily.projectId, downloadsDaily.day],
			set: { count: sql`${downloadsDaily.count} + 1` }
		});
}

/** Daily downloads for the last `days` days, oldest first, with zero-filled gaps. */
export async function downloadHistory(
	db: Database,
	projectId: string,
	days = 30,
	today = new Date()
) {
	const start = new Date(today.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
	const rows = await db
		.select({ day: downloadsDaily.day, count: downloadsDaily.count })
		.from(downloadsDaily)
		.where(and(eq(downloadsDaily.projectId, projectId), sql`${downloadsDaily.day} >= ${start}`));
	const byDay = new Map(rows.map((r) => [r.day, r.count]));
	return Array.from({ length: days }, (_, i) => {
		const day = new Date(today.getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
		return { day, count: byDay.get(day) ?? 0 };
	});
}
