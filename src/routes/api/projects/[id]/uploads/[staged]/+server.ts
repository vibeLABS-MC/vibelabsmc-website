import { error } from '@sveltejs/kit';
import { discardStaged } from '#lib/server/marketplace/releases.ts';
import type { RequestHandler } from './$types';

/** Remove an uploaded file that hasn't been published yet. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Sign in first.');
	const removed = await discardStaged(
		locals.db,
		locals.config.storageDir,
		params.staged,
		locals.user.id
	);
	if (!removed) error(404, 'Not found');
	return new Response(null, { status: 204 });
};
