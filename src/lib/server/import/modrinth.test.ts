import { eq } from 'drizzle-orm';
import { strToU8, zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { EICAR, fakeClamd } from '../../../../tests/helpers/locals.ts';
import type { Database } from '../db/index.ts';
import {
	auditLog,
	files,
	gallery,
	gameVersions,
	oauthAccounts,
	projects,
	stagedFiles,
	users,
	versions
} from '../db/schema.ts';
import { seedCategories } from '../marketplace/catalog.ts';
import { getProjectBySlug } from '../marketplace/projects.ts';
import { IMAGE_MAX_BYTES } from '../media/images.ts';
import { filePath } from '../uploads/receive.ts';
import {
	categoriesOf,
	imageUrlsIn,
	importFromModrinth,
	ImportError,
	isAllowedSource,
	licenseOf,
	linksOf,
	loadersOf,
	newestVersions,
	ownerOf,
	projectTypeOf,
	slugOf,
	summaryOf,
	USER_AGENT,
	withImages,
	type ImportContext,
	type ModrinthMember,
	type ModrinthProject,
	type ModrinthVersion
} from './modrinth.ts';

const API = 'https://api.modrinth.test/v2';
const CDN = 'https://cdn.modrinth.com/data/abc';

const hashes = (data: Buffer) => ({
	sha1: createHash('sha1').update(data).digest('hex'),
	sha512: createHash('sha512').update(data).digest('hex')
});
const zip = (entries: Record<string, string>) =>
	Buffer.from(
		zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, strToU8(v)])), {
			level: 0
		})
	);

function project(slug: string, extra: Partial<ModrinthProject> = {}): ModrinthProject {
	return {
		id: `id-${slug}`,
		slug,
		title: 'Alpha Piscium',
		description: 'High-quality   realistic shaderpack.',
		body: '# Alpha\n\n<img alt="Shot" src="https://github.com/user-attachments/assets/one" />\n\n![remote](https://evil.example/x.png)\n',
		project_type: 'shader',
		categories: ['realistic', 'high'],
		additional_categories: ['colored-lighting', 'not-a-category'],
		license: { id: 'GPL-3.0-only', url: null },
		source_url: 'https://github.com/Luna5ama/Alpha-Piscium',
		issues_url: 'javascript:alert(1)',
		wiki_url: null,
		discord_url: 'https://discord.gg/abc',
		icon_url: `${CDN}/icon_96.webp`,
		raw_icon_url: `${CDN}/icon.png`,
		downloads: 1234,
		published: '2025-10-09T06:59:15.908Z',
		gallery: [
			{
				url: `${CDN}/images/b_350.webp`,
				raw_url: `${CDN}/images/b.webp`,
				featured: true,
				title: 'Clouds',
				description: 'Cumulus at noon',
				ordering: 2
			},
			{
				url: `${CDN}/images/a_350.webp`,
				raw_url: `${CDN}/images/a.webp`,
				featured: false,
				title: 'Water',
				description: null,
				ordering: 1
			}
		],
		...extra
	};
}

const OWNER: ModrinthMember = {
	role: 'Owner',
	ordering: 0,
	user: {
		username: 'Luna5ama',
		bio: 'Kotlin enjoyer.\r\nGraphics fan.',
		avatar_url: `${CDN}/user_96.webp`,
		raw_avatar_url: `${CDN}/user.png`
	}
};

