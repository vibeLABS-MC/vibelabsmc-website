/**
 * Marketplace search: full-text over name, summary and description, typo-tolerant name
 * matching (pg_trgm), filters on Minecraft version, loader, category and licence, six sort
 * orders, and live counts for every filter value (each counted with the other filters applied).
 */
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { gallery, projectMembers, projects, users } from '../db/schema.ts';
import { LICENSES, type ProjectType } from '../../marketplace/taxonomy.ts';
import { PAGE_SIZE, type SearchQuery } from '../../marketplace/search.ts';

export interface ProjectCard {
	id: string;
	slug: string;
	type: ProjectType;
	name: string;
	summary: string;
	iconKey: string | null;
	bannerKey: string | null;
	categories: string[];
	loaders: string[];
	gameVersions: string[];
	downloads: number;
	follows: number;
	ratingSum: number;
	ratingCount: number;
	updatedAt: Date;
	author: { username: string | null; displayName: string } | null;
}

export interface SearchResult {
	hits: ProjectCard[];
	total: number;
	facets: {
		categories: Record<string, number>;
		loaders: Record<string, number>;
		versions: Record<string, number>;
	};
}

const OPEN = LICENSES.filter((l) => l.open).map((l) => l.id);

type Filter = 'versions' | 'loaders' | 'categories';

function conditions(type: ProjectType | null, query: SearchQuery, skip?: Filter): SQL[] {
	const where: SQL[] = [eq(projects.status, 'approved')];
	if (type) where.push(eq(projects.type, type));
	if (query.q)
		where.push(
			sql`(${projects.search} @@ websearch_to_tsquery('english', ${query.q}) or word_similarity(${query.q.toLowerCase()}, lower(${projects.name})) > 0.45)`
		);
	if (query.versions.length && skip !== 'versions')
		where.push(sql`${projects.gameVersions} && ${sql.param(query.versions)}::text[]`);
	if (query.loaders.length && skip !== 'loaders')
		where.push(sql`${projects.loaders} && ${sql.param(query.loaders)}::text[]`);
	if (query.categories.length && skip !== 'categories')
		where.push(sql`${projects.categories} @> ${sql.param(query.categories)}::text[]`);
	if (query.openSource) where.push(inArray(projects.license, OPEN));
	return where;
}

function ordering(query: SearchQuery): SQL[] {
	const rating = sql`(${projects.ratingSum} + 10.5) / (${projects.ratingCount} + 3.0)`;
	switch (query.sort) {
		case 'downloads':
			return [desc(projects.downloads)];
		case 'follows':
			return [desc(projects.follows), desc(projects.downloads)];
		case 'rating':
			return [sql`${rating} desc`, desc(projects.ratingCount)];
		case 'newest':
			return [sql`${projects.publishedAt} desc nulls last`];
		case 'updated':
			return [sql`coalesce(${projects.latestVersionAt}, ${projects.publishedAt}) desc nulls last`];
		default:
			return query.q
				? [
						sql`(ts_rank_cd(${projects.search}, websearch_to_tsquery('english', ${query.q})) + 2 * word_similarity(${query.q.toLowerCase()}, lower(${projects.name}))) desc`,
						desc(projects.downloads)
					]
				: [desc(projects.downloads), desc(projects.follows)];
	}
}

const cardColumns = {
	id: projects.id,
	slug: projects.slug,
	type: projects.type,
	name: projects.name,
	summary: projects.summary,
	iconKey: projects.iconKey,
	bannerKey: sql<
		string | null
	>`(select g.image_key from ${gallery} g where g.project_id = ${projects.id} order by g.featured desc, g.sort_order asc, g.created_at asc limit 1)`,
	categories: projects.categories,
	loaders: projects.loaders,
	gameVersions: projects.gameVersions,
	downloads: projects.downloads,
	follows: projects.follows,
	ratingSum: projects.ratingSum,
	ratingCount: projects.ratingCount,
	updatedAt: sql<Date>`coalesce(${projects.latestVersionAt}, ${projects.publishedAt}, ${projects.updatedAt})`,
	ownerUsername: users.username,
	ownerName: users.displayName
};

type CardRow = { [K in keyof typeof cardColumns]: unknown };

function toCard(row: CardRow): ProjectCard {
	const { ownerUsername, ownerName, updatedAt, ...rest } = row as Record<string, unknown>;
	return {
		...(rest as Omit<ProjectCard, 'author' | 'updatedAt'>),
		updatedAt: new Date(updatedAt as string | Date),
		author: ownerName
			? { username: ownerUsername as string | null, displayName: ownerName as string }
			: null
	};
}

/** Cards for projects, with their owner, in the order given (the dashboard and collections use this too). */
export async function projectCards(
	db: Database,
	where: SQL | undefined,
	order: SQL[],
	limit: number,
	offset = 0
): Promise<ProjectCard[]> {
	const rows = await db
		.select(cardColumns)
		.from(projects)
		.leftJoin(
			projectMembers,
			and(eq(projectMembers.projectId, projects.id), eq(projectMembers.role, 'owner'))
		)
		.leftJoin(users, eq(users.id, projectMembers.userId))
		.where(where)
		.orderBy(...order)
		.limit(limit)
		.offset(offset);
	return rows.map(toCard);
}

async function facet(db: Database, column: SQL, where: SQL[]): Promise<Record<string, number>> {
	const value = sql<string>`value`;
	const rows = await db
		.select({ value, n: count() })
		.from(sql`${projects}, unnest(${column}) as value`)
		.where(and(...where))
		.groupBy(value);
	return Object.fromEntries(rows.map((r) => [r.value, r.n]));
}

export async function searchProjects(
	db: Database,
	type: ProjectType | null,
	query: SearchQuery
): Promise<SearchResult> {
	const where = and(...conditions(type, query));
	const [hits, [total], categories, loaders, versions] = await Promise.all([
		projectCards(db, where, ordering(query), PAGE_SIZE, (query.page - 1) * PAGE_SIZE),
		db.select({ n: count() }).from(projects).where(where),
		facet(db, sql`${projects.categories}`, conditions(type, query, 'categories')),
		facet(db, sql`${projects.loaders}`, conditions(type, query, 'loaders')),
		facet(db, sql`${projects.gameVersions}`, conditions(type, query, 'versions'))
	]);
	return { hits, total: total?.n ?? 0, facets: { categories, loaders, versions } };
}
