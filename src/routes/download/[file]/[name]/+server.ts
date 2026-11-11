import { error } from '@sveltejs/kit';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { memberRole } from '#lib/server/marketplace/projects.ts';
import {
	DownloadCounter,
	recordDownload,
	resolveDownload
} from '#lib/server/marketplace/releases.ts';
import { filePath } from '#lib/server/uploads/receive.ts';
import type { RequestHandler } from './$types';

const counter = new DownloadCounter();

/**
 * Downloads: checks the visitor may have the file, counts it (once per visitor per day), then
 * hands the bytes to nginx (X-Accel-Redirect) in production or streams them itself elsewhere.
 * Files are always attachments with a sandbox policy, so a browser never runs or renders one.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const viewer = locals.user
		? {
				role: locals.user.role,
				membership: (projectId: string) => memberRole(locals.db, projectId, locals.user!.id)
			}
		: null;
	const download = await resolveDownload(locals.db, params.file, viewer);
	if (!download) error(404, 'Not found');

	if (counter.shouldCount(locals.ipHash, download.file.id))
		await recordDownload(locals.db, download);

	const name = download.file.filename;
	const headers: Record<string, string> = {
		'content-type': 'application/octet-stream',
		'content-disposition': `attachment; filename="${name.replace(/["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
		'content-security-policy': "default-src 'none'; sandbox",
		'x-content-type-options': 'nosniff',
		'cache-control': 'private, no-store',
		'x-sha1': download.file.sha1
	};
	const sha = download.file.sha512;
	if (locals.config.fileDelivery === 'x-accel')
		return new Response(null, {
			headers: {
				...headers,
				'x-accel-redirect': `/__files/${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}`
			}
		});

	const path = filePath(locals.config.storageDir, sha);
	const info = await stat(path).catch(() => null);
	if (!info) error(404, 'Not found');
	return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
		headers: { ...headers, 'content-length': String(info.size) }
	});
};
