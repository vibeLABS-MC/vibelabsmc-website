import { strToU8, zipSync } from 'fflate';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type AddressInfo, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	ArchiveError,
	checkLayout,
	listEntries,
	readEntries,
	unsupportedLoaders
} from './archive.ts';
import { cleanFilename, filePath, keep, receive, UploadError } from './receive.ts';
import { batchEntries, combine, isLowRisk, scanArchive } from './scan.ts';

const dir = mkdtempSync(join(tmpdir(), 'uploads-'));
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
let clamd: Server;
let clamdTarget: string;
let streams = 0;

beforeAll(async () => {
	clamd = createServer((socket) => {
		streams++;
		let buffer = Buffer.alloc(0);
		let data = Buffer.alloc(0);
		let started = false;
		socket.on('data', (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]);
			if (!started) {
				const end = buffer.indexOf(0);
				if (end < 0) return;
				started = true;
				buffer = buffer.subarray(end + 1);
			}
			while (buffer.length >= 4) {
				const length = buffer.readUInt32BE(0);
				if (length === 0)
					return void socket.end(data.includes(EICAR) ? 'stream: Eicar FOUND\0' : 'stream: OK\0');
				if (buffer.length < 4 + length) return;
				data = Buffer.concat([data, buffer.subarray(4, 4 + length)]);
				buffer = buffer.subarray(4 + length);
			}
		});
	});
	await new Promise<void>((r) => clamd.listen(0, '127.0.0.1', r));
	clamdTarget = `tcp://127.0.0.1:${(clamd.address() as AddressInfo).port}`;
});
afterAll(() => {
	clamd.close();
	rmSync(dir, { recursive: true, force: true });
});

function zipFile(name: string, files: Record<string, string | Uint8Array>): string {
	const path = join(dir, name);
	const entries = Object.fromEntries(
		Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v])
	);
	// Stored, not deflated: the fake scanner looks at raw bytes (real clamd unpacks archives itself).
	writeFileSync(path, zipSync(entries, { level: 0 }));
	return path;
}

const streamOf = (...chunks: Uint8Array[]) =>
	new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		}
	});

describe('receive', () => {
	it('writes the upload to disk and hashes it on the way', async () => {
		const bytes = new TextEncoder().encode('shader pack bytes');
		const got = await receive(streamOf(bytes.subarray(0, 5), bytes.subarray(5)), dir);

		expect(got.size).toBe(bytes.length);
		expect(got.sha1).toBe(createHash('sha1').update(bytes).digest('hex'));
		expect(got.sha512).toBe(createHash('sha512').update(bytes).digest('hex'));
		expect(readFileSync(got.path)).toEqual(Buffer.from(bytes));

		const stored = await keep(dir, got);
		expect(stored).toBe(filePath(dir, got.sha512));
		expect(existsSync(stored)).toBe(true);
		expect(existsSync(got.path)).toBe(false);
	});

	it('stops at the size limit, refuses empty files and leaves nothing behind', async () => {
		await expect(receive(streamOf(new Uint8Array(6), new Uint8Array(6)), dir, 10)).rejects.toThrow(
			UploadError
		);
		await expect(receive(streamOf(), dir)).rejects.toThrow('The file is empty.');
		expect(readFileSyncSafe(join(dir, 'tmp'))).toEqual([]);
	});
});

function readFileSyncSafe(folder: string): string[] {
	return existsSync(folder) ? require('node:fs').readdirSync(folder) : [];
}

describe('cleanFilename', () => {
	it('keeps ordinary names and strips paths and hostile characters', () => {
		expect(cleanFilename('BSL_v8.2.09.zip')).toBe('BSL_v8.2.09.zip');
		expect(cleanFilename('C:\\Users\\me\\pack (1).zip')).toBe('pack (1).zip');
		expect(cleanFilename('../../etc/passwd')).toBe('passwd');
		expect(cleanFilename('evil";\n<script>.zip')).toBe('evil____script_.zip');
		expect(cleanFilename('...hidden.zip')).toBe('hidden.zip');
		expect(cleanFilename('')).toBe('file');
	});
});

describe('listEntries', () => {
	it('lists entries with their sizes', async () => {
		const path = zipFile('ok.zip', { 'shaders/final.fsh': 'void main(){}', 'shaders/': '' });
		const entries = await listEntries(path);

		expect(entries.find((e) => e.name === 'shaders/final.fsh')).toMatchObject({
			size: 13,
			directory: false
		});
	});

	it('refuses files that are not zips', async () => {
		const path = join(dir, 'not.zip');
		writeFileSync(path, 'hello');
		await expect(listEntries(path)).rejects.toThrow(ArchiveError);
	});

	it('refuses an entry that expands like a zip bomb', async () => {
		const path = join(dir, 'bomb.zip');
		writeFileSync(path, zipSync({ 'a.txt': new Uint8Array(20 * 1024 * 1024) }, { level: 9 }));
		await expect(listEntries(path)).rejects.toThrow('zip bomb');
	});

	it('streams the entries asked for', async () => {
		const path = zipFile('read.zip', { 'a.txt': 'alpha', 'b.txt': 'beta' });
		const seen: string[] = [];
		for await (const { entry, stream } of readEntries(path, (e) => e.name === 'b.txt')) {
			let text = '';
			for await (const chunk of stream) text += chunk;
			seen.push(`${entry.name}=${text}`);
		}
		expect(seen).toEqual(['b.txt=beta']);
	});
});

