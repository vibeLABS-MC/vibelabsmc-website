import type { NavSection } from './catalog';
import type { DocPage } from './page';
import type { SectionId } from './sections';

/** Just enough of a page for links and cards, so layouts do not ship page bodies to the browser. */
export interface PageSummary {
	slug: string;
	title: string;
	description: string;
	tag: string | null;
	updated: string;
	section: SectionId;
}

export interface NavGroup {
	id: SectionId;
	title: string;
	pages: PageSummary[];
}

export const summary = (page: DocPage): PageSummary => ({
	slug: page.slug,
	title: page.title,
	description: page.description,
	tag: page.tag ?? null,
	updated: page.updated,
	section: page.section
});

export const navGroups = (nav: NavSection[]): NavGroup[] =>
	nav.map((s) => ({ id: s.id, title: s.title, pages: s.pages.map(summary) }));
