/**
 * Brings a project over from Modrinth: its page (name, summary, description, licence, links,
 * categories), icon, gallery, and versions with their files. The project is owned by a new
 * account named after the Modrinth owner (it has no way to sign in until it is claimed), or by
 * an existing account chosen by name.
 *
 * Coming from Modrinth earns no trust. Every file must match the hashes Modrinth lists, and then
 * goes through the same layout check and virus scan as an upload. Every picture is re-encoded.
 * The description stays Markdown and is sanitised whenever it is shown. Nothing is fetched from
 * anywhere but Modrinth's and GitHub's own hosts.
 *
 * Running it again for a project that is already here only adds the versions it is missing.
 */
import { and, eq, sql } from 'drizzle-orm';
import { rm } from 'node:fs/promises';
import { audit } from '../audit.ts';
import { isUsernameTaken } from '../auth/users.ts';
import { usernameProblem } from '../auth/username.ts';
import type { Database } from '../db/index.ts';
import { projectMembers, projects, users, versions } from '../db/schema.ts';
import { validCategories, validGameVersions } from '../marketplace/catalog.ts';
import { addImage, updateImage } from '../marketplace/gallery.ts';
import { linkProblem } from '../marketplace/links.ts';
import {
	createProject,
	getProjectBySlug,
	refreshProjectCache,
	type Project
} from '../marketplace/projects.ts';
import { discardStaged, publishVersion, stageReceived } from '../marketplace/releases.ts';
import { IMAGE_MAX_BYTES, imageUrl, storeImage, type ImageKind } from '../media/images.ts';
import type { StoredImage } from '../media/images.ts';
import { newId } from '../security/crypto.ts';
import { extensionProblem, inspectUpload } from '../uploads/inspect.ts';
import { cleanFilename, receive } from '../uploads/receive.ts';
import {
	isLoaderFor,
	licenseInfo,
	projectPath,
	slugify,
	slugProblem,
	type Loader,
	type ProjectType
} from '../../marketplace/taxonomy.ts';

export const MODRINTH_API = 'https://api.modrinth.com/v2';
/** Modrinth asks API clients to say who they are. */
export const USER_AGENT =
	'vibeLABS-MC/vibelabsmc-website (+https://github.com/vibeLABS-MC/vibelabsmc-website)';

// What Modrinth's API answers, limited to the fields used here.

export interface ModrinthImage {
	url: string;
	raw_url?: string | null;
	featured: boolean;
	title: string | null;
	description: string | null;
	ordering: number;
}

export interface ModrinthProject {
	id: string;
	slug: string;
	title: string;
	description: string;
	body: string;
	project_type: string;
	categories: string[];
	additional_categories: string[];
	license: { id: string; url: string | null };
	source_url: string | null;
	issues_url: string | null;
	wiki_url: string | null;
	discord_url: string | null;
	icon_url: string | null;
	raw_icon_url?: string | null;
	downloads: number;
	published: string;
	gallery: ModrinthImage[];
}

export interface ModrinthFile {
	url: string;
	filename: string;
	primary: boolean;
	size: number;
	hashes: { sha1: string; sha512: string };
}

export interface ModrinthVersion {
	id: string;
	name: string;
	version_number: string;
	changelog: string | null;
	version_type: 'release' | 'beta' | 'alpha';
	date_published: string;
	downloads: number;
	game_versions: string[];
	loaders: string[];
	files: ModrinthFile[];
}

export interface ModrinthMember {
	role: string;
	ordering?: number;
	user: {
		username: string;
		bio: string | null;
		avatar_url: string | null;
		raw_avatar_url?: string | null;
	};
}

export class ImportError extends Error {}

// Mapping Modrinth's data onto this marketplace's.

const TYPES: Record<string, ProjectType> = {
	shader: 'shader',
	resourcepack: 'resourcepack',
	mod: 'mod',
	datapack: 'datapack'
};

export function projectTypeOf(project: Pick<ModrinthProject, 'project_type'>): ProjectType {
	const type = TYPES[project.project_type];
	if (!type)
		throw new ImportError(`Modrinth ${project.project_type}s don’t belong on this marketplace.`);
	return type;
}

