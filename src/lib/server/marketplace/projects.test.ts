import { eq } from 'drizzle-orm';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import { listNotifications } from '../community/notifications.ts';
import type { Database } from '../db/index.ts';
import { follows, projects, stagedFiles } from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import { filePath, stagedPath } from '../uploads/receive.ts';
import {
	answerInvite,
	canView,
	createProject,
	deleteProject,
	getProject,
	getProjectBySlug,
	inviteMember,
	listMembers,
	memberRole,
	missingForReview,
	removeMember,
	setIcon,
	submitForReview,
	transferOwnership,
	updateDescription,
	updateDetails,
	userProjects,
	withdrawSubmission
} from './projects.ts';
import {
	cleanupStaged,
	deleteVersion,
	discardStaged,
	DownloadCounter,
	downloadHistory,
	getVersion,
	listStaged,
	listVersions,
	publishVersion,
	recordDownload,
	resolveDownload,
	setVersionStatus,
	stageFile,
	updateVersion
} from './releases.ts';

let db: Database;
let close: () => Promise<void>;
const storage = mkdtempSync(join(tmpdir(), 'storage-'));
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(async () => {
	await close();
	rmSync(storage, { recursive: true, force: true });
});

async function newProject(ownerId: string, slug = `p-${newId(6)}`) {
	const made = await createProject(db, {
		ownerId,
		type: 'shader',
		name: 'Glow',
		slug,
		summary: 'Soft glowing shaders'
	});
	if (!('project' in made)) throw new Error('slug taken');
	return made.project;
}

async function staged(
	projectId: string,
	userId: string,
	scanStatus: 'clean' | 'infected' | 'review' = 'clean'
) {
	const id = newId();
	const path = stagedPath(storage, id);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `bytes-${id}`);
	return stageFile(db, {
		id,
		userId,
		projectId,
		filename: `glow-${id}.zip`,
		size: 10,
		sha1: 'a'.repeat(40),
		sha512: id.padEnd(128, 'f'),
		scanStatus,
		scanDetail: null,
		detected: {}
	});
}

describe('projects', () => {
	it('creates a draft owned by its creator, with a unique slug in any case', async () => {
		const owner = await makeUser(db);
		const project = await newProject(owner.id, 'glow-shaders');

		expect(project).toMatchObject({ status: 'draft', type: 'shader', downloads: 0 });
		expect(await memberRole(db, project.id, owner.id)).toBe('owner');
		expect(await memberRole(db, project.id, undefined)).toBeNull();
		expect(
			await createProject(db, {
				ownerId: owner.id,
				type: 'mod',
				name: 'x',
				slug: 'glow-shaders',
				summary: ''
			})
		).toEqual({ problem: 'slug-taken' });
		expect((await getProjectBySlug(db, 'shader', 'GLOW-SHADERS'))?.id).toBe(project.id);
		expect(await getProjectBySlug(db, 'mod', 'glow-shaders')).toBeNull();
		expect(await getProject(db, 'missing')).toBeNull();
	});

	it('shows drafts only to the team and staff', () => {
		expect(canView({ status: 'approved' }, null, null)).toBe(true);
		expect(canView({ status: 'draft' }, null, null)).toBe(false);
		expect(canView({ status: 'draft' }, null, 'user')).toBe(false);
		expect(canView({ status: 'in_review' }, 'maintainer', 'user')).toBe(true);
		expect(canView({ status: 'withheld' }, null, 'moderator')).toBe(true);
	});

	it('edits details and refuses a slug another project uses', async () => {
		const owner = await makeUser(db);
		const a = await newProject(owner.id, 'alpha-pack');
		const b = await newProject(owner.id, 'beta-pack');
		const details = {
			name: 'Alpha',
			slug: 'alpha-two',
			summary: 'New summary',
			categories: ['shadows'],
			license: 'MIT',
			licenseUrl: null,
			sourceUrl: 'https://github.com/x/y',
			issuesUrl: null,
			wikiUrl: null,
			discordUrl: null
		};

		expect(await updateDetails(db, a.id, details)).toBe('saved');
		expect(await updateDetails(db, b.id, { ...details, slug: 'alpha-two' })).toBe('slug-taken');
		await updateDescription(db, a.id, '# Hello');
		await setIcon(db, a.id, 'k'.repeat(64));
		expect(await getProject(db, a.id)).toMatchObject({
			name: 'Alpha',
			slug: 'alpha-two',
			license: 'MIT',
			description: '# Hello',
			iconKey: 'k'.repeat(64)
		});
	});

	it('invites, accepts, removes and hands over ownership', async () => {
		const owner = await makeUser(db);
		const helper = await makeUser(db, { username: 'Helper_One' });
		const project = await newProject(owner.id);

		expect(await inviteMember(db, project.id, 'nobody-here')).toEqual({ result: 'no-user' });
		expect((await inviteMember(db, project.id, 'helper_one')).result).toBe('invited');
		expect((await inviteMember(db, project.id, 'HELPER_ONE')).result).toBe('already');
		expect(await memberRole(db, project.id, helper.id)).toBeNull();
		expect((await listMembers(db, project.id)).map((m) => m.userId)).toEqual([owner.id]);
		expect(
			(await listMembers(db, project.id, true)).find((m) => m.userId === helper.id)?.accepted
		).toBe(false);

		expect(await answerInvite(db, project.id, helper.id, true)).toBe(true);
		expect(await answerInvite(db, project.id, helper.id, true)).toBe(false);
		expect(await memberRole(db, project.id, helper.id)).toBe('maintainer');
		expect((await userProjects(db, helper.id)).map((p) => p.project.id)).toEqual([project.id]);

		expect(await removeMember(db, project.id, owner.id)).toBe(false);
		expect(await transferOwnership(db, project.id, owner.id, 'stranger')).toBe(false);
		expect(await transferOwnership(db, project.id, owner.id, helper.id)).toBe(true);
		expect(await memberRole(db, project.id, helper.id)).toBe('owner');
		expect(await removeMember(db, project.id, owner.id)).toBe(true);
		expect(await memberRole(db, project.id, owner.id)).toBeNull();
	});

	it('declines an invitation', async () => {
		const owner = await makeUser(db);
		const other = await makeUser(db, { username: 'decliner' });
		const project = await newProject(owner.id);
		await inviteMember(db, project.id, 'decliner');

		expect(await answerInvite(db, project.id, other.id, false)).toBe(true);
		expect((await listMembers(db, project.id, true)).map((m) => m.userId)).toEqual([owner.id]);
	});
});

