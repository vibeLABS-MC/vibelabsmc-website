import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import type { Database } from '../db/index.ts';
import { gameVersions, projects } from '../db/schema.ts';
import { readDependencies, readVersionFields, versionNumberProblem } from './version-form.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
	await db.insert(gameVersions).values([
		{ version: '1.21.4', kind: 'release', releasedAt: new Date('2024-12-03') },
		{ version: '1.20.1', kind: 'release', releasedAt: new Date('2023-06-12') }
	]);
	await db.insert(projects).values([
		{ id: 'lib', slug: 'lib', type: 'mod', name: 'Lib', status: 'approved' },
		{ id: 'draft', slug: 'draft', type: 'mod', name: 'Draft' }
	]);
});
afterAll(() => close());

const form = (entries: [string, string][]) => {
	const data = new FormData();
	for (const [k, v] of entries) data.append(k, v);
	return data;
};

describe('versionNumberProblem', () => {
	it('accepts semantic and odd but common version numbers', () => {
		for (const v of ['1.0.0', 'v2.1-beta.3', '1.21.4+fabric', 'r8_final'])
			expect(versionNumberProblem(v)).toBeNull();
		expect(versionNumberProblem('')).toBe('Use a version number of 1 to 32 characters.');
		expect(versionNumberProblem('1'.repeat(33))).toBe(
			'Use a version number of 1 to 32 characters.'
		);
		expect(versionNumberProblem('1.0 final')).toMatch(/^Use letters/);
	});
});

describe('readVersionFields', () => {
	it('reads a valid form, keeping only known Minecraft versions and loaders for the type', async () => {
		const result = await readVersionFields(
			db,
			'shader',
			form([
				['channel', 'beta'],
				['gameVersions', '1.21.4'],
				['gameVersions', '9.9'],
				['loaders', 'iris'],
				['loaders', 'fabric'],
				['changelog', 'x']
			]),
			'Glow 2'
		);

		expect(result).toEqual({
			name: 'Glow 2',
			changelog: 'x',
			channel: 'beta',
			gameVersions: ['1.21.4'],
			loaders: ['iris']
		});
	});

	it('explains what is missing', async () => {
		expect(await readVersionFields(db, 'shader', form([['channel', 'nightly']]), 'n')).toEqual({
			problem: 'Choose release, beta or alpha.'
		});
		expect(await readVersionFields(db, 'shader', form([['channel', 'release']]), 'n')).toEqual({
			problem: 'Choose at least one Minecraft version.'
		});
		expect(
			await readVersionFields(
				db,
				'shader',
				form([
					['channel', 'release'],
					['gameVersions', '1.20.1']
				]),
				'n'
			)
		).toEqual({ problem: 'Choose at least one loader.' });
		expect(
			await readVersionFields(
				db,
				'shader',
				form([
					['channel', 'release'],
					['changelog', 'x'.repeat(20001)]
				]),
				'n'
			)
		).toEqual({ problem: 'Keep the changelog under 20,000 characters.' });
	});

	it('needs no loader for texture packs and data packs', async () => {
		const result = await readVersionFields(
			db,
			'datapack',
			form([
				['channel', 'release'],
				['gameVersions', '1.20.1'],
				['loaders', 'iris']
			]),
			'Pack 1'
		);
		expect(result).toMatchObject({ loaders: [], gameVersions: ['1.20.1'] });
	});
});

describe('readDependencies', () => {
	it('keeps dependencies on approved projects with a known kind', async () => {
		const deps = await readDependencies(
			db,
			form([
				['dependency', 'lib:required'],
				['dependency', 'draft:optional'],
				['dependency', 'lib:bogus'],
				['dependency', 'nope']
			])
		);
		expect(deps).toEqual([{ projectId: 'lib', kind: 'required' }]);
		expect(await readDependencies(db, form([]))).toEqual([]);
	});
});
