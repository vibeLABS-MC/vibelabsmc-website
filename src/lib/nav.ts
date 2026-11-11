import { docsUrl } from './site.ts';

export interface NavLink {
	label: string;
	/** A few words shown under the label in the mobile menu. */
	note: string;
	href: string;
}

/** The header's links: the marketplace on this site, then the docs site. */
export const NAV: NavLink[] = [
	{ label: 'Marketplace', note: 'Shaders, texture packs, mods, data packs', href: '/marketplace' },
	{ label: 'Docs', note: 'Every guide and reference page', href: docsUrl() },
	{ label: 'Play', note: 'Install and tune a shaderpack', href: docsUrl('/using/install-iris/') },
	{
		label: 'Make',
		note: 'Write your first shaderpack',
		href: docsUrl('/developing/getting-started/')
	}
];

/** The docs links only (the footer's Docs column). */
export const DOCS_NAV: NavLink[] = [
	...NAV.slice(1),
	{
		label: 'Reference',
		note: 'Programs, uniforms, block IDs',
		href: docsUrl('/reference/programs/')
	}
];
