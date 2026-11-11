/**
 * Sign-in with GitHub and Discord: the OAuth 2.0 authorization-code flow with PKCE (S256)
 * and a state value, asking for the smallest scopes that give a public profile. The provider's
 * access token is used once to read the profile and then dropped; it is never stored.
 */
import type { Endpoints, OAuthClient } from '../config.ts';
import { randomToken, sha256 } from '../security/crypto.ts';

export type ProviderId = 'github' | 'discord';
export const PROVIDERS: readonly ProviderId[] = ['github', 'discord'];
export const PROVIDER_NAMES: Record<ProviderId, string> = { github: 'GitHub', discord: 'Discord' };

export interface ProviderSpec {
	id: ProviderId;
	authorizeUrl: string;
	tokenUrl: string;
	profileUrl: string;
	scopes: string[];
	/** Discord wants the client credentials as HTTP Basic auth; GitHub in the form body. */
	clientAuth: 'basic' | 'body';
	toProfile: (json: Record<string, unknown>) => ProviderProfile;
}

export interface ProviderProfile {
	id: string;
	username: string;
	displayName: string;
	avatarUrl: string | null;
}

export const isProvider = (value: string): value is ProviderId =>
	(PROVIDERS as readonly string[]).includes(value);

const str = (value: unknown): string | null =>
	typeof value === 'string' && value.length > 0 ? value : null;

function requireId(json: Record<string, unknown>): string {
	const id = typeof json.id === 'number' ? String(json.id) : str(json.id);
	if (!id) throw new Error('The provider profile has no id.');
	return id;
}

export function githubProfile(json: Record<string, unknown>, avatarBase: string): ProviderProfile {
	const id = requireId(json);
	const login = str(json.login) ?? id;
	return {
		id,
		username: login,
		displayName: str(json.name) ?? login,
		avatarUrl: `${avatarBase}/u/${id}?s=256`
	};
}

export function discordProfile(json: Record<string, unknown>, cdnBase: string): ProviderProfile {
	const id = requireId(json);
	const username = str(json.username) ?? id;
	const avatar = str(json.avatar);
	return {
		id,
		username,
		displayName: str(json.global_name) ?? username,
		avatarUrl: avatar ? `${cdnBase}/avatars/${id}/${avatar}.png?size=256` : null
	};
}

export function providerSpecs(endpoints: Endpoints): Record<ProviderId, ProviderSpec> {
	return {
		github: {
			id: 'github',
			authorizeUrl: `${endpoints.githubAuth}/login/oauth/authorize`,
			tokenUrl: `${endpoints.githubAuth}/login/oauth/access_token`,
			profileUrl: `${endpoints.githubApi}/user`,
			scopes: [],
			clientAuth: 'body',
			toProfile: (json) => githubProfile(json, endpoints.githubAvatars)
		},
		discord: {
			id: 'discord',
			authorizeUrl: `${endpoints.discordAuth}/oauth2/authorize`,
			tokenUrl: `${endpoints.discordApi}/oauth2/token`,
			profileUrl: `${endpoints.discordApi}/users/@me`,
			scopes: ['identify'],
			clientAuth: 'basic',
			toProfile: (json) => discordProfile(json, endpoints.discordCdn)
		}
	};
}

export function createPkce(): { verifier: string; challenge: string } {
	const verifier = randomToken(32);
	return { verifier, challenge: sha256(verifier) };
}

export function authorizationUrl(
	spec: ProviderSpec,
	client: OAuthClient,
	options: { state: string; challenge: string; redirectUri: string }
): string {
	const url = new URL(spec.authorizeUrl);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', client.clientId);
	url.searchParams.set('redirect_uri', options.redirectUri);
	url.searchParams.set('state', options.state);
	url.searchParams.set('code_challenge', options.challenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('scope', spec.scopes.join(' '));
	// Discord: don't show the consent screen again to someone who already agreed.
	if (spec.id === 'discord') url.searchParams.set('prompt', 'none');
	// GitHub: never offer to create a GitHub account in the middle of signing in here.
	if (spec.id === 'github') url.searchParams.set('allow_signup', 'false');
	return url.toString();
}

export class OAuthError extends Error {}

export async function exchangeCode(
	fetchFn: typeof fetch,
	spec: ProviderSpec,
	client: OAuthClient,
	options: { code: string; verifier: string; redirectUri: string }
): Promise<string> {
	const form = new URLSearchParams({
		grant_type: 'authorization_code',
		code: options.code,
		redirect_uri: options.redirectUri,
		code_verifier: options.verifier
	});
	const headers: Record<string, string> = {
		accept: 'application/json',
		'content-type': 'application/x-www-form-urlencoded'
	};
	if (spec.clientAuth === 'basic')
		headers.authorization = `Basic ${Buffer.from(`${client.clientId}:${client.clientSecret}`).toString('base64')}`;
	else {
		form.set('client_id', client.clientId);
		form.set('client_secret', client.clientSecret);
	}
	const response = await fetchFn(spec.tokenUrl, { method: 'POST', headers, body: form });
	const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	const token = str(json.access_token);
	if (!response.ok || !token) throw new OAuthError(`Token exchange failed (${response.status}).`);
	return token;
}

export async function fetchProfile(
	fetchFn: typeof fetch,
	spec: ProviderSpec,
	accessToken: string
): Promise<ProviderProfile> {
	const response = await fetchFn(spec.profileUrl, {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${accessToken}`,
			'user-agent': 'vibeLABS (+https://vibelabsmc.org)'
		}
	});
	if (!response.ok) throw new OAuthError(`Profile request failed (${response.status}).`);
	return spec.toProfile((await response.json()) as Record<string, unknown>);
}

/** What the state cookie remembers between leaving for the provider and coming back. */
export interface OAuthState {
	state: string;
	verifier: string;
	next: string;
	/** `login` signs in, `link` adds the provider to the signed-in account, `confirm` re-authenticates. */
	mode: 'login' | 'link' | 'confirm';
}

export const OAUTH_COOKIE = '__Host-vl_oauth';

export const encodeState = (value: OAuthState) =>
	Buffer.from(JSON.stringify(value)).toString('base64url');

export function decodeState(value: string | undefined): OAuthState | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as OAuthState;
		const valid =
			typeof parsed.state === 'string' &&
			typeof parsed.verifier === 'string' &&
			typeof parsed.next === 'string' &&
			['login', 'link', 'confirm'].includes(parsed.mode);
		return valid ? parsed : null;
	} catch {
		return null;
	}
}