/** A fake Modrinth (API, CDN and GitHub): answers what it was given, 404 for anything else. */
function modrinth() {
	const routes = new Map<string, () => Response>();
	const requests: { url: string; agent: string | null }[] = [];
	const http = (async (input: string | URL | Request, init?: RequestInit) => {
		const url = String(input);
		requests.push({ url, agent: new Headers(init?.headers).get('user-agent') });
		return routes.get(url)?.() ?? new Response('not found', { status: 404 });
	}) as typeof fetch;
	const json = (url: string, value: unknown) => routes.set(url, () => Response.json(value));
	const bytes = (url: string, data: Buffer) =>
		routes.set(url, () => new Response(new Uint8Array(data)));
	/** Serves a project, its team and versions; each version's file is `served` (or its own). */
	function serve(
		source: ModrinthProject,
		list: { version: ModrinthVersion; served: Buffer }[],
		members = [OWNER]
	) {
		json(`${API}/project/${source.slug}`, source);
		json(`${API}/project/${source.slug}/members`, members);
		json(
			`${API}/project/${source.slug}/version`,
			list.map((v) => v.version)
		);
		for (const { version, served } of list) bytes(version.files[0]!.url, served);
	}
	return { routes, requests, http, bytes, serve };
}

function version(
	number: string,
	date: string,
	file: Buffer,
	extra: Partial<ModrinthVersion> = {}
): ModrinthVersion {
	return {
		id: `v-${number}`,
		name: `Alpha Piscium v${number}`,
		version_number: number,
		changelog: `- Changes in ${number}`,
		version_type: 'release',
		date_published: date,
		downloads: 100,
		game_versions: ['1.21.4', '9.9.9'],
		loaders: ['iris', 'canvas'],
		files: [
			{
				url: `${CDN}/versions/${number}/pack.zip`,
				filename: `Alpha Piscium v${number}.zip`,
				primary: true,
				size: file.length,
				hashes: hashes(file)
			}
		],
		...extra
	};
}

