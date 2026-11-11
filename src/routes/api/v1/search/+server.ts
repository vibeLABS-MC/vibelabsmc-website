import { json } from '@sveltejs/kit';
import { limitRequest } from '#lib/server/http.ts';
import { searchProjects } from '#lib/server/marketplace/search.ts';
import { parseQuery } from '#lib/marketplace/search.ts';
import { isProjectType } from '#lib/marketplace/taxonomy.ts';
import type { RequestHandler } from './$types';

/**
 * Public read API: search approved projects. Same parameters as the marketplace pages
 * (q, v, l, c, oss, sort, page) plus `type` (shader, resourcepack, mod, datapack).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	limitRequest(locals, 'api', locals.ipHash);
	const type = url.searchParams.get('type');
	const query = parseQuery(url.searchParams);
	const result = await searchProjects(locals.db, type && isProjectType(type) ? type : null, query);
	return json(
		{
			total: result.total,
			page: query.page,
			hits: result.hits.map((h) => ({
				id: h.id,
				slug: h.slug,
				type: h.type,
				name: h.name,
				summary: h.summary,
				icon: h.iconKey ? `${locals.config.origin}/media/${h.iconKey}.webp` : null,
				categories: h.categories,
				loaders: h.loaders,
				gameVersions: h.gameVersions,
				downloads: h.downloads,
				follows: h.follows,
				rating: h.ratingCount ? Math.round((h.ratingSum / h.ratingCount) * 10) / 10 : null,
				updatedAt: h.updatedAt,
				author: h.author?.username ?? null
			})),
			facets: result.facets
		},
		{ headers: { 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' } }
	);
};
