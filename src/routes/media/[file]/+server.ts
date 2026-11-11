import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { imagePath, isImageKey } from '#lib/server/media/images.ts';
import type { RequestHandler } from './$types';

/**
 * Re-encoded images (avatars, icons, gallery). Names are content hashes, so a file never
 * changes and browsers may keep it for a year. In production nginx serves /media/ straight
 * from disk with the same headers; this route covers development and tests.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const match = /^([0-9a-f]{64})(\.thumb)?\.webp$/.exec(params.file);
	if (!match || !isImageKey(match[1]!)) error(404, 'Not found');
	try {
		const bytes = await readFile(imagePath(locals.config.storageDir, match[1]!, !!match[2]));
		return new Response(bytes, {
			headers: {
				'content-type': 'image/webp',
				'cache-control': 'public, max-age=31536000, immutable',
				'content-security-policy': "default-src 'none'; sandbox",
				'x-content-type-options': 'nosniff'
			}
		});
	} catch {
		error(404, 'Not found');
	}
};
