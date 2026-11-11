/**
 * Streams an upload straight to disk while hashing it (SHA-1 and SHA-512, the hashes launchers
 * use to identify files), stopping the moment it passes the size limit. Nothing is held in memory.
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { newId } from '../security/crypto.ts';

export const FILE_MAX_BYTES = 100 * 1024 * 1024;

export class UploadError extends Error {}

export interface Received {
	path: string;
	size: number;
	sha1: string;
	sha512: string;
}

export const stagedPath = (storageDir: string, id: string) =>
	join(storageDir, 'tmp', `${id}.upload`);

/** Where a published file lives: by its SHA-512, so identical files are stored once. */
export const filePath = (storageDir: string, sha512: string) =>
	join(storageDir, 'files', sha512.slice(0, 2), sha512.slice(2, 4), sha512);

export async function receive(
	body: ReadableStream<Uint8Array>,
	storageDir: string,
	limit = FILE_MAX_BYTES
): Promise<Received> {
	const path = stagedPath(storageDir, newId(16));
	await mkdir(dirname(path), { recursive: true });
	const out = createWriteStream(path, { flags: 'wx' });
	const sha1 = createHash('sha1');
	const sha512 = createHash('sha512');
	let size = 0;
	try {
		for await (const chunk of body) {
			size += chunk.length;
			if (size > limit) throw new UploadError(`Files can be at most ${limit / 1024 / 1024} MB.`);
			sha1.update(chunk);
			sha512.update(chunk);
			if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
		}
		await new Promise<void>((resolve, reject) =>
			out.end((cause?: Error | null) => (cause ? reject(cause) : resolve()))
		);
		if (size === 0) throw new UploadError('The file is empty.');
		return { path, size, sha1: sha1.digest('hex'), sha512: sha512.digest('hex') };
	} catch (cause) {
		// Let the file close before deleting it (Windows keeps an open file listed until then).
		out.destroy();
		if (!out.closed) await new Promise((resolve) => out.once('close', resolve));
		await rm(path, { force: true });
		throw cause;
	}
}

/** Moves a received upload into permanent storage (a no-op if the same file is already there). */
export async function keep(
	storageDir: string,
	received: Pick<Received, 'path' | 'sha512'>
): Promise<string> {
	const target = filePath(storageDir, received.sha512);
	await mkdir(dirname(target), { recursive: true });
	await rename(received.path, target);
	return target;
}

/** File names as shown in downloads: no paths, no control or shell-hostile characters. */
export function cleanFilename(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? '';
	const cleaned = base
		.normalize('NFKC')
		.replace(/[^\w.+\- ()[\]]/g, '_')
		.replace(/\s+/g, ' ')
		.replace(/^[.\s]+/, '')
		.trim()
		.slice(0, 120);
	return cleaned || 'file';
}
