import { error } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { exportAccount } from '#lib/server/auth/account.ts';
import { limitRequest } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

/** Everything stored about the signed-in person, as a JSON download. */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Sign in first.');
	limitRequest(locals, 'emailSend', `export:${locals.user.id}`);
	const data = await exportAccount(locals.db, locals.user.id);
	await audit(locals.db, {
		actorId: locals.user.id,
		action: 'account.exported',
		targetType: 'user',
		targetId: locals.user.id,
		ipHash: locals.ipHash
	});
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="vibelabs-${locals.user.username ?? locals.user.id}.json"`,
			'cache-control': 'private, no-store'
		}
	});
};
