import { describe, expect, it } from 'vitest';
import {
	DEFAULT_CATEGORIES,
	PROJECT_TYPES,
	isLoaderFor,
	isOpenSource,
	isProjectType,
	licenseInfo,
	projectPath,
	slugify,
	slugProblem,
	typeFromPath,
	typeInfo
} from './taxonomy.ts';

describe('project types', () => {
	it('has the four sections at their own addresses', () => {
		expect(PROJECT_TYPES.map((t) => `${t.id}:${t.path}`)).toEqual([
			'shader:shaders',
			'resourcepack:texture-packs',
			'mod:mods',
			'datapack:data-packs'
		]);
		expect(typeFromPath('texture-packs')?.id).toBe('resourcepack');
		expect(typeFromPath('plugins')).toBeNull();
		expect(typeInfo('mod').name).toBe('Mods');
		expect(isProjectType('shader')).toBe(true);
		expect(isProjectType('plugin')).toBe(false);
	});

	it('knows which loaders each type can declare', () => {
		expect(isLoaderFor('shader', 'iris')).toBe(true);
		expect(isLoaderFor('shader', 'fabric')).toBe(false);
		expect(isLoaderFor('mod', 'neoforge')).toBe(true);
		expect(isLoaderFor('resourcepack', 'iris')).toBe(false);
		expect(typeInfo('datapack').loaders).toEqual([]);
	});

	it('builds the project address from its type and slug', () => {
		expect(projectPath('resourcepack', 'faithful')).toBe('/marketplace/texture-packs/faithful');
	});
});

describe('default categories', () => {
	it('gives every category a unique, URL-safe slug within its type', () => {
		for (const [type, list] of Object.entries(DEFAULT_CATEGORIES)) {
			const slugs = list.map((c) => c.slug);
			expect(new Set(slugs).size, type).toBe(slugs.length);
			for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		}
	});

	it('turns names into slugs, keeping meaning in symbols', () => {
		const resolution = DEFAULT_CATEGORIES.resourcepack.filter((c) => c.group === 'resolution');
		expect(resolution.map((c) => c.slug)).toContain('512x-plus');
		expect(DEFAULT_CATEGORIES.resourcepack.find((c) => c.name === 'PBR (LabPBR)')?.slug).toBe(
			'pbr-labpbr'
		);
		expect(
			DEFAULT_CATEGORIES.shader.filter((c) => c.group === 'performance').map((c) => c.slug)
		).toEqual(['potato', 'low', 'medium', 'high', 'screenshot']);
	});
});

describe('licences', () => {
	it('knows which licences are open source', () => {
		expect(isOpenSource('MIT')).toBe(true);
		expect(isOpenSource('CC-BY-NC-4.0')).toBe(false);
		expect(isOpenSource('ARR')).toBe(false);
		expect(isOpenSource('WTFPL')).toBe(false);
		expect(licenseInfo('GPL-3.0-only')?.name).toBe('GPL 3.0');
		expect(licenseInfo('nope')).toBeNull();
	});
});

describe('slugs', () => {
	it('makes a slug from a project name', () => {
		expect(slugify('Complementary Shaders – Reimagined!')).toBe('complementary-shaders-reimagined');
		expect(slugify('  Ångström PBR  ')).toBe('angstrom-pbr');
		expect(slugify('x'.repeat(60))).toHaveLength(48);
		expect(slugify(`${'a'.repeat(47)} b`)).toBe('a'.repeat(47));
	});

	it('explains what is wrong with a slug', () => {
		expect(slugProblem('bsl-shaders')).toBeNull();
		expect(slugProblem('ab')).toBe('Use 3 to 48 characters.');
		expect(slugProblem('a'.repeat(49))).toBe('Use 3 to 48 characters.');
		expect(slugProblem('BSL')).toBe('Use lowercase letters, numbers and single dashes.');
		expect(slugProblem('bsl--x')).toBe('Use lowercase letters, numbers and single dashes.');
		expect(slugProblem('-bsl')).toBe('Use lowercase letters, numbers and single dashes.');
		expect(slugProblem('new')).toBe('That address is reserved.');
	});
});
