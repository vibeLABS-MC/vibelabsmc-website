import { error } from '@sveltejs/kit';
import { neighbours } from '#lib/docs/catalog.ts';
import { LOADER_NAMES } from '#lib/docs/sections.ts';
import { summary } from '#lib/docs/summary.ts';
import { catalog, renderPage } from '#lib/server/content.ts';
import { editUrl } from '#lib/site.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => catalog.pages.map((p) => ({ slug: p.slug }));

export const load = (async ({ params }) => {
	const doc = catalog.find(params.slug);
	if (!doc) error(404, 'This page does not exist.');
	const { previous, next } = neighbours(catalog, doc.slug);
	const rendered = await renderPage(doc);
	return {
		page: { ...summary(doc), loaders: doc.loaders.map((l) => LOADER_NAMES[l]) },
		sectionTitle: catalog.nav.find((s) => s.id === doc.section)?.title ?? '',
		html: rendered.html,
		headings: rendered.headings,
		minutes: rendered.minutes,
		editUrl: editUrl(doc.source),
		previous: previous ? summary(previous) : null,
		next: next ? summary(next) : null
	};
}) satisfies PageServerLoad;
