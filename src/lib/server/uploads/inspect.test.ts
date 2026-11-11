import { strToU8, zipSync } from 'fflate';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EICAR, fakeClamd } from '../../../../tests/helpers/locals.ts';
import { extensionProblem, inspectUpload } from './inspect.ts';

const dir = mkdtempSync(join(tmpdir(), 'inspect-'));
let clamd: Awaited<ReturnType<typeof fakeClamd>>;
let broken: Awaited<ReturnType<typeof fakeClamd>>;
beforeAll(async () => {
	clamd = await fakeClamd();
	broken = await fakeClamd({ broken: true });
});
afterAll(() => {
	clamd.close();
	broken.close();
	rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function file(files: Record<string, string> | string): string {
	const path = join(dir, `f${n++}.zip`);
	writeFileSync(
		path,
		typeof files === 'string'
			? files
			: zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), {
					level: 0
				})
	);
	return path;
}

describe('extensionProblem', () => {
	it('wants .zip for packs and .jar for mods', () => {
		expect(extensionProblem('shader', 'Glow.ZIP')).toBeNull();
		expect(extensionProblem('mod', 'mod.jar')).toBeNull();
		expect(extensionProblem('mod', 'mod.zip')).toBe('Mods must be .jar files.');
		expect(extensionProblem('datapack', 'pack.rar')).toBe('Data packs must be .zip files.');
	});
});

describe('inspectUpload', () => {
	it('passes a real shader pack, scanned clean, and reports what it found', async () => {
		const result = await inspectUpload(file({ 'shaders/final.fsh': 'x' }), 'shader', clamd.target);
		expect(result).toEqual({
			ok: true,
			problems: [],
			scan: { status: 'clean', detail: null },
			detected: { loaders: [], entries: 1 }
		});
	});

	it('counts files as clean when no scanner is configured (development only)', async () => {
		const result = await inspectUpload(file({ 'fabric.mod.json': '{}' }), 'mod', null);
		expect(result).toMatchObject({
			ok: true,
			scan: { status: 'clean' },
			detected: { loaders: ['fabric', 'quilt'] }
		});
	});

	it('refuses and deletes a file that is not a zip, or is the wrong kind', async () => {
		const notZip = file('plain text');
		expect(await inspectUpload(notZip, 'shader', clamd.target)).toMatchObject({
			ok: false,
			problems: ['That file is not a valid zip archive.']
		});
		expect(existsSync(notZip)).toBe(false);

		const wrong = file({ 'readme.txt': 'hi' });
		expect((await inspectUpload(wrong, 'resourcepack', clamd.target)).problems).toEqual([
			'A texture pack needs pack.mcmeta at its top level.'
		]);
		expect(existsSync(wrong)).toBe(false);
	});

	it('refuses and deletes malware', async () => {
		const bad = file({ 'shaders/a.fsh': 'x', 'evil.bin': EICAR });
		const result = await inspectUpload(bad, 'shader', clamd.target);
		expect(result).toMatchObject({
			ok: false,
			problems: ['The virus scanner found Eicar in this file.'],
			scan: { status: 'infected' }
		});
		expect(existsSync(bad)).toBe(false);
	});

	it('keeps a file as pending when the scanner fails, for a later rescan', async () => {
		const path = file({ 'shaders/a.fsh': 'x' });
		const result = await inspectUpload(path, 'shader', broken.target);
		expect(result).toMatchObject({ ok: true, scan: { status: 'pending' } });
		expect(existsSync(path)).toBe(true);
	});
});
