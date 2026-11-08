import { describe, expect, it } from 'vitest';
import { files, read } from './build';

const docPages = files.filter((f) => /^docs\/[a-z0-9-]+\.html$/.test(f));

describe('the built docs', () => {
	it('builds every Markdown page in src/content/docs', () => {
		expect(docPages.length).toBeGreaterThanOrEqual(15);
		expect(docPages).toContain('docs/rendering-pipeline.html');
	});

	it.each(docPages)('%s has a title, description, canonical address and one heading', (page) => {
		const html = read(page);
		const slug = page.replace(/^docs\/|\.html$/g, '');

		expect(html).toMatch(/<title>[^<]+ · vibeLABS docs<\/title>/);
		expect(html).toMatch(/<meta name="description" content="[^"]{20,}"/);
		expect(html).toContain(`<link rel="canonical" href="https://vibelabsmc.org/docs/${slug}"`);
		expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
	});

	it('lists every page in the sitemap and the search index', () => {
		const sitemap = read('sitemap.xml');
		const index: { slug: string }[] = JSON.parse(read('search.json'));

		for (const page of docPages) {
			const slug = page.replace(/^docs\/|\.html$/g, '');
			expect(sitemap).toContain(`<loc>https://vibelabsmc.org/docs/${slug}</loc>`);
			expect(index.map((e) => e.slug)).toContain(slug);
		}
	});

	it('serves a not-found page and the files GitHub Pages needs', () => {
		expect(files).toEqual(
			expect.arrayContaining(['404.html', 'index.html', '.nojekyll', 'robots.txt'])
		);
		expect(read('robots.txt')).toContain('Sitemap: https://vibelabsmc.org/sitemap.xml');
	});
});