describe('submitting for review', () => {
	it('lists what is missing, then sends a complete draft to the moderators', async () => {
		const owner = await makeUser(db);
		const project = await newProject(owner.id);

		expect(await missingForReview(db, (await getProject(db, project.id))!)).toEqual([
			'an icon',
			'a description (at least 50 characters)',
			'a licence',
			'a version with a file'
		]);

		await setIcon(db, project.id, 'i'.repeat(64));
		await updateDescription(
			db,
			project.id,
			'A shader pack with soft shadows, warm light and calm water. '.repeat(2)
		);
		await db.update(projects).set({ license: 'MIT' }).where(eq(projects.id, project.id));
		const file = await staged(project.id, owner.id);
		await publishVersion(db, storage, {
			project,
			authorId: owner.id,
			versionNumber: '1.0.0',
			name: 'Glow 1.0',
			changelog: '',
			channel: 'release',
			gameVersions: ['1.21.4'],
			loaders: ['iris'],
			stagedIds: [file.id],
			primaryId: null,
			dependencies: []
		});

		const ready = (await getProject(db, project.id))!;
		expect(await submitForReview(db, ready)).toEqual([]);
		expect((await getProject(db, project.id))?.status).toBe('in_review');
		expect(await submitForReview(db, (await getProject(db, project.id))!)).toEqual([
			'The project is not a draft.'
		]);

		await withdrawSubmission(db, project.id);
		expect((await getProject(db, project.id))?.status).toBe('draft');
	});
});

