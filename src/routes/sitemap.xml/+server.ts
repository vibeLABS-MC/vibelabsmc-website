import { desc, eq } from 'drizzle-orm';
import { projects } from '#lib/server/db/schema.ts';
import { PROJECT_TYPES } from '#lib/marketplace/taxonomy.ts';
import { SITE } from '#lib/site.ts';
import type { RequestHandler } from './$types';

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The landing page, the marketplace sections and every approved project. */
export const GET: RequestHandler = async ({ locals }) => {
	const listed = await locals.db
		.select({ slug: projects.slug, type: projects.type, updatedAt: projects.updatedAt })
		.from(projects)
		.where(eq(projects.status, 'approved'))
		.orderBy(desc(projects.updatedAt))
		.limit(45_000);
	const typePath = new Map(PROJECT_TYPES.map((t) => [t.id, t.path]));
	const urls = [
		`<url><loc>${SITE.url}/</loc></url>`,
		`<url><loc>${SITE.url}/marketplace</loc></url>`,
		...PROJECT_TYPES.map((t) => `<url><loc>${SITE.url}/marketplace/${t.path}</loc></url>`),
		...listed.map(
			(p) =>
				`<url><loc>${SITE.url}/marketplace/${typePath.get(p.type)}/${escape(p.slug)}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`
		)
	];
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
		{ headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=3600' } }
	);
};