/** Category names Modrinth spells differently. */
const CATEGORY_ALIASES: Record<string, string> = {
	'colored-lighting': 'coloured-lighting',
	optimization: 'optimisation'
};

/** Main categories first, then the extra ones; ones this catalog lacks are dropped later. */
export const categoriesOf = (
	project: Pick<ModrinthProject, 'categories' | 'additional_categories'>
): string[] =>
	[...project.categories, ...project.additional_categories].map((c) => CATEGORY_ALIASES[c] ?? c);

/** Only loaders this project type has here (Modrinth lists e.g. "minecraft" for texture packs). */
export const loadersOf = (type: ProjectType, loaders: string[]): Loader[] =>
	loaders.filter((loader) => isLoaderFor(type, loader));

const link = (value: string | null): string | null => (value && !linkProblem(value) ? value : null);

/** Modrinth uses SPDX IDs too; one not in this site's list becomes a custom licence with its link. */
export function licenseOf(license: ModrinthProject['license']): {
	license: string;
	licenseUrl: string | null;
} {
	if (license.id === 'LicenseRef-All-Rights-Reserved') return { license: 'ARR', licenseUrl: null };
	return {
		license: licenseInfo(license.id) ? license.id : 'custom',
		licenseUrl: link(license.url)
	};
}

export const linksOf = (project: ModrinthProject) => ({
	sourceUrl: link(project.source_url),
	issuesUrl: link(project.issues_url),
	wikiUrl: link(project.wiki_url),
	discordUrl: link(project.discord_url)
});

/** The same address as on Modrinth when it is valid here, otherwise one made from the name. */
export const slugOf = (project: Pick<ModrinthProject, 'slug' | 'title'>): string =>
	slugProblem(project.slug) ? slugify(project.title) : project.slug;

export const SUMMARY_MAX = 160;

/** Summaries here are at most 160 characters: a longer one is cut at a word. */
export function summaryOf(text: string): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= SUMMARY_MAX) return clean;
	const cut = clean.slice(0, SUMMARY_MAX - 1);
	const space = cut.lastIndexOf(' ');
	return `${space > 0 ? cut.slice(0, space) : cut}…`;
}

/** The newest `limit` versions (or all), oldest first, so they are published in order. */
export function newestVersions(list: ModrinthVersion[], limit: number | 'all'): ModrinthVersion[] {
	const newest = [...list].sort((a, b) => b.date_published.localeCompare(a.date_published));
	return (limit === 'all' ? newest : newest.slice(0, limit)).reverse();
}

/** The team member called "Owner", or else the first one listed. */
export const ownerOf = (members: ModrinthMember[]): ModrinthMember | null =>
	members.find((m) => m.role === 'Owner') ??
	[...members].sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0))[0] ??
	null;

const ALLOWED_HOSTS = new Set([
	'cdn.modrinth.com',
	'raw.githubusercontent.com',
	'user-images.githubusercontent.com',
	'private-user-images.githubusercontent.com',
	'avatars.githubusercontent.com'
]);

/** Downloads come only from Modrinth's CDN and GitHub's own hosts, over https. */
export function isAllowedSource(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	if (url.protocol !== 'https:' || url.port) return false;
	if (url.hostname === 'github.com')
		return /^\/(user-attachments\/|[^/]+\/[^/]+\/raw\/)/.test(url.pathname);
	return ALLOWED_HOSTS.has(url.hostname);
}

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?(https:\/\/[^\s)>]+)/g;
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*["'](https:\/\/[^"']+)["']/gi;

/** Every https picture a description shows, Markdown or HTML, each once. */
export function imageUrlsIn(markdown: string): string[] {
	const found = [...markdown.matchAll(MARKDOWN_IMAGE), ...markdown.matchAll(HTML_IMAGE)];
	return [...new Set(found.map((match) => match[1]!))];
}

/** Points pictures at their copies on this site. */
export function withImages(markdown: string, local: Map<string, string>): string {
	let out = markdown;
	for (const [from, to] of local) out = out.replaceAll(from, to);
	return out;
}

// Fetching and storing.