describe('checkLayout', () => {
	it('wants a shaders/ folder in a shader pack, at the top or one folder down', () => {
		expect(checkLayout('shader', ['shaders/final.fsh']).problems).toEqual([]);
		expect(checkLayout('shader', ['BSL/shaders/final.fsh']).problems).toEqual([]);
		expect(checkLayout('shader', ['a/b/shaders/final.fsh']).problems).toHaveLength(1);
	});

	it('wants pack.mcmeta in texture packs, and data/ too in data packs', () => {
		expect(checkLayout('resourcepack', ['pack.mcmeta', 'assets/x.png']).problems).toEqual([]);
		expect(checkLayout('resourcepack', ['assets/x.png']).problems).toHaveLength(1);
		expect(checkLayout('datapack', ['pack.mcmeta', 'data/x/recipe/a.json']).problems).toEqual([]);
		expect(checkLayout('datapack', ['pack.mcmeta']).problems).toEqual([
			'A data pack needs a data/ folder.'
		]);
		expect(checkLayout('datapack', []).problems).toHaveLength(2);
	});

	it('reads which loaders a mod jar supports from its manifests', () => {
		expect(checkLayout('mod', ['fabric.mod.json']).loaders).toEqual(['fabric', 'quilt']);
		expect(checkLayout('mod', ['META-INF/neoforge.mods.toml']).loaders).toEqual(['neoforge']);
		expect(checkLayout('mod', ['META-INF/mods.toml']).loaders).toEqual(['forge', 'neoforge']);
		expect(checkLayout('mod', ['readme.txt']).problems).toHaveLength(1);
		expect(unsupportedLoaders(['fabric', 'forge'], ['fabric', 'quilt'])).toEqual(['forge']);
	});
});

describe('scanning', () => {
	it('sends a small archive to the scanner whole', async () => {
		const clean = zipFile('clean.zip', { 'shaders/a.fsh': 'x' });
		const dirty = zipFile('dirty.zip', { 'shaders/a.fsh': 'x', 'payload.bin': EICAR });

		expect(await scanArchive(clamdTarget, clean, await listEntries(clean))).toEqual({
			status: 'clean',
			detail: null
		});
		expect(await scanArchive(clamdTarget, dirty, await listEntries(dirty))).toEqual({
			status: 'infected',
			detail: 'Eicar'
		});
	});

	it('scans a big archive entry by entry, and finds what hides inside', async () => {
		const noise = () => new Uint8Array(randomBytes(13 * 1024 * 1024));
		const path = zipFile('big.zip', {
			'a.png': noise(),
			'b.png': noise(),
			'evil.class': EICAR,
			'c.json': '{}'
		});
		streams = 0;

		expect(await scanArchive(clamdTarget, path, await listEntries(path))).toEqual({
			status: 'infected',
			detail: 'Eicar'
		});
		expect(streams).toBe(1);

		const tidy = zipFile('big-clean.zip', {
			'a.png': noise(),
			'b.png': noise(),
			'Main.class': 'bytecode'
		});
		streams = 0;
		expect(await scanArchive(clamdTarget, tidy, await listEntries(tidy))).toEqual({
			status: 'clean',
			detail: null
		});
		expect(streams).toBe(3);
	}, 30_000);

	it('sends entries too big to scan to a moderator', async () => {
		const huge = new Uint8Array(randomBytes(26 * 1024 * 1024));
		const path = zipFile('huge.zip', { 'world.png': huge });

		expect(await scanArchive(clamdTarget, path, await listEntries(path))).toEqual({
			status: 'review',
			detail: '"world.png" is too large to scan automatically.'
		});
	}, 30_000);

	it('batches low-risk entries and combines verdicts', () => {
		const e = (name: string, size: number) => ({
			name,
			size,
			compressedSize: size,
			directory: false
		});

		expect(
			batchEntries([e('a', 6), e('b', 5), e('c', 9)], 10).map((b) => b.map((x) => x.name))
		).toEqual([['a'], ['b'], ['c']]);
		expect(
			batchEntries([e('a', 3), e('b', 3), e('c', 3), e('d', 3)], 10).map((b) => b.length)
		).toEqual([3, 1]);
		expect(isLowRisk('textures/block/stone.png')).toBe(true);
		expect(isLowRisk('com/x/Main.class')).toBe(false);
		expect(combine([{ status: 'clean' }, { status: 'error', detail: 'down' }])).toEqual({
			status: 'error',
			detail: 'down'
		});
		expect(
			combine([
				{ status: 'error', detail: 'down' },
				{ status: 'infected', signature: 'X' }
			])
		).toEqual({ status: 'infected', detail: 'X' });
		expect(combine([])).toEqual({ status: 'clean', detail: null });
	});
});
