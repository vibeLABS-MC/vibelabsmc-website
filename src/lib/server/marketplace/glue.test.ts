/** The helpers routes use to load and change projects, tested against a real database. */
import { eq } from 'drizzle-orm';
import { strToU8, zipSync } from 'fflate';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import {
	EICAR,
	fakeClamd,
	locals,
	session,
	sessionUser,
	testConfig,
	thrown
} from '../../../../tests/helpers/locals.ts';
import { moderate } from '../admin/actions.ts';
import type { Database } from '../db/index.ts';
import {
	files,
	gameVersions,
	projectMembers,
	projects,
	stagedFiles,
	versions
} from '../db/schema.ts';
import { cleanup, rescanPending, versionsIfEmpty } from '../jobs.ts';
import type { Runtime } from '../runtime.ts';
import { newId } from '../security/crypto.ts';
import { filePath, stagedPath } from '../uploads/receive.ts';
import { editableProject } from './editor.ts';
import { loadProjectPage } from './page.ts';

let db: Database;
let close: () => Promise<void>;
const storage = mkdtempSync(join(tmpdir(), 'glue-'));
let clamd: Awaited<ReturnType<typeof fakeClamd>>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
	clamd = await fakeClamd();
});
afterAll(async () => {
	await close();
	clamd.close();
	rmSync(storage, { recursive: true, force: true });
});

async function project(ownerId: string, status: 'approved' | 'draft' | 'in_review' = 'approved') {
	const id = newId();
	await db.insert(projects).values({ id, slug: `p-${id}`, type: 'shader', name: 'Glow', status });
	await db
		.insert(projectMembers)
		.values({ projectId: id, userId: ownerId, role: 'owner', acceptedAt: new Date() });
	return { id, slug: `p-${id}` };
}
const cookies = { get: () => undefined } as never;
const asUser = (user: { id: string; username: string | null }, values = {}) =>
	locals({
		db,
		user: sessionUser({ id: user.id, username: user.username, ...values }),
		session: session({ userId: user.id, twoFactorVerified: true })
	});

describe('editableProject', () => {
	it('lets the team in and turns everyone else away', async () => {
		const owner = await makeUser(db);
		const other = await makeUser(db);
		const { id } = await project(owner.id);

		expect((await editableProject(asUser(owner), id)).role).toBe('owner');
		expect((await thrown(() => editableProject(asUser(other), id))).status).toBe(404);
		expect((await thrown(() => editableProject(asUser(owner), 'missing'))).status).toBe(404);
		expect((await thrown(() => editableProject(locals({ db }), id))).location).toBe('/login');
	});

	it('keeps owner-only actions to the owner', async () => {
		const owner = await makeUser(db);
		const helper = await makeUser(db);
		const { id } = await project(owner.id);
		await db
			.insert(projectMembers)
			.values({ projectId: id, userId: helper.id, role: 'maintainer', acceptedAt: new Date() });

		expect((await editableProject(asUser(helper), id)).role).toBe('maintainer');
		expect((await thrown(() => editableProject(asUser(helper), id, 'owner'))).status).toBe(403);
		expect((await editableProject(asUser(owner), id, 'owner')).role).toBe('owner');
	});
});

describe('loadProjectPage', () => {
	it('shows a public project to anyone, with its team and versions', async () => {
		const owner = await makeUser(db, { username: 'glow-owner' });
		const { slug } = await project(owner.id);

		const page = await loadProjectPage(locals({ db }), { type: 'shaders', slug }, cookies);
		expect(page.project.name).toBe('Glow');
		expect(page.members.map((m) => m.username)).toEqual(['glow-owner']);
		expect(page).toMatchObject({
			role: null,
			staff: false,
			following: false,
			signedIn: false,
			collections: []
		});
		expect('search' in page.project).toBe(false);
	});

	it('hides drafts from strangers but not from the team or staff', async () => {
		const owner = await makeUser(db);
		const stranger = await makeUser(db);
		const { slug } = await project(owner.id, 'draft');

		expect(
			(await thrown(() => loadProjectPage(locals({ db }), { type: 'shaders', slug }, cookies)))
				.status
		).toBe(404);
		expect(
			(await thrown(() => loadProjectPage(asUser(stranger), { type: 'shaders', slug }, cookies)))
				.status
		).toBe(404);
		expect((await loadProjectPage(asUser(owner), { type: 'shaders', slug }, cookies)).role).toBe(
			'owner'
		);
		expect(
			(
				await loadProjectPage(
					asUser(stranger, { role: 'moderator' }),
					{ type: 'shaders', slug },
					cookies
				)
			).staff
		).toBe(true);
	});

	it('404s an unknown section or project', async () => {
		expect(
			(await thrown(() => loadProjectPage(locals({ db }), { type: 'plugins', slug: 'x' }, cookies)))
				.status
		).toBe(404);
		expect(
			(await thrown(() => loadProjectPage(locals({ db }), { type: 'mods', slug: 'nope' }, cookies)))
				.status
		).toBe(404);
	});
});