describe('mapping Modrinth onto the marketplace', () => {
	it('takes the four project types and refuses the rest', () => {
		expect(projectTypeOf({ project_type: 'shader' })).toBe('shader');
		expect(projectTypeOf({ project_type: 'datapack' })).toBe('datapack');
		expect(() => projectTypeOf({ project_type: 'modpack' })).toThrow(ImportError);
		expect(() => projectTypeOf({ project_type: 'modpack' })).toThrow(/modpacks/);
	});

	it('keeps main categories first and respells Modrinth’s', () => {
		expect(
			categoriesOf({
				categories: ['high', 'optimization'],
				additional_categories: ['colored-lighting']
			})
		).toEqual(['high', 'optimisation', 'coloured-lighting']);
	});

	it('keeps only loaders the type has here', () => {
		expect(loadersOf('shader', ['iris', 'canvas', 'optifine'])).toEqual(['iris', 'optifine']);
		expect(loadersOf('resourcepack', ['minecraft'])).toEqual([]);
	});

	it('maps licences, keeping a link only when it is a real one', () => {
		expect(licenseOf({ id: 'GPL-3.0-only', url: null })).toEqual({
			license: 'GPL-3.0-only',
			licenseUrl: null
		});
		expect(licenseOf({ id: 'LicenseRef-All-Rights-Reserved', url: 'https://x.org' })).toEqual({
			license: 'ARR',
			licenseUrl: null
		});
		expect(licenseOf({ id: 'LicenseRef-Mine', url: 'https://x.org/licence' })).toEqual({
			license: 'custom',
			licenseUrl: 'https://x.org/licence'
		});
		expect(licenseOf({ id: 'LicenseRef-Mine', url: 'javascript:alert(1)' }).licenseUrl).toBeNull();
	});

	it('drops links that are not web addresses', () => {
		expect(linksOf(project('a'))).toEqual({
			sourceUrl: 'https://github.com/Luna5ama/Alpha-Piscium',
			issuesUrl: null,
			wikiUrl: null,
			discordUrl: 'https://discord.gg/abc'
		});
	});

	it('keeps Modrinth’s address when it is valid here', () => {
		expect(slugOf({ slug: 'alpha-piscium', title: 'Whatever' })).toBe('alpha-piscium');
		expect(slugOf({ slug: 'Alpha_Piscium', title: 'Alpha Piscium!' })).toBe('alpha-piscium');
	});

	it('fits summaries into 160 characters, cutting at a word', () => {
		expect(summaryOf('  Short   and\nsweet. ')).toBe('Short and sweet.');
		expect(summaryOf('y'.repeat(160))).toBe('y'.repeat(160));
		expect(summaryOf('word '.repeat(60))).toBe(`${'word '.repeat(30)}word…`);
		expect(summaryOf(`a ${'x'.repeat(200)}`)).toBe('a…');
		expect(summaryOf('x'.repeat(200))).toBe(`${'x'.repeat(159)}…`);
	});

	it('picks the newest versions and returns them oldest first', () => {
		const at = (n: string, d: string) => version(n, d, Buffer.from(n));
		const list = [
			at('1.1', '2025-02-01T00:00:00Z'),
			at('1.2', '2025-03-01T00:00:00Z'),
			at('1.0', '2025-01-01T00:00:00Z')
		];
		expect(newestVersions(list, 2).map((v) => v.version_number)).toEqual(['1.1', '1.2']);
		expect(newestVersions(list, 'all').map((v) => v.version_number)).toEqual(['1.0', '1.1', '1.2']);
	});

	it('finds the owner, or else the first member', () => {
		const member = (username: string, role: string, ordering: number): ModrinthMember => ({
			role,
			ordering,
			user: { username, bio: null, avatar_url: null }
		});
		expect(ownerOf([member('a', 'Artist', 0), member('b', 'Owner', 1)])?.user.username).toBe('b');
		expect(ownerOf([member('a', 'Artist', 2), member('c', 'Dev', 1)])?.user.username).toBe('c');
		expect(ownerOf([])).toBeNull();
	});

	it('downloads only from Modrinth’s and GitHub’s own hosts', () => {
		for (const ok of [
			`${CDN}/icon.png`,
			'https://github.com/user-attachments/assets/abc',
			'https://github.com/Luna5ama/Alpha-Piscium/raw/main/logo.png',
			'https://raw.githubusercontent.com/a/b/main/c.png',
			'https://avatars.githubusercontent.com/u/1'
		])
			expect(isAllowedSource(ok), ok).toBe(true);
		for (const bad of [
			'http://cdn.modrinth.com/data/x.png',
			'https://cdn.modrinth.com:8443/x.png',
			'https://github.com/Luna5ama/Alpha-Piscium/blob/main/logo.png',
			'https://evil.example/x.png',
			'https://127.0.0.1/x.png',
			'not a url'
		])
			expect(isAllowedSource(bad), bad).toBe(false);
	});

	it('finds the pictures in a description and points them elsewhere', () => {
		const markdown =
			'![a](https://x.org/a.png "A") ![b](<https://x.org/b.png>) ![c](http://x.org/c.png)\n<img src="https://x.org/a.png"> <IMG alt="d" SRC=\'https://x.org/d.png\'>';
		expect(imageUrlsIn(markdown)).toEqual([
			'https://x.org/a.png',
			'https://x.org/b.png',
			'https://x.org/d.png'
		]);
		expect(withImages(markdown, new Map([['https://x.org/a.png', '/media/a.webp']]))).toBe(
			markdown.replaceAll('https://x.org/a.png', '/media/a.webp')
		);
	});
});

