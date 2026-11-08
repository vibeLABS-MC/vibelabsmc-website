import { describe, expect, it } from 'vitest';
import { buildCatalog, neighbours, recentlyUpdated } from './catalog';
import type { DocPage } from './page';
import type { SectionId } from './sections';

function page(slug: string, section: SectionId, order: number, updated = '2026-11-01'): DocPage {
	return {
		slug,
		source: `src/content/docs/${slug}.md`,
		title: slug,
		description: `About ${slug}`,
		section,
		order,
		updated,
		tag: undefined,
		loaders: [],
		body: ''
	};
}

const pages = [
	page('uniforms', 'reference', 2, '2026-11-06'),
	page('pipeline', 'developing', 2),
	page('install', 'using', 1, '2026-11-06'),
	page('programs', 'reference', 1),
	page('start', 'developing', 1, '2026-11-08')
];

describe('buildCatalog', () => {
	it('groups pages by section in sidebar order and sorts each section by order', () => {
		const catalog = buildCatalog(pages);

		expect(catalog.nav.map((s) => [s.title, s.pages.map((p) => p.slug)])).toEqual([
			['Using shaders', ['install']],
			['Developing', ['start', 'pipeline']],
			['Reference', ['programs', 'uniforms']]
		]);
	});

	it('finds a page by its slug', () => {
		const catalog = buildCatalog(pages);

		expect(catalog.find('pipeline')?.section).toBe('developing');
		expect(catalog.find('missing')).toBeUndefined();
	});

	it('rejects two pages with the same order in one section, naming both files', () => {
		const clash = [...pages, page('other', 'developing', 2)];

		expect(() => buildCatalog(clash)).toThrow(
			'src/content/docs/other.md and src/content/docs/pipeline.md both use order 2 in "developing"'
		);
	});
});

describe('neighbours', () => {
	const catalog = buildCatalog(pages);

	it('links across section boundaries in reading order', () => {
		expect(neighbours(catalog, 'pipeline')).toEqual({
			previous: catalog.find('start'),
			next: catalog.find('programs')
		});
	});

	it('has no previous page at the start and no next page at the end', () => {
		expect(neighbours(catalog, 'install').previous).toBeUndefined();
		expect(neighbours(catalog, 'uniforms').next).toBeUndefined();
	});
});

describe('recentlyUpdated', () => {
	it('lists the newest edits first and breaks ties by reading order', () => {
		const catalog = buildCatalog(pages);

		expect(recentlyUpdated(catalog, 3).map((p) => p.slug)).toEqual([
			'start',
			'install',
			'uniforms'
		]);
	});
});