export interface ImportContext {
	db: Database;
	storageDir: string;
	clamd: string | null;
	/** `fetch`, or a fake one in tests. */
	http: typeof fetch;
	api?: string;
	/** Progress lines for the person running the import. */
	log?: (line: string) => void;
}

export interface ImportOptions {
	/** How many of the newest versions to bring over. */
	versions: number | 'all';
	/** The username of an existing account to own the project. */
	owner?: string;
	/** Start the download counts from Modrinth's (they then keep counting here). */
	keepDownloads?: boolean;
}

export interface ImportReport {
	projectId: string;
	path: string;
	created: boolean;
	owner: string;
	versions: { number: string; result: 'imported' | 'present' | 'failed'; detail?: string }[];
	images: { imported: number; failed: string[] };
}

const SECOND = 1000;

async function get(ctx: ImportContext, url: string, timeout: number): Promise<Response> {
	const response = await ctx.http(url, {
		headers: { 'user-agent': USER_AGENT },
		redirect: 'follow',
		signal: AbortSignal.timeout(timeout)
	});
	if (!response.ok) throw new ImportError(`${url} answered ${response.status}.`);
	return response;
}

async function getJson<T>(ctx: ImportContext, path: string): Promise<T> {
	const response = await get(ctx, `${ctx.api ?? MODRINTH_API}${path}`, 30 * SECOND);
	return (await response.json()) as T;
}

/** One picture, re-encoded and stored; null (noted in the report) if it can’t be had. */
async function fetchImage(
	ctx: ImportContext,
	report: ImportReport,
	url: string | null | undefined,
	kind: ImageKind
): Promise<StoredImage | null> {
	if (!url) return null;
	try {
		if (!isAllowedSource(url)) throw new ImportError('not on Modrinth or GitHub');
		const response = await get(ctx, url, 30 * SECOND);
		if (Number(response.headers.get('content-length') ?? 0) > IMAGE_MAX_BYTES)
			throw new ImportError('too large');
		const stored = await storeImage(
			ctx.storageDir,
			Buffer.from(await response.arrayBuffer()),
			kind
		);
		report.images.imported++;
		return stored;
	} catch (cause) {
		report.images.failed.push(`${url} (${(cause as Error).message})`);
		return null;
	}
}

/** The description with its pictures copied here (others become links when shown). */
async function withLocalImages(
	ctx: ImportContext,
	report: ImportReport,
	markdown: string
): Promise<string> {
	const local = new Map<string, string>();
	for (const url of imageUrlsIn(markdown).filter(isAllowedSource)) {
		const stored = await fetchImage(ctx, report, url, 'gallery');
		if (stored) local.set(url, imageUrl(stored.key));
	}
	return withImages(markdown, local);
}

async function userNamed(db: Database, username: string) {
	const [user] = await db
		.select({ id: users.id, username: users.username })
		.from(users)
		.where(sql`lower(${users.username}) = ${username.toLowerCase()}`);
	if (!user?.username) throw new ImportError(`There is no user called ${username}.`);
	return { id: user.id, username: user.username };
}

/** An account for the Modrinth owner. It has no sign-in method until someone links one. */
async function accountFor(
	ctx: ImportContext,
	report: ImportReport,
	members: ModrinthMember[]
): Promise<{ id: string; username: string }> {
	const member = ownerOf(members);
	if (!member) throw new ImportError('The project has no team on Modrinth: choose an owner.');
	const { username } = member.user;
	const problem = usernameProblem(username);
	if (problem) throw new ImportError(`"${username}" can’t be a username here (${problem}).`);
	if (await isUsernameTaken(ctx.db, username))
		throw new ImportError(
			`There is already a user called ${username}: choose them as the owner if it is them.`
		);
	const avatar = await fetchImage(
		ctx,
		report,
		member.user.raw_avatar_url ?? member.user.avatar_url,
		'avatar'
	);
	await ctx.db.insert(users).values({
		id: newId(),
		username,
		displayName: username,
		bio: (member.user.bio ?? '').replace(/\r\n?/g, '\n').slice(0, 500),
		avatarKey: avatar?.key ?? null
	});
	return userNamed(ctx.db, username);
}

