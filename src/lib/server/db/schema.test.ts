import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { connectionOptions, type Database } from './index.ts';
import { projects, users } from './schema.ts';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

describe('the migrated database', () => {
	it('keeps usernames and emails unique whatever their case', async () => {
		await db
			.insert(users)
			.values({ id: 'u1', username: 'Steve', displayName: 'Steve', email: 'A@x.org' });

		await expect(
			db.insert(users).values({ id: 'u2', username: 'steve', displayName: 'x' })
		).rejects.toThrow();
		await expect(
			db.insert(users).values({ id: 'u3', displayName: 'x', email: 'a@X.org' })
		).rejects.toThrow();
	});

	it('builds a weighted search vector from the name, summary and description', async () => {
		await db.insert(projects).values({
			id: 'p1',
			slug: 'Complementary',
			type: 'shader',
			name: 'Complementary Reimagined',
			summary: 'Soft volumetric clouds and water'
		});

		const [hit] = await db
			.select({ id: projects.id })
			.from(projects)
			.where(sql`${projects.search} @@ websearch_to_tsquery('english', 'clouds')`);
		expect(hit?.id).toBe('p1');

		const [fuzzy] = await db
			.select({ score: sql<number>`word_similarity('complementery', lower(${projects.name}))` })
			.from(projects)
			.where(eq(projects.id, 'p1'));
		expect(fuzzy!.score).toBeGreaterThan(0.4);
	});

	it('keeps project slugs unique whatever their case', async () => {
		await expect(
			db.insert(projects).values({ id: 'p2', slug: 'complementary', type: 'mod', name: 'x' })
		).rejects.toThrow();
	});
});

describe('connectionOptions', () => {
	it('passes ordinary URLs through', () => {
		expect(connectionOptions('postgres://u:p@localhost:5432/db')).toEqual({
			url: 'postgres://u:p@localhost:5432/db'
		});
	});

	it('turns ?host=/path into a Unix socket connection for peer authentication', () => {
		expect(
			connectionOptions('postgres://vibelabs-web@localhost/vibelabs_web?host=/var/run/postgresql')
		).toEqual({
			url: 'postgres://vibelabs-web@localhost/vibelabs_web',
			host: '/var/run/postgresql'
		});
	});
});
