import { describe, expect, it, vi } from 'vitest';
import { parseConfig } from '../config.ts';
import { sha256 } from '../security/crypto.ts';
import {
	authorizationUrl,
	createPkce,
	decodeState,
	discordProfile,
	encodeState,
	exchangeCode,
	fetchProfile,
	githubProfile,
	isProvider,
	OAuthError,
	providerSpecs
} from './oauth.ts';

const endpoints = parseConfig({
	ORIGIN: 'http://localhost',
	DATABASE_URL: 'postgres://x',
	APP_SECRET: 'a'.repeat(64)
}).endpoints;
const specs = providerSpecs(endpoints);
const client = { clientId: 'id', clientSecret: 'shh' };

const reply = (status: number, body: unknown) =>
	vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe('PKCE', () => {
	it('pairs a 256-bit verifier with its S256 challenge', () => {
		const { verifier, challenge } = createPkce();

		expect(verifier).toHaveLength(43);
		expect(challenge).toBe(sha256(verifier));
		expect(createPkce().verifier).not.toBe(verifier);
	});
});

describe('authorizationUrl', () => {
	it('asks GitHub for no scopes, with state and PKCE', () => {
		const url = new URL(
			authorizationUrl(specs.github, client, {
				state: 'st',
				challenge: 'ch',
				redirectUri: 'https://x/auth/github/callback'
			})
		);

		expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			response_type: 'code',
			client_id: 'id',
			redirect_uri: 'https://x/auth/github/callback',
			state: 'st',
			code_challenge: 'ch',
			code_challenge_method: 'S256',
			scope: '',
			allow_signup: 'false'
		});
	});

	it('asks Discord only to identify the user', () => {
		const url = new URL(
			authorizationUrl(specs.discord, client, { state: 's', challenge: 'c', redirectUri: 'r' })
		);

		expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
		expect(url.searchParams.get('scope')).toBe('identify');
		expect(url.searchParams.get('prompt')).toBe('none');
		expect(url.searchParams.has('allow_signup')).toBe(false);
	});
});

describe('exchangeCode', () => {
	const options = { code: 'c', verifier: 'v', redirectUri: 'r' };

	it('sends GitHub the client secret in the form, with the verifier', async () => {
		const fetchFn = reply(200, { access_token: 'tok' });

		expect(await exchangeCode(fetchFn, specs.github, client, options)).toBe('tok');
		const [url, init] = fetchFn.mock.calls[0]!;
		expect(url).toBe('https://github.com/login/oauth/access_token');
		const body = new URLSearchParams(String(init!.body));
		expect(body.get('client_secret')).toBe('shh');
		expect(body.get('code_verifier')).toBe('v');
		expect(body.get('grant_type')).toBe('authorization_code');
		expect((init!.headers as Record<string, string>).accept).toBe('application/json');
	});

	it('sends Discord the client credentials as Basic auth, not in the body', async () => {
		const fetchFn = reply(200, { access_token: 'tok' });

		await exchangeCode(fetchFn, specs.discord, client, options);
		const [url, init] = fetchFn.mock.calls[0]!;
		expect(url).toBe('https://discord.com/api/v10/oauth2/token');
		expect((init!.headers as Record<string, string>).authorization).toBe(
			`Basic ${Buffer.from('id:shh').toString('base64')}`
		);
		expect(new URLSearchParams(String(init!.body)).has('client_secret')).toBe(false);
	});

	it('fails on an error reply, a missing token or a body that is not JSON', async () => {
		await expect(
			exchangeCode(reply(400, { error: 'bad' }), specs.github, client, options)
		).rejects.toThrow(OAuthError);
		await expect(
			exchangeCode(reply(200, { error: 'x' }), specs.github, client, options)
		).rejects.toThrow('Token exchange failed (200).');
		const notJson = vi.fn<typeof fetch>(async () => new Response('<html>', { status: 200 }));
		await expect(exchangeCode(notJson, specs.github, client, options)).rejects.toThrow(OAuthError);
	});
});

describe('profiles', () => {
	it('reads a GitHub profile and builds the avatar address itself', async () => {
		const fetchFn = reply(200, {
			id: 42,
			login: 'steve',
			name: 'Steve M',
			avatar_url: 'https://evil/x'
		});

		const profile = await fetchProfile(fetchFn, specs.github, 'tok');
		expect(profile).toEqual({
			id: '42',
			username: 'steve',
			displayName: 'Steve M',
			avatarUrl: 'https://avatars.githubusercontent.com/u/42?s=256'
		});
		const init = fetchFn.mock.calls[0]![1]!;
		expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
	});

	it('falls back to the login when a GitHub user has no name', () => {
		expect(githubProfile({ id: 7, login: 'alex', name: null }, 'https://a').displayName).toBe(
			'alex'
		);
		expect(githubProfile({ id: 7 }, 'https://a').username).toBe('7');
	});

	it('reads a Discord profile, with or without an avatar', () => {
		expect(
			discordProfile({ id: '9', username: 'kit', global_name: 'Kit', avatar: 'abc' }, 'https://cdn')
		).toEqual({
			id: '9',
			username: 'kit',
			displayName: 'Kit',
			avatarUrl: 'https://cdn/avatars/9/abc.png?size=256'
		});
		expect(discordProfile({ id: '9', username: 'kit', avatar: null }, 'https://cdn')).toMatchObject(
			{
				displayName: 'kit',
				avatarUrl: null
			}
		);
		expect(discordProfile({ id: '9' }, 'https://cdn').username).toBe('9');
	});

	it('refuses a profile without an id, and a failed profile request', async () => {
		expect(() => githubProfile({ login: 'x' }, 'a')).toThrow('no id');
		expect(() => discordProfile({ id: '' }, 'a')).toThrow('no id');
		await expect(fetchProfile(reply(401, {}), specs.discord, 't')).rejects.toThrow(
			'Profile request failed (401).'
		);
	});
});

describe('the state cookie', () => {
	it('round-trips, and rejects anything malformed', () => {
		const value = { state: 's', verifier: 'v', next: '/x', mode: 'link' as const };

		expect(decodeState(encodeState(value))).toEqual(value);
		expect(decodeState(undefined)).toBeNull();
		expect(decodeState('%%%')).toBeNull();
		expect(decodeState(encodeState({ ...value, mode: 'admin' as never }))).toBeNull();
		expect(decodeState(Buffer.from('{"state":1}').toString('base64url'))).toBeNull();
	});
});

describe('isProvider', () => {
	it('knows only GitHub and Discord', () => {
		expect(isProvider('github')).toBe(true);
		expect(isProvider('discord')).toBe(true);
		expect(isProvider('google')).toBe(false);
	});
});
