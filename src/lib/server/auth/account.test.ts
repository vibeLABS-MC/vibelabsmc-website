import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import {
	collectionProjects,
	collections,
	follows,
	projectMembers,
	projects,
	reviews
} from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import { recountProjects } from '../marketplace/stats.ts';
import { deleteAccount, exportAccount } from './account.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

async function project(ownerId: string, name = 'Pack') {
	const id = newId();
	await db.insert(projects).values({ id, slug: `p-${id}`, type: 'shader', name });
	await db
		.insert(projectMembers)
		.values({ projectId: id, userId: ownerId, role: 'owner', acceptedAt: new Date() });
	return id;
}

describe('deleteAccount', () => {
	it('removes the account and the projects it owns, but not projects it only helped with', async () => {
		const leaving = await makeUser(db);
		const other = await makeUser(db);
		const own = await project(leaving.id);
		const shared = await project(other.id);
		await db
			.insert(projectMembers)
			.values({ projectId: shared, userId: leaving.id, role: 'maintainer' });

		expect(await deleteAccount(db, leaving.id)).toEqual({ deletedProjects: [own] });
		expect(await db.select().from(projects).where(eq(projects.id, own))).toEqual([]);
		expect(await db.select().from(projects).where(eq(projects.id, shared))).toHaveLength(1);
		expect(
			await db.select().from(projectMembers).where(eq(projectMembers.projectId, shared))
		).toHaveLength(1);
	});

	it('takes its reviews and follows off other projects and fixes their counts', async () => {
		const leaving = await makeUser(db);
		const staying = await makeUser(db);
		const target = await project(staying.id);
		await db.insert(reviews).values([
			{ id: newId(), projectId: target, userId: leaving.id, rating: 1, body: 'meh' },
			{ id: newId(), projectId: target, userId: staying.id, rating: 5, body: 'great' }
		]);
		await db.insert(follows).values([
			{ userId: leaving.id, projectId: target },
			{ userId: staying.id, projectId: target }
		]);
		await recountProjects(db, [target]);
		const [before] = await db.select().from(projects).where(eq(projects.id, target));
		expect(before).toMatchObject({ follows: 2, ratingSum: 6, ratingCount: 2 });

		await deleteAccount(db, leaving.id);
		const [after] = await db.select().from(projects).where(eq(projects.id, target));
		expect(after).toMatchObject({ follows: 1, ratingSum: 5, ratingCount: 1 });
	});
});

describe('recountProjects', () => {
	it('does nothing for no projects, and ignores hidden reviews', async () => {
		await recountProjects(db, []);
		const owner = await makeUser(db);
		const id = await project(owner.id);
		await db.insert(reviews).values({
			id: newId(),
			projectId: id,
			userId: owner.id,
			rating: 2,
			body: 'x',
			status: 'hidden'
		});

		await recountProjects(db, [id, id]);
		const [row] = await db.select().from(projects).where(eq(projects.id, id));
		expect(row).toMatchObject({ ratingSum: 0, ratingCount: 0, follows: 0 });
	});
});

describe('exportAccount', () => {
	it('gathers the profile, projects, reviews, collections and follows, without secrets', async () => {
		const user = await makeUser(db, {
			email: 'me@x.org',
			passwordHash: '$argon2id$secret',
			totpSecret: 'v1.sealed'
		});
		const id = await project(user.id, 'My Pack');
		await db
			.insert(reviews)
			.values({ id: newId(), projectId: id, userId: user.id, rating: 4, body: 'ok' });
		await db.insert(follows).values({ userId: user.id, projectId: id });
		const collectionId = newId();
		await db.insert(collections).values({ id: collectionId, ownerId: user.id, name: 'Favourites' });
		await db.insert(collectionProjects).values({ collectionId, projectId: id });

		const data = await exportAccount(db, user.id);
		expect(data?.profile).toMatchObject({ id: user.id, email: 'me@x.org' });
		expect(data?.signInMethods.password).toBe(true);
		expect(data?.projects).toEqual([
			{ project: 'My Pack', slug: expect.any(String), role: 'owner' }
		]);
		expect(data?.reviews).toMatchObject([{ project: 'My Pack', rating: 4 }]);
		expect(data?.collections).toMatchObject([{ name: 'Favourites', projects: ['My Pack'] }]);
		expect(data?.follows).toMatchObject([{ project: 'My Pack' }]);
		expect(JSON.stringify(data)).not.toMatch(/argon2|v1\.sealed/);
		expect(await exportAccount(db, 'missing')).toBeNull();
	});
});