async function importGallery(
	ctx: ImportContext,
	report: ImportReport,
	projectId: string,
	images: ModrinthImage[]
): Promise<void> {
	for (const image of [...images].sort((a, b) => a.ordering - b.ordering)) {
		const stored = await fetchImage(ctx, report, image.raw_url ?? image.url, 'gallery');
		const row = stored && (await addImage(ctx.db, projectId, stored, image.title ?? ''));
		if (row)
			await updateImage(ctx.db, projectId, row.id, {
				title: image.title ?? '',
				description: image.description ?? '',
				featured: image.featured || row.featured
			});
	}
}

/** A new project with Modrinth's page, icon and gallery; a draft until it has versions. */
async function createFrom(
	ctx: ImportContext,
	report: ImportReport,
	source: ModrinthProject,
	type: ProjectType,
	ownerId: string
): Promise<Project> {
	const made = await createProject(ctx.db, {
		ownerId,
		type,
		name: source.title.slice(0, 64),
		slug: slugOf(source),
		summary: summaryOf(source.description)
	});
	if ('problem' in made) throw new ImportError(`The address ${slugOf(source)} is taken.`);
	const icon = await fetchImage(ctx, report, source.raw_icon_url ?? source.icon_url, 'icon');
	await ctx.db
		.update(projects)
		.set({
			description: await withLocalImages(ctx, report, source.body),
			iconKey: icon?.key ?? null,
			categories: await validCategories(ctx.db, type, categoriesOf(source)),
			...licenseOf(source.license),
			...linksOf(source)
		})
		.where(eq(projects.id, made.project.id));
	await importGallery(ctx, report, made.project.id, source.gallery);
	return made.project;
}

async function ownerOfProject(db: Database, projectId: string) {
	const [owner] = await db
		.select({ username: users.username })
		.from(projectMembers)
		.innerJoin(users, eq(users.id, projectMembers.userId))
		.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, 'owner')));
	return userNamed(db, owner?.username ?? '');
}

/**
 * Downloads one file, makes sure it is byte for byte what Modrinth lists, then checks and
 * scans it exactly like an upload. Returns the staged file's ID.
 */
async function stageDownload(
	ctx: ImportContext,
	project: Project,
	ownerId: string,
	file: ModrinthFile
): Promise<string> {
	const filename = cleanFilename(file.filename);
	const wrongType = extensionProblem(project.type, filename);
	if (wrongType) throw new ImportError(wrongType);
	if (!isAllowedSource(file.url)) throw new ImportError(`${file.url} is not on Modrinth's CDN.`);
	const response = await get(ctx, file.url, 600 * SECOND);
	const received = await receive(response.body!, ctx.storageDir);
	if (received.sha512 !== file.hashes.sha512 || received.sha1 !== file.hashes.sha1) {
		await rm(received.path, { force: true });
		throw new ImportError(`${filename} doesn’t match the hashes Modrinth lists.`);
	}
	const inspection = await inspectUpload(received.path, project.type, ctx.clamd);
	if (!inspection.ok) throw new ImportError(`${filename}: ${inspection.problems.join(' ')}`);
	const staged = await stageReceived(ctx.db, ctx.storageDir, {
		userId: ownerId,
		projectId: project.id,
		filename,
		received,
		inspection
	});
	return staged.id;
}

async function stageAll(
	ctx: ImportContext,
	project: Project,
	ownerId: string,
	files: ModrinthFile[]
): Promise<{ ids: string[]; primaryId: string | null }> {
	const ids: string[] = [];
	let primaryId: string | null = null;
	try {
		for (const file of files) {
			const id = await stageDownload(ctx, project, ownerId, file);
			ids.push(id);
			if (file.primary) primaryId = id;
		}
	} catch (cause) {
		for (const id of ids) await discardStaged(ctx.db, ctx.storageDir, id, ownerId);
		throw cause;
	}
	return { ids, primaryId };
}

