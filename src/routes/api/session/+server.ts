import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Who is signed in, for the docs site's header. Only the origins in ACCOUNT_ORIGINS may read it
 * with credentials; the answer holds nothing private (no email, no IDs beyond the username).
 */
function cors(origin: string | null, allowed: string[]): Record<string, string> {
	if (!origin || !allowed.includes(origin)) return { vary: 'Origin' };
	return {
		'access-control-allow-origin': origin,
		'access-control-allow-credentials': 'true',
		'access-control-allow-methods': 'GET',
		vary: 'Origin'
	};
}

export const GET: RequestHandler = ({ locals, request }) => {
	const user = locals.user;
	const body = user?.username
		? {
				signedIn: true,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarKey ? `${locals.config.origin}/media/${user.avatarKey}.webp` : null,
				profileUrl: `${locals.config.origin}/user/${user.username}`
			}
		: { signedIn: false };
	return json(body, {
		headers: {
			...cors(request.headers.get('origin'), locals.config.accountOrigins),
			'cache-control': 'private, no-store'
		}
	});
};

export const OPTIONS: RequestHandler = ({ locals, request }) =>
	new Response(null, {
		status: 204,
		headers: {
			...cors(request.headers.get('origin'), locals.config.accountOrigins),
			'access-control-max-age': '600'
		}
	});
