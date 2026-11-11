import { error, redirect } from '@sveltejs/kit';
import { nextFrom } from '#lib/server/auth/pages.ts';
import {
	OAUTH_COOKIE,
	authorizationUrl,
	createPkce,
	encodeState,
	providerSpecs,
	type OAuthState,
	type ProviderId
} from '#lib/server/auth/oauth.ts';
import { limitRequest } from '#lib/server/http.ts';
import { randomToken } from '#lib/server/security/crypto.ts';
import type { RequestHandler } from './$types';

const MODES: OAuthState['mode'][] = ['login', 'link', 'confirm'];

/** Leaves for GitHub or Discord, remembering (in a short-lived cookie) how to come back. */
export const GET: RequestHandler = ({ params, url, locals, cookies }) => {
	limitRequest(locals, 'oauth', locals.ipHash);
	const provider = params.provider as ProviderId;
	const client = locals.config[provider];
	if (!client) error(404, 'Not found');

	const requested = url.searchParams.get('mode') as OAuthState['mode'];
	const mode = MODES.includes(requested) ? requested : 'login';
	if (mode !== 'login' && !locals.user)
		redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);

	const { verifier, challenge } = createPkce();
	const state = randomToken();
	const next = nextFrom(locals, url, mode === 'link' ? '/settings/account' : '/dashboard');
	cookies.set(OAUTH_COOKIE, encodeState({ state, verifier, next, mode }), {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});
	const spec = providerSpecs(locals.config.endpoints)[provider];
	redirect(
		302,
		authorizationUrl(spec, client, {
			state,
			challenge,
			redirectUri: `${locals.config.origin}/auth/${provider}/callback`
		}),
		{ external: [new URL(spec.authorizeUrl).origin] }
	);
};
