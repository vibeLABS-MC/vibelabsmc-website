/**
 * What the marketplace sells (for free): the four project types, their loaders, default
 * categories and licences. Shared by the server and the browser, so nothing here touches the
 * database. The categories table starts from DEFAULT_CATEGORIES; admins can rename, hide or add.
 */

export type ProjectType = 'shader' | 'resourcepack' | 'mod' | 'datapack';
export type Loader = 'iris' | 'optifine' | 'fabric' | 'forge' | 'neoforge' | 'quilt';

export interface ProjectTypeInfo {
	id: ProjectType;
	/** The URL segment: /marketplace/shaders */
	path: string;
	name: string;
	singular: string;
	/** Loaders a version can declare; empty when the type works in plain Minecraft. */
	loaders: Loader[];
	extensions: string[];
	blurb: string;
}

export const PROJECT_TYPES: ProjectTypeInfo[] = [
	{
		id: 'shader',
		path: 'shaders',
		name: 'Shader packs',
		singular: 'Shader pack',
		loaders: ['iris', 'optifine'],
		extensions: ['.zip'],
		blurb: 'Lighting, shadows, water and sky for Iris and OptiFine.'
	},
	{
		id: 'resourcepack',
		path: 'texture-packs',
		name: 'Texture packs',
		singular: 'Texture pack',
		loaders: [],
		extensions: ['.zip'],
		blurb: 'New textures, models, sounds and PBR materials.'
	},
	{
		id: 'mod',
		path: 'mods',
		name: 'Mods',
		singular: 'Mod',
		loaders: ['fabric', 'neoforge', 'forge', 'quilt'],
		extensions: ['.jar'],
		blurb: 'Fabric, NeoForge, Forge and Quilt mods.'
	},
	{
		id: 'datapack',
		path: 'data-packs',
		name: 'Data packs',
		singular: 'Data pack',
		loaders: [],
		extensions: ['.zip'],
		blurb: 'Recipes, structures, advancements and game rules, no mod loader needed.'
	}
];

const BY_ID = new Map(PROJECT_TYPES.map((t) => [t.id, t]));
const BY_PATH = new Map(PROJECT_TYPES.map((t) => [t.path, t]));

export const typeInfo = (id: ProjectType): ProjectTypeInfo => BY_ID.get(id)!;
export const typeFromPath = (path: string): ProjectTypeInfo | null => BY_PATH.get(path) ?? null;
export const isProjectType = (value: string): value is ProjectType =>
	BY_ID.has(value as ProjectType);

export const LOADER_NAMES: Record<Loader, string> = {
	iris: 'Iris',
	optifine: 'OptiFine',
	fabric: 'Fabric',
	forge: 'Forge',
	neoforge: 'NeoForge',
	quilt: 'Quilt'
};

export const isLoaderFor = (type: ProjectType, loader: string): loader is Loader =>
	(typeInfo(type).loaders as string[]).includes(loader);

export type CategoryGroup = 'categories' | 'features' | 'resolution' | 'performance';

export const GROUP_NAMES: Record<CategoryGroup, string> = {
	categories: 'Categories',
	features: 'Features',
	resolution: 'Resolution',
	performance: 'Performance'
};

export interface CategoryDef {
	slug: string;
	name: string;
	group: CategoryGroup;
}

const group = (g: CategoryGroup, names: string[]): CategoryDef[] =>
	names.map((name) => ({
		slug: name
			.toLowerCase()
			.replace(/\+/g, '-plus')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, ''),
		name,
		group: g
	}));

