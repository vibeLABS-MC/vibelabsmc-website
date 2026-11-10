import { SITE } from '#lib/site.ts';

export const prerender = true;

/** The landing site is one page; the docs site publishes its own sitemap. */
export const GET = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE.url}/</loc></url></urlset>`,
		{ headers: { 'Content-Type': 'application/xml' } }
	);
