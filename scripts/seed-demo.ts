/**
 * Fills a LOCAL development database with sample projects, so the marketplace can be looked at
 * and worked on without uploading things by hand. Refuses to run against anything but a local
 * PGlite database: it must never touch the real one.
 *
 *   bun run seed:demo        (uses DATABASE_URL and STORAGE_DIR from .env)
 */
import { strToU8, zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { openDatabase } from '../src/lib/server/db/index.ts';
import {
	files,
	follows,
	gallery,
	gameVersions,
	projectMembers,
	projects,
	reviews,
	users,
	versions
} from '../src/lib/server/db/schema.ts';
import { seedCategories } from '../src/lib/server/marketplace/catalog.ts';
import { recountProjects } from '../src/lib/server/marketplace/stats.ts';
import { refreshProjectCache } from '../src/lib/server/marketplace/projects.ts';
import { storeImage } from '../src/lib/server/media/images.ts';
import { filePath } from '../src/lib/server/uploads/receive.ts';
import { newId } from '../src/lib/server/security/crypto.ts';

try {
	process.loadEnvFile('.env');
} catch {
	// defaults below
}
const url = process.env.DATABASE_URL ?? 'pglite:./.data/pglite';
if (!url.startsWith('pglite:'))
	throw new Error('seed-demo only runs against a local pglite: database.');
const storage = process.env.STORAGE_DIR ?? '.data/storage';
const { db, close } = await openDatabase(url);

await seedCategories(db);
const RELEASES = [
	'1.21.4',
	'1.21.3',
	'1.21.1',
	'1.21',
	'1.20.6',
	'1.20.4',
	'1.20.2',
	'1.20.1',
	'1.20',
	'1.19.4',
	'1.19.2',
	'1.18.2'
];
await db
	.insert(gameVersions)
	.values(
		RELEASES.map((version, i) => ({
			version,
			kind: 'release',
			releasedAt: new Date(Date.UTC(2024, 11, 3) - i * 45 * 86_400_000)
		}))
	)
	.onConflictDoNothing();

const palette = [
	['#f79009', '#444ce7', '#0b1030'],
	['#17b26a', '#0e7090', '#06231c'],
	['#ee46bc', '#6172f3', '#1a0d2e'],
	['#f04438', '#fdb022', '#2a0f0a'],
	['#7a5af8', '#15b79e', '#101828'],
	['#2e90fa', '#f670c7', '#0c111d']
];
const art = (seed: number, w: number, h: number, label: string) => {
	const [a, b, bg] = palette[seed % palette.length]!;
	return sharp(
		Buffer.from(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g1" cx="20%" cy="90%" r="80%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx="85%" cy="10%" r="75%"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="${bg}"/><rect width="100%" height="100%" fill="url(#g1)"/><rect width="100%" height="100%" fill="url(#g2)"/><path d="M0 ${h * 0.72} Q ${w * 0.25} ${h * 0.55} ${w * 0.5} ${h * 0.7} T ${w} ${h * 0.62} V ${h} H 0 Z" fill="#000" fill-opacity="0.35"/><text x="50%" y="${h < 600 ? '58%' : '48%'}" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="700" font-size="${Math.round(h / (h < 600 ? 2.6 : 9))}" fill="#fff" fill-opacity="0.92">${label}</text></svg>`
		)
	)
		.png()
		.toBuffer();
};

const people = [
	{ username: 'sora', displayName: 'Sora', bio: 'Shader developer. Clouds, water and light.' },
	{ username: 'kit', displayName: 'Kit Marlowe', bio: 'Texture artist, 32x and LabPBR.' },
	{ username: 'pixel-pat', displayName: 'Pat', bio: 'Small mods that fix small annoyances.' },
	{ username: 'river', displayName: 'River', bio: 'Plays everything, reviews honestly.' }
];
const ids: Record<string, string> = {};
for (const p of people) {
	const [row] = await db
		.insert(users)
		.values({ id: newId(), ...p })
		.onConflictDoNothing()
		.returning();
	ids[p.username] = row?.id ?? (await db.select({ id: users.id }).from(users)).find(() => true)!.id;
}

const PROJECTS = [
	{
		type: 'shader',
		name: 'Glow Shaders',
		owner: 'sora',
		summary: 'Soft volumetric light, calm water and painterly clouds.',
		categories: ['semi-realistic', 'atmosphere', 'volumetric-clouds', 'water', 'medium'],
		loaders: ['iris', 'optifine'],
		downloads: 48210,
		license: 'CC-BY-NC-SA-4.0'
	},
	{
		type: 'shader',
		name: 'Nightfall PT',
		owner: 'sora',
		summary: 'Path-traced coloured lighting for Iris with denoised reflections.',
		categories: ['realistic', 'path-tracing', 'coloured-lighting', 'reflections', 'high'],
		loaders: ['iris'],
		downloads: 12904,
		license: 'GPL-3.0-only'
	},
	{
		type: 'shader',
		name: 'Lumen Lite',
		owner: 'pixel-pat',
		summary: 'Fast shadows and bloom that run on integrated graphics.',
		categories: ['vanilla-like', 'shadows', 'bloom', 'potato', 'low'],
		loaders: ['iris', 'optifine'],
		downloads: 90311,
		license: 'MIT'
	},
	{
		type: 'resourcepack',
		name: 'Hearthstone 32x',
		owner: 'kit',
		summary: 'Warm, hand-painted 32x textures with LabPBR materials.',
		categories: ['medieval', 'pbr-labpbr', 'blocks', '32x'],
		loaders: [],
		downloads: 30388,
		license: 'ARR'
	},
	{
		type: 'resourcepack',
		name: 'Clean GUI',
		owner: 'kit',
		summary: 'A crisp, flat interface that keeps vanilla’s colours.',
		categories: ['simplistic', 'gui', 'fonts', '16x'],
		loaders: [],
		downloads: 7120,
		license: 'CC-BY-4.0'
	},
	{
		type: 'mod',
		name: 'Shader Toggle',
		owner: 'pixel-pat',
		summary: 'One key to switch shader packs and presets in game.',
		categories: ['utility', 'client-side'],
		loaders: ['fabric', 'quilt', 'neoforge'],
		downloads: 21455,
		license: 'MIT'
	},
	{
		type: 'mod',
		name: 'Smooth Sky',
		owner: 'sora',
		summary: 'Removes cloud and sky popping when you change render distance.',
		categories: ['optimisation', 'client-side'],
		loaders: ['fabric', 'neoforge'],
		downloads: 5402,
		license: 'Apache-2.0'
	},
	{
		type: 'datapack',
		name: 'Lanterns Everywhere',
		owner: 'kit',
		summary: 'Villages light their paths at night with new lantern posts.',
		categories: ['decoration', 'world-generation'],
		loaders: [],
		downloads: 3311,
		license: 'CC0-1.0'
	},
	{
		type: 'datapack',
		name: 'Gentle Mobs',
		owner: 'pixel-pat',
		summary: 'Creepers that warn you, and phantoms only after five nights.',
		categories: ['game-mechanics', 'mobs'],
		loaders: [],
		downloads: 9877,
		license: 'MIT'
	}
] as const;

for (const [i, p] of PROJECTS.entries()) {
	const slug = p.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-$/, '');
	const id = newId();
	const icon = await storeImage(
		storage,
		await art(
			i,
			512,
			512,
			p.name
				.split(' ')
				.map((w) => w[0])
				.join('')
				.slice(0, 2)
		),
		'icon'
	);
	await db.insert(projects).values({
		id,
		slug,
		type: p.type,
		name: p.name,
		summary: p.summary,
		description: `## About\n\n${p.summary}\n\n**${p.name}** is sample content for local development: it shows how real projects look on the marketplace.\n\n## Features\n\n- Works with ${p.loaders.length ? p.loaders.join(', ') : 'vanilla Minecraft'}\n- Tested on ${RELEASES.slice(0, 3).join(', ')}\n\n## Installation\n\n1. Download the file for your Minecraft version.\n2. Put it in the right folder and enable it in game.\n`,
		iconKey: icon.key,
		status: 'approved',
		license: p.license,
		sourceUrl: 'https://github.com/vibeLABS-MC',
		categories: [...p.categories],
		downloads: p.downloads,
		publishedAt: new Date(Date.now() - (60 - i * 5) * 86_400_000)
	});
	await db
		.insert(projectMembers)
		.values({ projectId: id, userId: ids[p.owner]!, role: 'owner', acceptedAt: new Date() });
	for (let g = 0; g < 3; g++) {
		const shot = await storeImage(storage, await art(i + g, 1920, 1080, `${p.name}`), 'gallery');
		await db.insert(gallery).values({
			id: newId(),
			projectId: id,
			imageKey: shot.key,
			width: shot.width,
			height: shot.height,
			title: ['Sunset over the bay', 'Night with fog', 'Forest at noon'][g]!,
			featured: g === 0,
			sortOrder: g
		});
	}
	for (const [v, number] of ['1.2.0', '1.1.0', '1.0.0'].entries()) {
		const versionId = newId();
		const ext = p.type === 'mod' ? 'jar' : 'zip';
		const bytes = Buffer.from(
			zipSync({
				[p.type === 'shader'
					? 'shaders/final.fsh'
					: p.type === 'mod'
						? 'fabric.mod.json'
						: 'pack.mcmeta']: strToU8(`${p.name} ${number}`)
			})
		);
		const sha512 = createHash('sha512').update(bytes).digest('hex');
		const path = filePath(storage, sha512);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, bytes);
		await db.insert(versions).values({
			id: versionId,
			projectId: id,
			versionNumber: number,
			name: `${p.name} ${number}`,
			changelog:
				v === 0
					? '- Brighter sunsets\n- Fixed flickering water on AMD cards\n- New Ultra preset'
					: '- Bug fixes',
			channel: v === 0 && i % 3 === 1 ? 'beta' : 'release',
			gameVersions: RELEASES.slice(v * 2, v * 2 + 4),
			loaders: [...p.loaders],
			downloads: Math.round(p.downloads / (v + 2)),
			authorId: ids[p.owner]!,
			publishedAt: new Date(Date.now() - (v * 20 + i) * 86_400_000)
		});
		await db.insert(files).values({
			id: newId(),
			versionId,
			filename: `${slug}-${number}.${ext}`,
			size: bytes.length,
			sha1: createHash('sha1').update(bytes).digest('hex'),
			sha512,
			primary: true,
			scanStatus: 'clean',
			scannedAt: new Date()
		});
	}
	await refreshProjectCache(db, id);
	for (const [r, who] of ['river', 'kit', 'pixel-pat', 'sora'].entries()) {
		if (who === p.owner) continue;
		await db.insert(follows).values({ userId: ids[who]!, projectId: id }).onConflictDoNothing();
		if ((i + r) % 2 === 0)
			await db
				.insert(reviews)
				.values({
					id: newId(),
					projectId: id,
					userId: ids[who]!,
					rating: 5 - ((i + r) % 3),
					body: [
						'Beautiful, and it runs well on my laptop.',
						'Great work. The water reflections are the best I have seen.',
						'Lovely, but a little dark at night on the default preset.'
					][(i + r) % 3]!
				})
				.onConflictDoNothing();
	}
	await recountProjects(db, [id]);
}
await close();
console.log(`Seeded ${PROJECTS.length} sample projects into ${url}.`);