describe('versions and files', () => {
	it('publishes a version from staged uploads, moving the files into storage', async () => {
		const owner = await makeUser(db);
		const project = await newProject(owner.id);
		const a = await staged(project.id, owner.id);
		const b = await staged(project.id, owner.id, 'review');
		expect((await listStaged(db, project.id, owner.id)).map((s) => s.id)).toEqual([a.id, b.id]);

		const result = await publishVersion(db, storage, {
			project,
			authorId: owner.id,
			versionNumber: '2.1.0',
			name: 'Glow 2.1',
			changelog: '- Brighter',
			channel: 'beta',
			gameVersions: ['1.21.4', '1.21'],
			loaders: ['iris', 'optifine'],
			stagedIds: [a.id, b.id],
			primaryId: b.id,
			dependencies: [{ projectId: project.id, kind: 'required' }]
		});
		expect('version' in result).toBe(true);
		expect(existsSync(filePath(storage, a.sha512))).toBe(true);
		expect(existsSync(stagedPath(storage, a.id))).toBe(false);
		expect(await listStaged(db, project.id, owner.id)).toEqual([]);

		const [listed] = await listVersions(db, project.id);
		expect(listed!.files.map((f) => [f.filename, f.primary, f.scanStatus])).toEqual([
			[b.filename, true, 'review'],
			[a.filename, false, 'clean']
		]);
		expect(listed!.dependencies).toEqual([]);
		expect(await getProject(db, project.id)).toMatchObject({
			loaders: expect.arrayContaining(['iris', 'optifine']),
			gameVersions: expect.arrayContaining(['1.21', '1.21.4'])
		});
	});

	it('refuses no files, foreign files, infected files and a repeated version number', async () => {
		const owner = await makeUser(db);
		const intruder = await makeUser(db);
		const project = await newProject(owner.id);
		const base = {
			project,
			authorId: owner.id,
			name: 'v',
			changelog: '',
			channel: 'release' as const,
			gameVersions: [],
			loaders: [],
			primaryId: null,
			dependencies: []
		};

		expect(
			await publishVersion(db, storage, { ...base, versionNumber: '1', stagedIds: [] })
		).toEqual({ problem: 'no-files' });
		const theirs = await staged(project.id, intruder.id);
		const mine = await staged(project.id, owner.id);
		expect(
			await publishVersion(db, storage, {
				...base,
				versionNumber: '1',
				stagedIds: [mine.id, theirs.id]
			})
		).toEqual({ problem: 'foreign-file' });
		const bad = await staged(project.id, owner.id, 'infected');
		expect(
			await publishVersion(db, storage, { ...base, versionNumber: '1', stagedIds: [bad.id] })
		).toEqual({ problem: 'infected' });
		await publishVersion(db, storage, { ...base, versionNumber: '1', stagedIds: [mine.id] });
		const again = await staged(project.id, owner.id);
		expect(
			await publishVersion(db, storage, { ...base, versionNumber: '1', stagedIds: [again.id] })
		).toEqual({ problem: 'duplicate-number' });
	});

	it('records a dependency on another project and tells followers of approved projects', async () => {
		const owner = await makeUser(db);
		const fan = await makeUser(db);
		const library = await newProject(owner.id);
		const project = await newProject(owner.id);
		await db.update(projects).set({ status: 'approved' }).where(eq(projects.id, project.id));
		await db.insert(follows).values({ userId: fan.id, projectId: project.id });
		const file = await staged(project.id, owner.id);

		await publishVersion(db, storage, {
			project: { ...project, status: 'approved' },
			authorId: owner.id,
			versionNumber: '3.0',
			name: 'Three',
			changelog: '',
			channel: 'release',
			gameVersions: [],
			loaders: [],
			stagedIds: [file.id],
			primaryId: null,
			dependencies: [{ projectId: library.id, kind: 'required' }]
		});

		const [version] = await listVersions(db, project.id);
		expect(version!.dependencies).toEqual([
			{ projectId: library.id, kind: 'required', name: 'Glow', slug: library.slug, type: 'shader' }
		]);
		const [note] = await listNotifications(db, fan.id);
		expect(note).toMatchObject({
			kind: 'version_published',
			data: { versionNumber: '3.0', projectName: 'Glow' }
		});
		expect(await listNotifications(db, owner.id)).toEqual([]);
	});

	it('edits, withholds and deletes versions, keeping the project summary right', async () => {
		const owner = await makeUser(db);
		const project = await newProject(owner.id);
		const file = await staged(project.id, owner.id);
		const result = await publishVersion(db, storage, {
			project,
			authorId: owner.id,
			versionNumber: '1',
			name: 'One',
			changelog: '',
			channel: 'release',
			gameVersions: ['1.20.1'],
			loaders: ['iris'],
			stagedIds: [file.id],
			primaryId: null,
			dependencies: []
		});
		const id = 'version' in result ? result.version.id : '';

		await updateVersion(db, id, {
			name: 'One!',
			changelog: 'x',
			channel: 'alpha',
			gameVersions: ['1.21'],
			loaders: ['optifine']
		});
		expect(await getVersion(db, id)).toMatchObject({ name: 'One!', channel: 'alpha' });
		expect((await getProject(db, project.id))?.loaders).toEqual(['optifine']);

		await setVersionStatus(db, id, 'withheld');
		expect(await listVersions(db, project.id)).toEqual([]);
		expect(await listVersions(db, project.id, true)).toHaveLength(1);
		expect((await getProject(db, project.id))?.loaders).toEqual([]);

		await deleteVersion(db, id);
		expect(await getVersion(db, id)).toBeNull();
	});

	it('discards one upload, and cleans up old ones', async () => {
		const owner = await makeUser(db);
		const project = await newProject(owner.id);
		const a = await staged(project.id, owner.id);
		const b = await staged(project.id, owner.id);

		expect(await discardStaged(db, storage, a.id, 'someone-else')).toBe(false);
		expect(await discardStaged(db, storage, a.id, owner.id)).toBe(true);
		expect(existsSync(stagedPath(storage, a.id))).toBe(false);
		await db
			.update(stagedFiles)
			.set({ createdAt: new Date(0) })
			.where(eq(stagedFiles.id, b.id));
		expect(await cleanupStaged(db, storage)).toBe(1);
		expect(existsSync(stagedPath(storage, b.id))).toBe(false);
	});
});

