import { buildCatalog } from '#lib/docs/catalog.ts';
import { createDocsHighlighter, type DocsHighlighter } from '#lib/docs/highlight.ts';
import { readingMinutes, renderMarkdown, type Rendered } from '#lib/docs/markdown.ts';
import { ContentError, parsePage, type DocPage } from '#lib/docs/page.ts';
import type { SearchEntry } from '#lib/docs/search.ts';

// The content boundary: files are read and checked once here, at build time.
const files = import.meta.glob<string>('/src/content/docs/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

export const catalog = buildCatalog(
	Object.entries(files).map(([path, raw]) => parsePage(path.slice(1), raw))
);

let highlighter: Promise<DocsHighlighter> | undefined;

export interface RenderedPage extends Rendered {
	minutes: number;
}

/** Renders Markdown or Markdown-in-a-page; errors name the file they came from. */
export async function render(markdown: string, source: string): Promise<Rendered> {
	highlighter ??= createDocsHighlighter();
	const shiki = await highlighter;
	try {
		return renderMarkdown(markdown, shiki);
	} catch (error) {
		if (error instanceof ContentError) throw new ContentError(`${source}: ${error.message}`);
		throw error;
	}
}

export async function renderPage(page: DocPage): Promise<RenderedPage> {
	return { ...(await render(page.body, page.source)), minutes: readingMinutes(page.body) };
}

export async function searchEntries(): Promise<SearchEntry[]> {
	const titles = new Map(catalog.nav.map((s) => [s.id, s.title]));
	return Promise.all(
		catalog.pages.map(async (page) => ({
			slug: page.slug,
			title: page.title,
			section: titles.get(page.section) ?? page.section,
			description: page.description,
			headings: (await renderPage(page)).headings
		}))
	);
}
