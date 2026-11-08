import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { navGroups } from '#lib/docs/summary.ts';
import { editUrl } from '#lib/site.ts';
import { catalog, render, renderPage, searchEntries } from './content';

const files = readdirSync('src/content/docs').filter((f) => f.endsWith('.md'));

describe('the docs content', () => {
	it('puts every Markdown file in the catalog, starting with the player guides', () => {
		expect(catalog.pages).toHaveLength(files.length);
		expect(catalog.nav.map((s) => s.id)).toEqual(['using', 'developing', 'reference', 'standards']);
	});

	it('gives the browser page summaries without page bodies', () => {
		const [first] = navGroups(catalog.nav)[0].pages;

		expect(Object.keys(first).sort()).toEqual([
			'description',
			'section',
			'slug',
			'tag',
			'title',
			'updated'
		]);
	});

	it('renders a page with its outline and reading time', async () => {
		const page = await renderPage(catalog.find('rendering-pipeline')!);

		expect(page.headings[0]).toEqual({ id: 'overview', text: 'Overview' });
		expect(page.minutes).toBeGreaterThan(1);
		expect(page.html).toContain('<figure class="pipeline">');
	});

	it('names the file when its Markdown is invalid', async () => {
		await expect(render('> [!DANGER] Oops\n> text\n', 'src/content/docs/oops.md')).rejects.toThrow(
			'src/content/docs/oops.md: callout type "DANGER"'
		);
	});

	it('indexes every page for search under its section title', async () => {
		const entries = await searchEntries();

		expect(entries.map((e) => e.slug)).toEqual(catalog.pages.map((p) => p.slug));
		expect(entries.find((e) => e.slug === 'uniforms')?.section).toBe('Reference');
	});

	it('links each page to its file on GitHub for editing', () => {
		expect(editUrl('src/content/docs/uniforms.md')).toBe(
			'https://github.com/vibeLABS-MC/vibelabsmc-website/edit/main/src/content/docs/uniforms.md'
		);
	});
});
