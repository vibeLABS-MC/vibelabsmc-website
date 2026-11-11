import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import type { Database } from '../db/index.ts';
import {
	listCategories,
	listGameVersions,
	seedCategories,
	syncGameVersions,
	upsertCategory,
	validCategories,
	validGameVersions
} from './catalog.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

const manifest = {
	versions: [
		{ id: '25w02a', type: 'snapshot', releaseTime: '2025-01-08T00:00:00+00:00' },
		{ id: '1.21.4', type: 'release', releaseTime: '2024-12-03T00:00:00+00:00' },
		{ id: '1.21', type: 'release', releaseTime: '2024-06-13T00:00:00+00:00' },
		{ id: '1.20.1', type: 'release', releaseTime: '2023-06-12T00:00:00+00:00' },
		{ id: 'b1.7.3', type: 'old_beta', releaseTime: '2011-07-08T00:00:00+00:00' }
	]
};
const reply = (body: unknown, status = 200) =>
	vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe('categories', () => {
	it('seeds the defaults once, keeps admin edits, and hides hidden ones', async () => {
		await seedCategories(db);
		const shaders = await listCategories(db, 'shader');
		expect(shaders.map((c) => c.slug)).toContain('path-tracing');

		await upsertCategory(db, {
			projectType: 'shader',
			slug: 'cursed',
			group: 'categories',
			name: 'Weird',
			hidden: true
		});
		await seedCategories(db);
		expect((await listCategories(db, 'shader')).map((c) => c.slug)).not.toContain('cursed');
		const all = await listCategories(db, 'shader', true);
		expect(all.find((c) => c.slug === 'cursed')?.name).toBe('Weird');

		await upsertCategory(db, {
			projectType: 'shader',
			slug: 'neon',
			group: 'categories',
			name: 'Neon',
			hidden: false
		});
		expect((await listCategories(db, 'shader')).map((c) => c.slug)).toContain('neon');
	});

	it('keeps only known, visible categories, at most eight', async () => {
		await seedCategories(db);
		expect(
			await validCategories(db, 'shader', ['shadows', 'shadows', 'fake', 'cursed', 'water'])
		).toEqual(['shadows', 'water']);
		expect(await validCategories(db, 'mod', ['shadows'])).toEqual([]);
		const many = (await listCategories(db, 'mod')).map((c) => c.slug);
		expect(await validCategories(db, 'mod', many)).toHaveLength(8);
	});
});

describe('Minecraft versions', () => {
	it('adds only releases from Mojang, newest first, without duplicates', async () => {
		expect(await syncGameVersions(db, reply(manifest), 'https://m')).toBe(3);
		expect(await syncGameVersions(db, reply(manifest), 'https://m')).toBe(0);
		expect((await listGameVersions(db)).map((v) => v.version)).toEqual([
			'1.21.4',
			'1.21',
			'1.20.1'
		]);
	});

	it('fails loudly when Mojang is down, and handles an empty list', async () => {
		await expect(syncGameVersions(db, reply({}, 503), 'https://m')).rejects.toThrow('503');
		expect(await syncGameVersions(db, reply({ versions: [] }), 'https://m')).toBe(0);
	});

	it('keeps only versions that exist', async () => {
		await syncGameVersions(db, reply(manifest), 'https://m');
		expect(await validGameVersions(db, ['1.20.1', '9.9', '1.21.4'])).toEqual(['1.21.4', '1.20.1']);
		expect(await validGameVersions(db, [])).toEqual([]);
	});
});