export const DEFAULT_CATEGORIES: Record<ProjectType, CategoryDef[]> = {
	shader: [
		...group('categories', [
			'Cartoon',
			'Cursed',
			'Fantasy',
			'Realistic',
			'Semi-realistic',
			'Vanilla-like'
		]),
		...group('features', [
			'Atmosphere',
			'Bloom',
			'Coloured lighting',
			'Foliage',
			'Path tracing',
			'PBR',
			'Reflections',
			'Shadows',
			'Volumetric clouds',
			'Water'
		]),
		...group('performance', ['Potato', 'Low', 'Medium', 'High', 'Screenshot'])
	],
	resourcepack: [
		...group('categories', [
			'Cartoon',
			'Combat',
			'Decoration',
			'Fantasy',
			'Medieval',
			'Modern',
			'Realistic',
			'Simplistic',
			'Themed',
			'Vanilla-like'
		]),
		...group('features', [
			'Audio',
			'Blocks',
			'Connected textures',
			'Core shaders',
			'Emissive textures',
			'Entities',
			'Environment',
			'Equipment',
			'Fonts',
			'GUI',
			'Items',
			'Models',
			'PBR (LabPBR)'
		]),
		...group('resolution', ['8x or lower', '16x', '32x', '48x', '64x', '128x', '256x', '512x+'])
	],
	mod: [
		...group('categories', [
			'Adventure',
			'Cursed',
			'Decoration',
			'Economy',
			'Equipment',
			'Food',
			'Game mechanics',
			'Library',
			'Magic',
			'Management',
			'Minigame',
			'Mobs',
			'Optimisation',
			'Social',
			'Storage',
			'Technology',
			'Transportation',
			'Utility',
			'World generation'
		]),
		...group('features', ['Client-side', 'Server-side'])
	],
	datapack: [
		...group('categories', [
			'Adventure',
			'Decoration',
			'Equipment',
			'Food',
			'Game mechanics',
			'Magic',
			'Minigame',
			'Mobs',
			'Technology',
			'Utility',
			'World generation'
		])
	]
};

export interface LicenseInfo {
	id: string;
	name: string;
	open: boolean;
}

/** Common licences by SPDX ID, plus "All rights reserved" and a custom licence (with a link). */
export const LICENSES: LicenseInfo[] = [
	{ id: 'MIT', name: 'MIT', open: true },
	{ id: 'Apache-2.0', name: 'Apache 2.0', open: true },
	{ id: 'GPL-3.0-only', name: 'GPL 3.0', open: true },
	{ id: 'GPL-3.0-or-later', name: 'GPL 3.0 or later', open: true },
	{ id: 'LGPL-3.0-only', name: 'LGPL 3.0', open: true },
	{ id: 'MPL-2.0', name: 'Mozilla Public License 2.0', open: true },
	{ id: 'CC0-1.0', name: 'CC0 (public domain)', open: true },
	{ id: 'CC-BY-4.0', name: 'CC BY 4.0', open: true },
	{ id: 'CC-BY-SA-4.0', name: 'CC BY-SA 4.0', open: true },
	{ id: 'CC-BY-NC-4.0', name: 'CC BY-NC 4.0', open: false },
	{ id: 'CC-BY-NC-SA-4.0', name: 'CC BY-NC-SA 4.0', open: false },
	{ id: 'CC-BY-NC-ND-4.0', name: 'CC BY-NC-ND 4.0', open: false },
	{ id: 'ARR', name: 'All rights reserved', open: false },
	{ id: 'custom', name: 'Custom licence', open: false }
];

const LICENSE_BY_ID = new Map(LICENSES.map((l) => [l.id, l]));
export const licenseInfo = (id: string): LicenseInfo | null => LICENSE_BY_ID.get(id) ?? null;
export const isOpenSource = (id: string): boolean => LICENSE_BY_ID.get(id)?.open ?? false;

/** Project addresses: /marketplace/shaders/complementary-reimagined */
export function slugify(name: string): string {
	return name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48)
		.replace(/-+$/, '');
}

const RESERVED_SLUGS = new Set(['new', 'create', 'edit', 'settings', 'search', 'random', 'admin']);

export function slugProblem(slug: string): string | null {
	if (slug.length < 3 || slug.length > 48) return 'Use 3 to 48 characters.';
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
		return 'Use lowercase letters, numbers and single dashes.';
	if (RESERVED_SLUGS.has(slug)) return 'That address is reserved.';
	return null;
}

export const projectPath = (type: ProjectType, slug: string) =>
	`/marketplace/${typeInfo(type).path}/${slug}`;
