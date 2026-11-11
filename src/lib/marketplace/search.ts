/**
 * Marketplace search state, kept in the URL so every search can be shared and bookmarked.
 * Pure and browser-safe: the listing page and the server both read it from here.
 */

export const SORTS = ['relevance', 'downloads', 'follows', 'rating', 'newest', 'updated'] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_NAMES: Record<Sort, string> = {
	relevance: 'Relevance',
	downloads: 'Most downloads',
	follows: 'Most followed',
	rating: 'Best rated',
	newest: 'Newest',
	updated: 'Recently updated'
};

export const PAGE_SIZE = 20;
const MAX_PAGE = 500;

export interface SearchQuery {
	q: string;
	versions: string[];
	loaders: string[];
	categories: string[];
	openSource: boolean;
	sort: Sort;
	page: number;
	view: 'grid' | 'list';
}

export const DEFAULT_QUERY: SearchQuery = {
	q: '',
	versions: [],
	loaders: [],
	categories: [],
	openSource: false,
	sort: 'relevance',
	page: 1,
	view: 'grid'
};

const many = (params: URLSearchParams, name: string, max = 20) =>
	[
		...new Set(
			params
				.getAll(name)
				.flatMap((v) => v.split(','))
				.map((v) => v.trim())
				.filter((v) => /^[\w.+-]{1,40}$/.test(v))
		)
	].slice(0, max);

export function parseQuery(params: URLSearchParams): SearchQuery {
	const sort = params.get('sort') as Sort;
	const page = Number.parseInt(params.get('page') ?? '1', 10);
	return {
		q: (params.get('q') ?? '').trim().slice(0, 100),
		versions: many(params, 'v'),
		loaders: many(params, 'l'),
		categories: many(params, 'c'),
		openSource: params.get('oss') === '1',
		sort: SORTS.includes(sort) ? sort : 'relevance',
		page: Number.isFinite(page) ? Math.min(Math.max(page, 1), MAX_PAGE) : 1,
		view: params.get('view') === 'list' ? 'list' : 'grid'
	};
}

/** The query as URL parameters, leaving out defaults so URLs stay short. */
export function toParams(query: SearchQuery): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set('q', query.q);
	for (const v of query.versions) params.append('v', v);
	for (const l of query.loaders) params.append('l', l);
	for (const c of query.categories) params.append('c', c);
	if (query.openSource) params.set('oss', '1');
	if (query.sort !== 'relevance') params.set('sort', query.sort);
	if (query.page > 1) params.set('page', String(query.page));
	if (query.view === 'list') params.set('view', 'list');
	return params;
}

/** A link to the same search with some things changed (filters changing go back to page 1). */
export function withChanges(query: SearchQuery, changes: Partial<SearchQuery>): string {
	const next = { ...query, ...changes };
	if (!('page' in changes)) next.page = 1;
	const params = toParams(next).toString();
	return params ? `?${params}` : '?';
}

/** Adds the value if missing, removes it if present. */
export const toggle = (list: string[], value: string): string[] =>
	list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export const hasFilters = (query: SearchQuery): boolean =>
	!!(
		query.q ||
		query.versions.length ||
		query.loaders.length ||
		query.categories.length ||
		query.openSource
	);

/** Average rating pulled towards 3.5 when there are few reviews, so one 5-star review doesn't top the list. */
export function bayesianRating(sum: number, count: number, prior = 3.5, weight = 3): number {
	return (sum + prior * weight) / (count + weight);
}

/** Page numbers to show, with null for a gap: 1 … 4 5 6 … 20 */
export function pageList(current: number, total: number): (number | null)[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages = new Set(
		[1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total)
	);
	const sorted = [...pages].sort((a, b) => a - b);
	const out: (number | null)[] = [];
	for (const [i, page] of sorted.entries()) {
		if (i > 0 && page - sorted[i - 1]! > 1) out.push(null);
		out.push(page);
	}
	return out;
}
