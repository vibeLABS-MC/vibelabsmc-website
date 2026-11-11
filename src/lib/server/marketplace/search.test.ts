import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { gallery, projectMembers, projects } from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import { DEFAULT_QUERY, type SearchQuery } from '../../marketplace/search.ts';
import { searchProjects } from './search.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
	const owner = await makeUser(db, { username: 'sora', displayName: 'Sora' });
	const add = async (values: Partial<typeof projects.$inferInsert> & { name: string }) => {
		const id = newId();
		await db.insert(projects).values({
			id,
			slug: values.name.toLowerCase().replace(/\W+/g, '-'),
			type: 'shader',
			status: 'approved',
			publishedAt: new Date('2026-01-01'),
			...values
		});
		await db
			.insert(projectMembers)
			.values({ projectId: id, userId: owner.id, role: 'owner', acceptedAt: new Date() });
		return id;
	};
	const complementary = await add({
		name: 'Complementary Reimagined',
		summary: 'Soft volumetric clouds and calm water',
		categories: ['realistic', 'water'],
		loaders: ['iris', 'optifine'],
		gameVersions: ['1.21.4', '1.20.1'],
		downloads: 5000,
		follows: 40,
		ratingSum: 45,
		ratingCount: 10,
		license: 'ARR',
		latestVersionAt: new Date('2026-02-01')
	});
	await add({
		name: 'BSL Shaders',
		summary: 'Bright, colourful and fast',
		categories: ['vanilla-like', 'shadows'],
		loaders: ['iris', 'optifine'],
		gameVersions: ['1.21.4'],
		downloads: 9000,
		follows: 10,
		ratingSum: 5,
		ratingCount: 1,
		license: 'MIT',
		publishedAt: new Date('2026-03-01')
	});
	await add({
		name: 'Rethinking Voxels',
		summary: 'Path traced coloured lighting',
		categories: ['realistic', 'path-tracing'],
		loaders: ['iris'],
		gameVersions: ['1.20.1'],
		downloads: 100,
		follows: 90,
		license: 'GPL-3.0-only'
	});
	await add({ name: 'Draft Pack', status: 'draft', summary: 'not public' });
	await add({
		name: 'Faithful',
		type: 'resourcepack',
		summary: 'The classic look at 32x',
		categories: ['32x']
	});
	await db.insert(gallery).values({
		id: newId(),
		projectId: complementary,
		imageKey: 'b'.repeat(64),
		width: 10,
		height: 10,
		featured: true
	});
});
afterAll(() => close());

const search = (q: Partial<SearchQuery>, type: 'shader' | 'resourcepack' | null = 'shader') =>
	searchProjects(db, type, { ...DEFAULT_QUERY, ...q });
const names = async (q: Partial<SearchQuery>, type: 'shader' | 'resourcepack' | null = 'shader') =>
	(await search(q, type)).hits.map((h) => h.name);

describe('searchProjects', () => {
	it('lists only approved projects of the type, most downloaded first', async () => {
		expect(await names({})).toEqual([
			'BSL Shaders',
			'Complementary Reimagined',
			'Rethinking Voxels'
		]);
		expect(await names({}, 'resourcepack')).toEqual(['Faithful']);
		expect((await names({}, null)).length).toBe(4);
	});

	it('finds words in the summary and survives typos in the name', async () => {
		expect(await names({ q: 'clouds' })).toEqual(['Complementary Reimagined']);
		expect(await names({ q: 'complementery' })).toEqual(['Complementary Reimagined']);
		expect(await names({ q: 'rethinking' })).toEqual(['Rethinking Voxels']);
		expect(await names({ q: 'nothing like this' })).toEqual([]);
	});

	it('filters by version, loader, every chosen category and open licences', async () => {
		expect(await names({ versions: ['1.20.1'] })).toEqual([
			'Complementary Reimagined',
			'Rethinking Voxels'
		]);
		expect(await names({ loaders: ['optifine'] })).toEqual([
			'BSL Shaders',
			'Complementary Reimagined'
		]);
		expect(await names({ categories: ['realistic', 'water'] })).toEqual([
			'Complementary Reimagined'
		]);
		expect(await names({ openSource: true })).toEqual(['BSL Shaders', 'Rethinking Voxels']);
	});

	it('sorts six ways', async () => {
		expect((await names({ sort: 'follows' }))[0]).toBe('Rethinking Voxels');
		expect((await names({ sort: 'rating' }))[0]).toBe('Complementary Reimagined');
		expect((await names({ sort: 'newest' }))[0]).toBe('BSL Shaders');
		expect((await names({ sort: 'updated' }))[0]).toBe('BSL Shaders');
		expect((await names({ sort: 'downloads' }))[0]).toBe('BSL Shaders');
	});

	it('counts each filter value with the other filters applied', async () => {
		const { facets, total } = await search({ loaders: ['optifine'] });

		expect(total).toBe(2);
		expect(facets.loaders).toEqual({ iris: 3, optifine: 2 });
		expect(facets.categories).toMatchObject({ realistic: 1, water: 1, shadows: 1 });
		expect(facets.versions).toEqual({ '1.21.4': 2, '1.20.1': 1 });
	});

	it('returns cards with the owner, the featured screenshot and the last update', async () => {
		const [card] = (await search({ q: 'clouds' })).hits;

		expect(card).toMatchObject({
			slug: 'complementary-reimagined',
			bannerKey: 'b'.repeat(64),
			author: { username: 'sora', displayName: 'Sora' },
			updatedAt: new Date('2026-02-01')
		});
	});

	it('pages through results', async () => {
		expect((await search({ page: 2 })).hits).toEqual([]);
	});
});
