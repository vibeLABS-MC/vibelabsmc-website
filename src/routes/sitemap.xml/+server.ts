import { catalog } from '#lib/server/content.ts';
import { SITE } from '#lib/site.ts';

export const prerender = true;

export const GET = () => {
	const pages = [
		{ path: '/', updated: undefined },
		{ path: '/docs', updated: undefined },
		...catalog.pages.map((p) => ({ path: `/docs/${p.slug}`, updated: p.updated }))
	];
	const urls = pages
		.map(
			({ path, updated }) =>
				`<url><loc>${SITE.url}${path}</loc>${updated ? `<lastmod>${updated}</lastmod>` : ''}</url>`
		)
		.join('');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
		{ headers: { 'Content-Type': 'application/xml' } }
	);
};
