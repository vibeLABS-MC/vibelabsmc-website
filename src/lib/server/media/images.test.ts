import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { ImageError, imagePath, imageUrl, importAvatar, isImageKey, storeImage } from './images.ts';

const dir = mkdtempSync(join(tmpdir(), 'images-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const png = (width: number, height: number) =>
	sharp({ create: { width, height, channels: 3, background: { r: 68, g: 76, b: 231 } } })
		.withExif({ IFD0: { Copyright: 'secret-location' } })
		.jpeg()
		.toBuffer();

describe('storeImage', () => {
	it('crops avatars to 256x256 WebP, named by content, without metadata', async () => {
		const stored = await storeImage(dir, await png(800, 600), 'avatar');

		expect(isImageKey(stored.key)).toBe(true);
		expect(stored).toMatchObject({ width: 256, height: 256 });
		const bytes = readFileSync(imagePath(dir, stored.key));
		const meta = await sharp(bytes).metadata();
		expect(meta.format).toBe('webp');
		expect(meta.exif).toBeUndefined();
		expect(bytes.toString('latin1')).not.toContain('secret-location');
	});

	it('keeps gallery shots whole, never enlarges them, and writes a card-sized copy', async () => {
		const stored = await storeImage(dir, await png(1200, 500), 'gallery');

		expect(stored).toMatchObject({ width: 1200, height: 500 });
		const thumb = await sharp(readFileSync(imagePath(dir, stored.key, true))).metadata();
		expect([thumb.width, thumb.height]).toEqual([800, 450]);
	});

	it('stores the same picture once', async () => {
		const input = await png(300, 300);

		expect((await storeImage(dir, input, 'icon')).key).toBe(
			(await storeImage(dir, input, 'icon')).key
		);
	});

	it('refuses empty files, oversized files and files that are not images', async () => {
		await expect(storeImage(dir, Buffer.alloc(0), 'icon')).rejects.toThrow('The file is empty.');
		await expect(storeImage(dir, Buffer.alloc(9 * 1024 * 1024), 'icon')).rejects.toThrow(
			'Images can be at most 8 MB.'
		);
		await expect(storeImage(dir, Buffer.from('<svg onload=alert(1)>'), 'icon')).rejects.toThrow(
			ImageError
		);
		await expect(
			storeImage(
				dir,
				Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
				'icon'
			)
		).rejects.toThrow('not a PNG, JPEG, WebP, GIF or AVIF');
	});
});

describe('paths and URLs', () => {
	it('spreads images over folders by the first two characters of the key', () => {
		const key = 'ab' + '0'.repeat(62);

		expect(imagePath('/data', key)).toBe(join('/data', 'images', 'ab', `${key}.webp`));
		expect(imagePath('/data', key, true)).toBe(join('/data', 'images', 'ab', `${key}.thumb.webp`));
		expect(imageUrl(key)).toBe(`/media/${key}.webp`);
		expect(imageUrl(key, true)).toBe(`/media/${key}.thumb.webp`);
		expect(isImageKey('../etc/passwd')).toBe(false);
		expect(isImageKey('AB' + '0'.repeat(62))).toBe(false);
	});
});

describe('importAvatar', () => {
	it('downloads and re-encodes a profile picture', async () => {
		const body = await png(64, 64);
		const fetchFn = vi.fn<typeof fetch>(
			async () => new Response(body, { headers: { 'content-length': String(body.length) } })
		);

		const key = await importAvatar(fetchFn, dir, 'https://avatars/u/1');
		expect(key && existsSync(imagePath(dir, key))).toBe(true);
	});

	it('gives up quietly: no address, an error reply, too big, not an image or offline', async () => {
		const reply = (body: BodyInit, init?: ResponseInit) =>
			vi.fn<typeof fetch>(async () => new Response(body, init));

		expect(await importAvatar(reply('x'), dir, null)).toBeNull();
		expect(await importAvatar(reply('x', { status: 404 }), dir, 'https://a')).toBeNull();
		expect(
			await importAvatar(
				reply('x', { headers: { 'content-length': '99999999' } }),
				dir,
				'https://a'
			)
		).toBeNull();
		expect(await importAvatar(reply('not an image'), dir, 'https://a')).toBeNull();
		const offline = vi.fn<typeof fetch>(async () => {
			throw new Error('offline');
		});
		expect(await importAvatar(offline, dir, 'https://a')).toBeNull();
	});
});
