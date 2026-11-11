/**
 * Every picture on the site (avatars, project icons, gallery shots) is decoded and re-encoded
 * here as WebP. Re-encoding drops metadata (camera, GPS), flattens animations and destroys any
 * file that only pretends to be an image, so nothing uploaded is ever served as it arrived.
 */
import { createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp, { type Metadata } from 'sharp';

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

export interface ImageSpec {
	width: number;
	height: number;
	/** `cover` crops to exactly width x height; `inside` keeps the whole picture within it. */
	fit: 'cover' | 'inside';
	/** Also write a smaller copy for cards and grids. */
	thumb?: { width: number; height: number };
}

export const IMAGE_SPECS = {
	avatar: { width: 256, height: 256, fit: 'cover' },
	icon: { width: 512, height: 512, fit: 'cover' },
	gallery: { width: 2560, height: 2560, fit: 'inside', thumb: { width: 800, height: 450 } }
} as const satisfies Record<string, ImageSpec>;

export type ImageKind = keyof typeof IMAGE_SPECS;

export interface StoredImage {
	key: string;
	width: number;
	height: number;
}

export class ImageError extends Error {}

/** Image keys are the SHA-256 (hex) of the WebP bytes: identical pictures are stored once. */
export const isImageKey = (key: string): boolean => /^[0-9a-f]{64}$/.test(key);

export const imagePath = (storageDir: string, key: string, thumb = false): string =>
	join(storageDir, 'images', key.slice(0, 2), `${key}${thumb ? '.thumb' : ''}.webp`);

export const imageUrl = (key: string, thumb = false): string =>
	`/media/${key}${thumb ? '.thumb' : ''}.webp`;

async function writeAtomically(path: string, bytes: Buffer): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
	await writeFile(temporary, bytes);
	await rename(temporary, path);
}

async function readable(input: Buffer): Promise<Metadata> {
	if (input.length === 0) throw new ImageError('The file is empty.');
	if (input.length > IMAGE_MAX_BYTES) throw new ImageError('Images can be at most 8 MB.');
	try {
		const metadata = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
		if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) throw new Error('format');
		return metadata;
	} catch {
		throw new ImageError('That file is not a PNG, JPEG, WebP, GIF or AVIF image.');
	}
}

const encode = (input: Buffer, width: number, height: number, fit: 'cover' | 'inside') =>
	sharp(input, { limitInputPixels: 50_000_000, animated: false })
		.rotate()
		.resize({ width, height, fit, withoutEnlargement: fit === 'inside', position: 'attention' })
		.webp({ quality: 86, effort: 4 })
		.toBuffer({ resolveWithObject: true });

export async function storeImage(
	storageDir: string,
	input: Buffer,
	kind: ImageKind
): Promise<StoredImage> {
	await readable(input);
	const spec: ImageSpec = IMAGE_SPECS[kind];
	const { data, info } = await encode(input, spec.width, spec.height, spec.fit);
	const key = createHash('sha256').update(data).digest('hex');
	await writeAtomically(imagePath(storageDir, key), data);
	if (spec.thumb) {
		const thumb = await encode(input, spec.thumb.width, spec.thumb.height, 'cover');
		await writeAtomically(imagePath(storageDir, key, true), thumb.data);
	}
	return { key, width: info.width, height: info.height };
}

/**
 * Downloads a profile picture from GitHub or Discord. The address is always one the server
 * built itself from the profile ID, never one a profile supplied, so this can't be pointed at
 * internal addresses. Any failure just means no avatar.
 */
export async function importAvatar(
	fetchFn: typeof fetch,
	storageDir: string,
	url: string | null
): Promise<string | null> {
	if (!url) return null;
	try {
		const response = await fetchFn(url, { signal: AbortSignal.timeout(5000), redirect: 'follow' });
		const length = Number(response.headers.get('content-length') ?? 0);
		if (!response.ok || length > IMAGE_MAX_BYTES) return null;
		const bytes = Buffer.from(await response.arrayBuffer());
		return (await storeImage(storageDir, bytes, 'avatar')).key;
	} catch {
		return null;
	}
}