async function importVersion(
	ctx: ImportContext,
	project: Project,
	ownerId: string,
	source: ModrinthVersion,
	keepDownloads: boolean
): Promise<void> {
	const gameVersions = await validGameVersions(ctx.db, source.game_versions);
	if (!gameVersions.length) throw new ImportError('None of its Minecraft versions are known here.');
	const { ids, primaryId } = await stageAll(ctx, project, ownerId, source.files);
	const published = await publishVersion(ctx.db, ctx.storageDir, {
		project,
		authorId: ownerId,
		versionNumber: source.version_number,
		name: source.name || source.version_number,
		changelog: source.changelog ?? '',
		channel: source.version_type,
		gameVersions,
		loaders: loadersOf(project.type, source.loaders),
		stagedIds: ids,
		primaryId,
		dependencies: []
	});
	if ('problem' in published)
		throw new ImportError(`It could not be published (${published.problem}).`);
	await ctx.db
		.update(versions)
		.set({
			publishedAt: new Date(source.date_published),
			...(keepDownloads ? { downloads: source.downloads } : {})
		})
		.where(eq(versions.id, published.version.id));
}

async function importVersions(
	ctx: ImportContext,
	report: ImportReport,
	project: Project,
	ownerId: string,
	options: ImportOptions,
	base: string
): Promise<void> {
	const list = await getJson<ModrinthVersion[]>(ctx, `${base}/version`);
	const present = new Set(
		(
			await ctx.db
				.select({ number: versions.versionNumber })
				.from(versions)
				.where(eq(versions.projectId, project.id))
		).map((v) => v.number)
	);
	for (const version of newestVersions(list, options.versions)) {
		const number = version.version_number;
		if (present.has(number)) {
			report.versions.push({ number, result: 'present' });
			continue;
		}
		ctx.log?.(`version ${number}…`);
		try {
			await importVersion(ctx, project, ownerId, version, options.keepDownloads ?? false);
			report.versions.push({ number, result: 'imported' });
		} catch (cause) {
			report.versions.push({ number, result: 'failed', detail: (cause as Error).message });
		}
	}
}

/** A new project goes public once it has at least one version, dated as on Modrinth. */
async function finish(
	ctx: ImportContext,
	report: ImportReport,
	source: ModrinthProject,
	options: ImportOptions
): Promise<void> {
	const imported = report.versions.filter((v) => v.result === 'imported').length;
	if (report.created && imported > 0)
		await ctx.db
			.update(projects)
			.set({
				status: 'approved',
				createdAt: new Date(source.published),
				publishedAt: new Date(source.published),
				...(options.keepDownloads ? { downloads: source.downloads } : {})
			})
			.where(eq(projects.id, report.projectId));
	await refreshProjectCache(ctx.db, report.projectId);
	await audit(ctx.db, {
		actorId: null,
		action: 'project.imported',
		targetType: 'project',
		targetId: report.projectId,
		details: { source: 'modrinth', modrinthId: source.id, versions: report.versions }
	});
}

/** The project's owner: its current one, the account asked for, or a new one for the Modrinth owner. */
async function chooseOwner(
	ctx: ImportContext,
	report: ImportReport,
	existing: Project | null,
	options: ImportOptions,
	base: string
): Promise<{ id: string; username: string }> {
	if (existing) return ownerOfProject(ctx.db, existing.id);
	if (options.owner) return userNamed(ctx.db, options.owner);
	return accountFor(ctx, report, await getJson<ModrinthMember[]>(ctx, `${base}/members`));
}

export async function importFromModrinth(
	ctx: ImportContext,
	slug: string,
	options: ImportOptions
): Promise<ImportReport> {
	const base = `/project/${encodeURIComponent(slug)}`;
	const source = await getJson<ModrinthProject>(ctx, base);
	const type = projectTypeOf(source);
	const report: ImportReport = {
		projectId: '',
		path: '',
		created: false,
		owner: '',
		versions: [],
		images: { imported: 0, failed: [] }
	};
	const existing = await getProjectBySlug(ctx.db, type, slugOf(source));
	const owner = await chooseOwner(ctx, report, existing, options, base);
	ctx.log?.(
		existing ? `updating ${source.title}…` : `creating ${source.title} for ${owner.username}…`
	);
	const project = existing ?? (await createFrom(ctx, report, source, type, owner.id));
	Object.assign(report, {
		projectId: project.id,
		path: projectPath(type, project.slug),
		created: !existing,
		owner: owner.username
	});
	await importVersions(ctx, report, project, owner.id, options, base);
	await finish(ctx, report, source, options);
	return report;
}
