/** The four parts of the docs, in sidebar order. Pages pick one with `section:`. */
export const SECTIONS = [
	{ id: 'using', title: 'Using shaders' },
	{ id: 'developing', title: 'Developing' },
	{ id: 'reference', title: 'Reference' },
	{ id: 'standards', title: 'Standards' }
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
export type Section = (typeof SECTIONS)[number];

export const LOADERS = ['iris', 'optifine'] as const;
export type Loader = (typeof LOADERS)[number];