describe('downloads', () => {
	async function published(scanStatus: 'clean' | 'review', status: 'approved' | 'draft') {
		const owner = await makeUser(db);
		const project = await newProject(owner.id);
		await db.update(projects).set({ status }).where(eq(projects.id, project.id));
		const file = await staged(project.id, owner.id, scanStatus);
		await publishVersion(db, storage, {
			project,
			authorId: owner.id,
			versionNumber: '1',
			name: 'One',
			changelog: '',
			channel: 'release',
			gameVersions: [],
			loaders: [],
			stagedIds: [file.id],
			primaryId: null,
			dependencies: []
		});
		const [version] = await listVersions(db, project.id, true);
		return { owner, project, fileId: version!.files[0]!.id, versionId: version!.id };
	}
	const stranger = { role: 'user' as const, membership: async () => null };

	it('serves clean files of public projects to anyone', async () => {
		const { fileId } = await published('clean', 'approved');

		expect(await resolveDownload(db, fileId, null)).not.toBeNull();
		expect(await resolveDownload(db, 'missing', null)).toBeNull();
	});

	it('keeps drafts, withheld versions and files under review to the team and staff', async () => {
		const draft = await published('clean', 'draft');
		expect(await resolveDownload(db, draft.fileId, null)).toBeNull();
		expect(await resolveDownload(db, draft.fileId, stranger)).toBeNull();
		expect(
			await resolveDownload(db, draft.fileId, { role: 'user', membership: async () => 'owner' })
		).not.toBeNull();
		expect(
			await resolveDownload(db, draft.fileId, { role: 'moderator', membership: async () => null })
		).not.toBeNull();

		const review = await published('review', 'approved');
		expect(await resolveDownload(db, review.fileId, stranger)).toBeNull();
		expect(
			await resolveDownload(db, review.fileId, { role: 'admin', membership: async () => null })
		).not.toBeNull();

		const withheld = await published('clean', 'approved');
		await setVersionStatus(db, withheld.versionId, 'withheld');
		expect(await resolveDownload(db, withheld.fileId, null)).toBeNull();
	});

	it('counts each visitor once a day, and keeps a daily history', async () => {
		let time = 0;
		const counter = new DownloadCounter(() => time, 3);
		expect(counter.shouldCount('ip1', 'f')).toBe(true);
		expect(counter.shouldCount('ip1', 'f')).toBe(false);
		expect(counter.shouldCount('ip2', 'f')).toBe(true);
		time = 86_400_000;
		expect(counter.shouldCount('ip1', 'f')).toBe(true);
		counter.shouldCount('ip3', 'f');
		expect(counter.shouldCount('ip4', 'f')).toBe(true);

		const { fileId, project } = await published('clean', 'approved');
		const download = (await resolveDownload(db, fileId, null))!;
		await recordDownload(db, download, '2026-03-01');
		await recordDownload(db, download, '2026-03-01');
		await recordDownload(db, download, '2026-03-03');
		expect((await getProject(db, project.id))?.downloads).toBe(3);
		const history = await downloadHistory(db, project.id, 3, new Date('2026-03-03T12:00:00Z'));
		expect(history).toEqual([
			{ day: '2026-03-01', count: 2 },
			{ day: '2026-03-02', count: 0 },
			{ day: '2026-03-03', count: 1 }
		]);
	});

	it('deletes a project with everything in it', async () => {
		const { project } = await published('clean', 'approved');
		await deleteProject(db, project.id);
		expect(await getProject(db, project.id)).toBeNull();
		expect(await listVersions(db, project.id, true)).toEqual([]);
	});
});
