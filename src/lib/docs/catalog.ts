import { ContentError, type DocPage } from './page';
import { SECTIONS, type Section } from './sections';

export interface NavSection extends Section {
	pages: DocPage[];
}

/** Every page, in reading order: sidebar sections first, then `order` within a section. */
export interface Catalog {
	pages: DocPage[];
	nav: NavSection[];
	find(slug: string): DocPage | undefined;
}

export function buildCatalog(pages: DocPage[]): Catalog {
	const nav = SECTIONS.map((section) => ({
		...section,
		pages: pages.filter((p) => p.section === section.id).sort((a, b) => a.order - b.order)
	})).filter((section) => section.pages.length > 0);
	nav.forEach(rejectDuplicateOrder);
	const ordered = nav.flatMap((section) => section.pages);
	const bySlug = new Map(ordered.map((p) => [p.slug, p]));
	return { pages: ordered, nav, find: (slug) => bySlug.get(slug) };
}

function rejectDuplicateOrder(section: NavSection): void {
	section.pages.forEach((page, i) => {
		const before = section.pages[i - 1];
		if (before && before.order === page.order) {
			const [first, second] = [before.source, page.source].sort();
			throw new ContentError(
				`${first} and ${second} both use order ${page.order} in "${section.id}"`
			);
		}
	});
}

export function neighbours(
	catalog: Catalog,
	slug: string
): { previous: DocPage | undefined; next: DocPage | undefined } {
	const i = catalog.pages.findIndex((p) => p.slug === slug);
	return { previous: catalog.pages[i - 1], next: catalog.pages[i + 1] };
}

export function recentlyUpdated(catalog: Catalog, count: number): DocPage[] {
	return catalog.pages
		.map((page, position) => ({ page, position }))
		.sort((a, b) => b.page.updated.localeCompare(a.page.updated) || a.position - b.position)
		.slice(0, count)
		.map(({ page }) => page);
}
