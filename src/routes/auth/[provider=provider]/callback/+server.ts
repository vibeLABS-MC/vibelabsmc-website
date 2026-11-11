import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { signIn } from '#lib/server/auth/flow.ts';
import {
	OAUTH_COOKIE,
	decodeState,
	exchangeCode,
	fetchProfile,
	providerSpecs,
	type OAuthState,
	type ProviderId,
	type ProviderProfile
} from '#lib/server/auth/oauth.ts';
import { grantSudo } from '#lib/server/auth/session.ts';
import { linkProvider, oauthSignIn } from '#lib/server/auth/users.ts';
import { oauthAccounts, users } from '#lib/server/db/schema.ts';
import { limitRequest } from '#lib/server/http.ts';
import { importAvatar } from '#lib/server/media/images.ts';
import { safeEqual } from '#lib/server/security/crypto.ts';
import type { RequestEvent, RequestHandler } from './$types';

const back = (path: string, code: string): never =>
	redirect(303, `${path}${path.includes('?') ? '&' : '?'}${code}`);

async function profileFrom(
	event: RequestEvent,
	provider: ProviderId,
	saved: OAuthState
): Promise<ProviderProfile> {
	const { locals, url } = event;
	const spec = providerSpecs(locals.config.endpoints)[provider];
	const client = locals.config[provider]!;
	try {
		const token = await exchangeCode(fetch, spec, client, {
			code: url.searchParams.get('code') ?? '',
			verifier: saved.verifier,
			redirectUri: `${locals.config.origin}/auth/${provider}/callback`
		});
		return await fetchProfile(fetch, spec, token);
	} catch (cause) {
		console.warn(`[oauth] ${provider} sign-in failed:`, (cause as Error).message);
		return back(saved.mode === 'login' ? '/login' : '/settings/account', 'error=provider-failed');
	}
}

async function link(
	event: RequestEvent,
	provider: ProviderId,
	profile: ProviderProfile,
	saved: OAuthState
): Promise<never> {
	const { locals } = event;
	const user = locals.user!;
	const result = await linkProvider(
		locals.db,
		user.id,
		provider,
		profile,
		locals.config.adminGithubIds
	);
	if (result === 'linked')
		await audit(locals.db, {
			actorId: user.id,
			action: 'auth.provider_linked',
			targetType: 'user',
			targetId: user.id,
			details: { provider, providerUsername: profile.username },
			ipHash: locals.ipHash
		});
	return back(saved.next, `notice=${result === 'linked' ? 'linked' : `link-${result}`}`);
}

async function confirm(
	event: RequestEvent,
	provider: ProviderId,
	profile: ProviderProfile,
	saved: OAuthState
): Promise<never> {
	const { locals } = event;
	const [owned] = await locals.db
		.select({ userId: oauthAccounts.userId })
		.from(oauthAccounts)
		.where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, profile.id)));
	if (owned?.userId !== locals.user!.id || !locals.session)
		back(`/auth/confirm?next=${encodeURIComponent(saved.next)}`, 'error=wrong-account');
	await grantSudo(locals.db, locals.session!.id);
	return redirect(303, saved.next, { external: locals.config.accountOrigins });
}

async function login(
	event: RequestEvent,
	provider: ProviderId,
	profile: ProviderProfile,
	saved: OAuthState
): Promise<never> {
	const { locals, cookies, request } = event;
	const result = await oauthSignIn(locals.db, {
		provider,
		profile,
		adminGithubIds: locals.config.adminGithubIds,
		avatarKey: null
	});
	let user = result.user;
	if (user.bannedAt) back('/login', 'error=suspended');
	if (result.created) {
		const avatarKey = await importAvatar(fetch, locals.config.storageDir, profile.avatarUrl);
		if (avatarKey) {
			await locals.db.update(users).set({ avatarKey }).where(eq(users.id, user.id));
			user = { ...user, avatarKey };
		}
		await audit(locals.db, {
			actorId: user.id,
			action: 'auth.sign_up',
			targetType: 'user',
			targetId: user.id,
			details: { method: provider, admin: result.promoted },
			ipHash: locals.ipHash
		});
	}
	const to = await signIn(
		{ locals, cookies, userAgent: request.headers.get('user-agent') ?? '' },
		user,
		provider,
		saved.next
	);
	return redirect(303, to, { external: locals.config.accountOrigins });
}

/** GitHub or Discord sends the browser back here with a code; the state must match the cookie. */
export const GET: RequestHandler = async (event) => {
	const { params, url, locals, cookies } = event;
	limitRequest(locals, 'oauth', locals.ipHash);
	const provider = params.provider as ProviderId;
	if (!locals.config[provider]) error(404, 'Not found');

	const saved = decodeState(cookies.get(OAUTH_COOKIE));
	cookies.delete(OAUTH_COOKIE, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
	const state = url.searchParams.get('state') ?? '';
	if (!saved || !state || !safeEqual(state, saved.state)) back('/login', 'notice=expired');
	if (url.searchParams.has('error') || !url.searchParams.get('code'))
		back(saved!.mode === 'login' ? '/login' : '/settings/account', 'error=cancelled');
	if (saved!.mode !== 'login' && !locals.user) back('/login', 'notice=expired');

	const profile = await profileFrom(event, provider, saved!);
	if (saved!.mode === 'link') return link(event, provider, profile, saved!);
	if (saved!.mode === 'confirm') return confirm(event, provider, profile, saved!);
	return login(event, provider, profile, saved!);
};