describe('moderate', () => {
	const form = (values: Record<string, string>) => {
		const data = new FormData();
		for (const [k, v] of Object.entries(values)) data.append(k, v);
		return data;
	};

	it('applies a decision, or explains why not', async () => {
		const owner = await makeUser(db);
		const mod = await makeUser(db, { role: 'moderator' });
		const { id } = await project(owner.id, 'in_review');
		const staff = asUser(mod, { role: 'moderator', totpEnabled: true });

		expect(await moderate(staff, form({ project: id, decision: 'nuke' }))).toMatchObject({
			status: 400,
			data: { message: 'Unknown decision.' }
		});
		expect(await moderate(staff, form({ project: id, decision: 'reject' }))).toMatchObject({
			status: 400,
			data: { message: 'Write a message: the team needs to know why.' }
		});
		expect(await moderate(staff, form({ project: id, decision: 'approve' }))).toEqual({
			decided: 'approve'
		});
		expect(await moderate(staff, form({ project: id, decision: 'approve' }))).toMatchObject({
			status: 400
		});
		expect(
			(await thrown(() => moderate(asUser(owner), form({ project: id, decision: 'approve' }))))
				.status
		).toBe(404);
	});
});

describe('background jobs', () => {
	const runtime = (clamdTarget: string | null) =>
		({
			db,
			config: testConfig({ STORAGE_DIR: storage, ...(clamdTarget ? { CLAMD: clamdTarget } : {}) })
		}) as unknown as Runtime;

	async function pendingFile(content: string) {
		const owner = await makeUser(db);
		const { id } = await project(owner.id);
		const versionId = newId();
		await db.insert(versions).values({
			id: versionId,
			projectId: id,
			versionNumber: newId(4),
			name: 'v',
			gameVersions: [],
			loaders: []
		});
		const bytes = Buffer.from(zipSync({ 'shaders/a.fsh': strToU8(content) }, { level: 0 }));
		const sha512 = newId(64).padEnd(128, '0');
		const path = filePath(storage, sha512);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, bytes);
		const fileId = newId();
		await db.insert(files).values({
			id: fileId,
			versionId,
			filename: 'a.zip',
			size: bytes.length,
			sha1: 'x',
			sha512,
			scanStatus: 'pending'
		});
		return { fileId, projectId: id, ownerId: owner.id, bytes };
	}

	it('rescans files the scanner missed, published or staged', async () => {
		const clean = await pendingFile('fine');
		const dirty = await pendingFile(EICAR);
		const stagedId = newId(16);
		mkdirSync(join(storage, 'tmp'), { recursive: true });
		writeFileSync(stagedPath(storage, stagedId), clean.bytes);
		await db.insert(stagedFiles).values({
			id: stagedId,
			userId: clean.ownerId,
			projectId: clean.projectId,
			filename: 's.zip',
			size: 1,
			sha1: 'x',
			sha512: 'y',
			scanStatus: 'pending'
		});

		expect(await rescanPending(runtime(null))).toBe(0);
		expect(await rescanPending(runtime(clamd.target))).toBe(3);
		const status = async (id: string) =>
			(await db.select({ s: files.scanStatus }).from(files).where(eq(files.id, id)))[0]!.s;
		expect(await status(clean.fileId)).toBe('clean');
		expect(await status(dirty.fileId)).toBe('infected');
		expect(
			(
				await db
					.select({ s: stagedFiles.scanStatus })
					.from(stagedFiles)
					.where(eq(stagedFiles.id, stagedId))
			)[0]!.s
		).toBe('clean');
	});

	it('loads Minecraft versions only when there are none', async () => {
		const manifest = {
			versions: [{ id: '1.21.4', type: 'release', releaseTime: '2024-12-03T00:00:00Z' }]
		};
		const fetchMock = vi.fn(async () => new Response(JSON.stringify(manifest)));
		vi.stubGlobal('fetch', fetchMock);
		try {
			await db.delete(gameVersions);
			await versionsIfEmpty(runtime(null));
			await versionsIfEmpty(runtime(null));
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect((await db.select().from(gameVersions)).map((v) => v.version)).toEqual(['1.21.4']);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('cleans up without touching live data', async () => {
		await expect(cleanup(runtime(null))).resolves.toBeUndefined();
	});
});
