/**
 * Background work, run inside the server process on timers: keeping Minecraft versions current,
 * clearing out expired sessions, tokens and abandoned uploads, and re-scanning files the virus
 * scanner couldn't reach when they were uploaded.
 */
import { count, eq, inArray, isNotNull, lt, or } from 'drizzle-orm';
import { emailTokens, files, gameVersions, sessions, stagedFiles } from './db/schema.ts';
import type { Runtime } from './runtime.ts';
import { seedCategories, syncGameVersions } from './marketplace/catalog.ts';
import { cleanupStaged } from './marketplace/releases.ts';
import { listEntries } from './uploads/archive.ts';
import { filePath, stagedPath } from './uploads/receive.ts';
import { scanArchive } from './uploads/scan.ts';

const MINUTE = 60_000;

async function safely(name: string, work: () => Promise<unknown>) {
	try {
		await work();
	} catch (cause) {
		console.error(`[job ${name}]`, cause);
	}
}

export async function cleanup(rt: Runtime): Promise<void> {
	const now = new Date();
	await rt.db
		.delete(sessions)
		.where(
			or(
				lt(sessions.expiresAt, now),
				lt(sessions.lastSeenAt, new Date(now.getTime() - 7 * 86_400_000))
			)
		);
	await rt.db
		.delete(emailTokens)
		.where(
			or(
				lt(emailTokens.expiresAt, new Date(now.getTime() - 86_400_000)),
				isNotNull(emailTokens.usedAt)
			)
		);
	await cleanupStaged(rt.db, rt.config.storageDir);
}

/** Scans again every file whose scan could not finish. */
export async function rescanPending(rt: Runtime): Promise<number> {
	const clamd = rt.config.clamd;
	if (!clamd) return 0;
	let done = 0;
	const published = await rt.db
		.select({ id: files.id, sha512: files.sha512 })
		.from(files)
		.where(inArray(files.scanStatus, ['pending', 'error']))
		.limit(20);
	for (const file of published) {
		const path = filePath(rt.config.storageDir, file.sha512);
		const scan = await scanArchive(clamd, path, await listEntries(path));
		if (scan.status === 'error') continue;
		await rt.db
			.update(files)
			.set({ scanStatus: scan.status, scanDetail: scan.detail, scannedAt: new Date() })
			.where(eq(files.id, file.id));
		done++;
	}
	const staged = await rt.db
		.select({ id: stagedFiles.id })
		.from(stagedFiles)
		.where(eq(stagedFiles.scanStatus, 'pending'))
		.limit(20);
	for (const file of staged) {
		const path = stagedPath(rt.config.storageDir, file.id);
		const scan = await scanArchive(clamd, path, await listEntries(path));
		if (scan.status === 'error') continue;
		await rt.db
			.update(stagedFiles)
			.set({ scanStatus: scan.status, scanDetail: scan.detail })
			.where(eq(stagedFiles.id, file.id));
		done++;
	}
	return done;
}

export async function versionsIfEmpty(rt: Runtime): Promise<void> {
	const [row] = await rt.db.select({ n: count() }).from(gameVersions);
	if (!row?.n) await syncGameVersions(rt.db, fetch, rt.config.endpoints.mojangManifest);
}

let started = false;

/** Called once from the server's init hook. */
export async function startJobs(rt: Runtime): Promise<void> {
	if (started) return;
	started = true;
	await safely('seed', () => seedCategories(rt.db));
	await safely('versions', () => versionsIfEmpty(rt));
	const every = (minutes: number, name: string, work: () => Promise<unknown>) =>
		setInterval(() => void safely(name, work), minutes * MINUTE).unref();
	every(6 * 60, 'versions', () =>
		syncGameVersions(rt.db, fetch, rt.config.endpoints.mojangManifest)
	);
	every(60, 'cleanup', () => cleanup(rt));
	every(10, 'rescan', () => rescanPending(rt));
}
