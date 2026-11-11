/** The lists filters are built from: categories (admin-editable) and Minecraft versions (from Mojang). */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { categories, gameVersions } from '../db/schema.ts';
import {
	DEFAULT_CATEGORIES,
	type CategoryGroup,
	type ProjectType
} from '../../marketplace/taxonomy.ts';

export type Category = typeof categories.$inferSelect;

/** Adds any default category that is missing; never changes ones admins edited. */
export async function seedCategories(db: Database): Promise<void> {
	const rows = Object.entries(DEFAULT_CATEGORIES).flatMap(([type, list]) =>
		list.map((c, i) => ({
			projectType: type as ProjectType,
			slug: c.slug,
			group: c.group,
			name: c.name,
			sortOrder: i
		}))
	);
	await db.insert(categories).values(rows).onConflictDoNothing();
}

export async function listCategories(
	db: Database,
	type: ProjectType,
	includeHidden = false
): Promise<Category[]> {
	return db
		.select()
		.from(categories)
		.where(
			and(
				eq(categories.projectType, type),
				includeHidden ? undefined : eq(categories.hidden, false)
			)
		)
		.orderBy(asc(categories.group), asc(categories.sortOrder), asc(categories.name));
}

/** Keeps only categories that exist (and are visible) for the type, in a stable order. */
export async function validCategories(
	db: Database,
	type: ProjectType,
	chosen: string[]
): Promise<string[]> {
	const known = new Set((await listCategories(db, type)).map((c) => c.slug));
	return [...new Set(chosen)].filter((slug) => known.has(slug)).slice(0, 8);
}

export async function upsertCategory(
	db: Database,
	value: {
		projectType: ProjectType;
		slug: string;
		group: CategoryGroup;
		name: string;
		hidden: boolean;
		sortOrder?: number;
	}
): Promise<void> {
	await db
		.insert(categories)
		.values({ ...value, sortOrder: value.sortOrder ?? 100 })
		.onConflictDoUpdate({
			target: [categories.projectType, categories.slug],
			set: { name: value.name, group: value.group, hidden: value.hidden }
		});
}

export interface GameVersion {
	version: string;
	kind: string;
	releasedAt: Date;
}

/** Every release, newest first. */
export async function listGameVersions(db: Database): Promise<GameVersion[]> {
	return db
		.select()
		.from(gameVersions)
		.where(eq(gameVersions.kind, 'release'))
		.orderBy(desc(gameVersions.releasedAt));
}

interface Manifest {
	versions: { id: string; type: string; releaseTime: string }[];
}

/** Pulls Mojang's version list and adds new releases. Returns how many were new. */
export async function syncGameVersions(
	db: Database,
	fetchFn: typeof fetch,
	manifestUrl: string
): Promise<number> {
	const response = await fetchFn(manifestUrl, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`Mojang's version list answered ${response.status}.`);
	const manifest = (await response.json()) as Manifest;
	const releases = manifest.versions
		.filter((v) => v.type === 'release' && /^\d+(\.\d+){1,2}$/.test(v.id))
		.map((v) => ({ version: v.id, kind: 'release', releasedAt: new Date(v.releaseTime) }));
	if (!releases.length) return 0;
	const inserted = await db
		.insert(gameVersions)
		.values(releases)
		.onConflictDoNothing()
		.returning({ v: gameVersions.version });
	return inserted.length;
}

/** Versions that exist, from a submitted list. */
export async function validGameVersions(db: Database, chosen: string[]): Promise<string[]> {
	if (!chosen.length) return [];
	const rows = await db
		.select({ version: gameVersions.version })
		.from(gameVersions)
		.where(sql`${gameVersions.version} = any(${sql.param(chosen)}::text[])`)
		.orderBy(desc(gameVersions.releasedAt));
	return rows.map((r) => r.version);
}