describe('importFromModrinth', () => {
	let db: Database;
	let storageDir: string;
	let clamd: { target: string; close: () => void };
	let png: Buffer;
	const good = zip({ 'shaders/final.fsh': 'void main() {}', 'shaders/shaders.properties': '' });
	const good2 = zip({ 'shaders/final.fsh': 'void main() { /* 2 */ }' });
	const good3 = zip({ 'shaders/final.fsh': 'void main() { /* 3 */ }' });
	const fake = modrinth();
	const ctx = (): ImportContext => ({
		db,
		storageDir,
		clamd: clamd.target,
		http: fake.http,
		api: API
	});

	beforeAll(async () => {
		({ db } = await testDb());
		storageDir = mkdtempSync(join(tmpdir(), 'modrinth-'));
		clamd = await fakeClamd();
		await seedCategories(db);
		await db.insert(gameVersions).values(
			['1.21.4', '1.21.1', '26.1'].map((v, i) => ({
				version: v,
				kind: 'release',
				releasedAt: new Date(Date.UTC(2026, 0, 1) - i * 86_400_000)
			}))
		);
		png = await sharp({
			create: { width: 64, height: 48, channels: 3, background: '#f79009' }
		})
			.png()
			.toBuffer();
		for (const path of ['icon.png', 'user.png', 'images/a.webp', 'images/b.webp'])
			fake.bytes(`${CDN}/${path}`, png);
		fake.bytes('https://github.com/user-attachments/assets/one', png);
	});
	afterAll(() => {
		clamd.close();
		rmSync(storageDir, { recursive: true, force: true });
	});

	it('brings over the page, pictures, owner and versions, checked like uploads', async () => {
		fake.serve(project('alpha-piscium'), [
			{ version: version('1.1.0', '2025-11-01T00:00:00Z', good2), served: good2 },
			{ version: version('1.0.0', '2025-10-10T00:00:00Z', good), served: good }
		]);
		const report = await importFromModrinth(ctx(), 'alpha-piscium', {
			versions: 'all',
			keepDownloads: true
		});

		expect(report).toMatchObject({
			created: true,
			owner: 'Luna5ama',
			path: '/marketplace/shaders/alpha-piscium',
			versions: [
				{ number: '1.0.0', result: 'imported' },
				{ number: '1.1.0', result: 'imported' }
			],
			images: { imported: 5, failed: [] }
		});
		const [row] = await db.select().from(projects).where(eq(projects.id, report.projectId));
		expect(row).toMatchObject({
			status: 'approved',
			name: 'Alpha Piscium',
			summary: 'High-quality realistic shaderpack.',
			license: 'GPL-3.0-only',
			sourceUrl: 'https://github.com/Luna5ama/Alpha-Piscium',
			issuesUrl: null,
			discordUrl: 'https://discord.gg/abc',
			categories: ['realistic', 'high', 'coloured-lighting'],
			gameVersions: ['1.21.4'],
			loaders: ['iris'],
			downloads: 1234
		});
		expect(row!.iconKey).toMatch(/^[0-9a-f]{64}$/);
		expect(row!.publishedAt).toEqual(new Date('2025-10-09T06:59:15.908Z'));
		expect(row!.latestVersionAt).toEqual(new Date('2025-11-01T00:00:00Z'));
		// The GitHub picture is copied here; the one from elsewhere is left alone (shown as a link).
		expect(row!.description).toMatch(/<img alt="Shot" src="\/media\/[0-9a-f]{64}\.webp" \/>/);
		expect(row!.description).toContain('https://evil.example/x.png');
		expect(fake.requests.some((r) => r.url.includes('evil.example'))).toBe(false);
		expect(fake.requests.every((r) => r.agent === USER_AGENT)).toBe(true);

		const shots = await db
			.select()
			.from(gallery)
			.where(eq(gallery.projectId, report.projectId))
			.orderBy(gallery.sortOrder);
		expect(shots.map((s) => [s.title, s.featured, s.description])).toEqual([
			['Water', false, ''],
			['Clouds', true, 'Cumulus at noon']
		]);

		const [owner] = await db.select().from(users).where(eq(users.username, 'Luna5ama'));
		expect(owner).toMatchObject({ role: 'user', bio: 'Kotlin enjoyer.\nGraphics fan.' });
		expect(owner!.avatarKey).toMatch(/^[0-9a-f]{64}$/);
		expect(owner!.passwordHash).toBeNull();
		expect(await db.select().from(oauthAccounts)).toEqual([]);

		const published = await db
			.select({ version: versions, file: files })
			.from(versions)
			.innerJoin(files, eq(files.versionId, versions.id))
			.where(eq(versions.projectId, report.projectId))
			.orderBy(versions.publishedAt);
		expect(
			published.map(({ version: v, file: f }) => ({
				number: v.versionNumber,
				name: v.name,
				changelog: v.changelog,
				date: v.publishedAt.toISOString(),
				downloads: v.downloads,
				loaders: v.loaders,
				file: f.filename,
				scan: f.scanStatus
			}))
		).toEqual([
			{
				number: '1.0.0',
				name: 'Alpha Piscium v1.0.0',
				changelog: '- Changes in 1.0.0',
				date: '2025-10-10T00:00:00.000Z',
				downloads: 100,
				loaders: ['iris'],
				file: 'Alpha Piscium v1.0.0.zip',
				scan: 'clean'
			},
			{
				number: '1.1.0',
				name: 'Alpha Piscium v1.1.0',
				changelog: '- Changes in 1.1.0',
				date: '2025-11-01T00:00:00.000Z',
				downloads: 100,
				loaders: ['iris'],
				file: 'Alpha Piscium v1.1.0.zip',
				scan: 'clean'
			}
		]);
		expect(published[0]!.file.sha512).toBe(hashes(good).sha512);
		expect(existsSync(filePath(storageDir, hashes(good).sha512))).toBe(true);

		const [entry] = await db.select().from(auditLog).where(eq(auditLog.targetId, report.projectId));
		expect(entry).toMatchObject({ action: 'project.imported', actorId: null });
	});

	it('only adds missing versions when run again', async () => {
		fake.serve(project('alpha-piscium'), [
			{ version: version('1.2.0', '2026-01-01T00:00:00Z', good3), served: good3 },
			{ version: version('1.1.0', '2025-11-01T00:00:00Z', good2), served: good2 },
			{ version: version('1.0.0', '2025-10-10T00:00:00Z', good), served: good }
		]);
		const report = await importFromModrinth(ctx(), 'alpha-piscium', { versions: 'all' });
		expect(report.created).toBe(false);
		expect(report.owner).toBe('Luna5ama');
		expect(report.versions).toEqual([
			{ number: '1.0.0', result: 'present' },
			{ number: '1.1.0', result: 'present' },
			{ number: '1.2.0', result: 'imported' }
		]);
		const [added] = await db.select().from(versions).where(eq(versions.versionNumber, '1.2.0'));
		expect(added!.downloads).toBe(0);
		expect(await db.select().from(gallery)).toHaveLength(2);
	});

	it('refuses files that differ from Modrinth’s or fail the checks, and leaves nothing behind', async () => {
		const other = zip({ 'shaders/final.fsh': 'something else' });
		const textures = zip({ 'pack.mcmeta': '{}' });
		const infected = zip({ 'shaders/final.fsh': EICAR });
		const missing = {
			url: `${CDN}/images/missing.webp`,
			featured: false,
			title: 'Gone',
			description: null,
			ordering: 1
		};
		fake.serve(project('broken-pack', { gallery: [missing] }), [
			{ version: version('1', '2025-01-01T00:00:00Z', good), served: other },
			{ version: version('2', '2025-01-02T00:00:00Z', textures), served: textures },
			{ version: version('3', '2025-01-03T00:00:00Z', infected), served: infected },
			{
				version: version('4', '2025-01-04T00:00:00Z', good, { game_versions: ['0.0.1'] }),
				served: good
			},
			{
				version: version('5', '2025-01-05T00:00:00Z', good, {
					files: [{ ...version('5', '', good).files[0]!, filename: 'pack.jar' }]
				}),
				served: good
			},
			{
				// Only the SHA-1 Modrinth lists is wrong.
				version: version('6', '2025-01-06T00:00:00Z', good, {
					files: [
						{
							...version('6', '', good).files[0]!,
							hashes: { ...hashes(good), sha1: '0'.repeat(40) }
						}
					]
				}),
				served: good
			}
		]);
		const report = await importFromModrinth(ctx(), 'broken-pack', {
			versions: 'all',
			owner: 'luna5ama'
		});

		expect(report.versions.map((v) => [v.number, v.result, v.detail])).toEqual([
			['1', 'failed', 'Alpha Piscium v1.zip doesn’t match the hashes Modrinth lists.'],
			[
				'2',
				'failed',
				'Alpha Piscium v2.zip: A shader pack needs a shaders/ folder at its top level.'
			],
			['3', 'failed', 'Alpha Piscium v3.zip: The virus scanner found Eicar in this file.'],
			['4', 'failed', 'None of its Minecraft versions are known here.'],
			['5', 'failed', 'Shader packs must be .zip files.'],
			['6', 'failed', 'Alpha Piscium v6.zip doesn’t match the hashes Modrinth lists.']
		]);
		expect(report.images.failed).toEqual([
			`${CDN}/images/missing.webp (${CDN}/images/missing.webp answered 404.)`
		]);
		const [row] = await db.select().from(projects).where(eq(projects.id, report.projectId));
		expect(row!.status).toBe('draft');
		expect(await db.select().from(stagedFiles)).toEqual([]);
		expect(readdirSync(join(storageDir, 'tmp'))).toEqual([]);
	});

	it('won’t take over an account that already has the owner’s name', async () => {
		fake.serve(project('other-pack'), [
			{ version: version('1', '2025-01-01T00:00:00Z', good), served: good }
		]);
		await expect(importFromModrinth(ctx(), 'other-pack', { versions: 1 })).rejects.toThrow(
			/already a user called Luna5ama/
		);
		await expect(
			importFromModrinth(ctx(), 'other-pack', { versions: 1, owner: 'nobody' })
		).rejects.toThrow(/no user called nobody/);
		expect(await getProjectBySlug(db, 'shader', 'other-pack')).toBeNull();

		const report = await importFromModrinth(ctx(), 'other-pack', {
			versions: 1,
			owner: 'Luna5ama'
		});
		expect(report).toMatchObject({ created: true, owner: 'Luna5ama' });
		const made = await getProjectBySlug(db, 'shader', 'other-pack');
		// One version is enough to go public.
		expect(made).toMatchObject({ status: 'approved', downloads: 0 });
	});

	it('makes an owner account even without a picture or bio', async () => {
		const plain: ModrinthMember = {
			role: 'Owner',
			ordering: 0,
			user: { username: 'Plain', bio: null, avatar_url: null, raw_avatar_url: null }
		};
		fake.serve(project('plain-pack'), [], [plain]);
		const report = await importFromModrinth(ctx(), 'plain-pack', { versions: 1 });
		expect(report.owner).toBe('Plain');
		const [owner] = await db.select().from(users).where(eq(users.username, 'Plain'));
		expect(owner).toMatchObject({ bio: '', avatarKey: null });
	});

	it('refuses to add versions to a project here that has no owner', async () => {
		await db
			.insert(projects)
			.values({ id: 'orphan', slug: 'orphan-pack', type: 'shader', name: 'Orphan' });
		fake.serve(project('orphan-pack'), []);
		await expect(importFromModrinth(ctx(), 'orphan-pack', { versions: 1 })).rejects.toThrow(
			'The project here has no owner to add versions as.'
		);
	});

	it('needs an owner whose name works here', async () => {
		const named = (username: string): ModrinthMember => ({
			...OWNER,
			user: { ...OWNER.user, username }
		});
		fake.serve(project('no-team'), [], []);
		await expect(importFromModrinth(ctx(), 'no-team', { versions: 1 })).rejects.toThrow(
			/no team on Modrinth/
		);
		fake.serve(project('bad-name'), [], [named('x')]);
		await expect(importFromModrinth(ctx(), 'bad-name', { versions: 1 })).rejects.toThrow(
			/"x" can’t be a username here/
		);
		expect(await getProjectBySlug(db, 'shader', 'no-team')).toBeNull();
		expect(await getProjectBySlug(db, 'shader', 'bad-name')).toBeNull();
	});

	it('won’t take an address another type of project already has', async () => {
		fake.serve(project('Alpha_Piscium', { project_type: 'resourcepack' }), []);
		await expect(
			importFromModrinth(ctx(), 'Alpha_Piscium', { versions: 1, owner: 'Luna5ama' })
		).rejects.toThrow('The address alpha-piscium is taken.');
		expect(await getProjectBySlug(db, 'resourcepack', 'alpha-piscium')).toBeNull();
	});

	it('carries on without pictures it can’t have, and puts back a version’s files if one fails', async () => {
		// Pictures that say they are over the limit aren't downloaded; one exactly at it is.
		const sized = (url: string, length: number) =>
			fake.routes.set(
				url,
				() => new Response(new Uint8Array(png), { headers: { 'content-length': String(length) } })
			);
		const huge = `${CDN}/images/huge.webp`;
		const edge = `${CDN}/images/edge.webp`;
		sized(huge, IMAGE_MAX_BYTES + 1);
		sized(edge, IMAGE_MAX_BYTES);
		const shot = (url: string, ordering: number) => ({
			url,
			raw_url: null,
			featured: false,
			title: null,
			description: null,
			ordering
		});
		const extra = zip({ 'shaders/extra.fsh': 'void main() {}' });
		const two = (number: string, date: string, second: Buffer, served: Buffer) => {
			const base = version(number, date, good);
			const url = `${CDN}/versions/${number}/second.zip`;
			fake.bytes(url, served);
			return {
				version: {
					...base,
					files: [
						{ ...base.files[0]!, primary: false },
						{ url, filename: 'second.zip', primary: true, size: 1, hashes: hashes(second) }
					]
				},
				served: good
			};
		};
		fake.serve(
			project('picky-pack', {
				raw_icon_url: 'https://evil.example/icon.png',
				gallery: [shot(`${CDN}/images/a.webp`, 1), shot(huge, 2), shot(edge, 3)]
			}),
			[
				two('1', '2025-01-01T00:00:00Z', extra, good),
				two('2', '2025-01-02T00:00:00Z', extra, extra)
			]
		);
		const report = await importFromModrinth(ctx(), 'picky-pack', {
			versions: 'all',
			owner: 'Luna5ama'
		});

		expect(report.versions.map((v) => [v.number, v.result])).toEqual([
			['1', 'failed'],
			['2', 'imported']
		]);
		expect(report.images.failed).toEqual([
			'https://evil.example/icon.png (not on Modrinth or GitHub)',
			`${huge} (too large)`
		]);
		const row = await getProjectBySlug(db, 'shader', 'picky-pack');
		expect(row!.iconKey).toBeNull();
		const shots = await db
			.select()
			.from(gallery)
			.where(eq(gallery.projectId, row!.id))
			.orderBy(gallery.sortOrder);
		expect(shots.map((s) => [s.title, s.featured])).toEqual([
			['', true],
			['', false]
		]);
		const kept = await db
			.select({ filename: files.filename, primary: files.primary })
			.from(files)
			.innerJoin(versions, eq(versions.id, files.versionId))
			.where(eq(versions.projectId, row!.id))
			.orderBy(files.filename);
		expect(kept).toEqual([
			{ filename: 'Alpha Piscium v2.zip', primary: false },
			{ filename: 'second.zip', primary: true }
		]);
		expect(await db.select().from(stagedFiles)).toEqual([]);
		expect(readdirSync(join(storageDir, 'tmp'))).toEqual([]);
	});

	it('stops before anything is made for a type this marketplace doesn’t have', async () => {
		fake.serve(project('some-modpack', { project_type: 'modpack' }), []);
		await expect(importFromModrinth(ctx(), 'some-modpack', { versions: 1 })).rejects.toThrow(
			ImportError
		);
		expect(await db.select().from(projects).where(eq(projects.slug, 'some-modpack'))).toEqual([]);
	});
});
