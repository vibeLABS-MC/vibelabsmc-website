import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.ts';

const SECRET = 'a'.repeat(64);
const base = {
	ORIGIN: 'http://localhost:5173',
	DATABASE_URL: 'postgres://localhost/test',
	APP_SECRET: SECRET
};

describe('parseConfig', () => {
	it('reads a minimal development environment with safe defaults', () => {
		const config = parseConfig(base);

		expect(config.origin).toBe('http://localhost:5173');
		expect(config.production).toBe(false);
		expect(config.secret).toHaveLength(32);
		expect(config.github).toBeNull();
		expect(config.discord).toBeNull();
		expect(config.smtpUrl).toBeNull();
		expect(config.fileDelivery).toBe('stream');
		expect(config.accountOrigins).toEqual(['https://docs.vibelabsmc.org']);
		expect(config.mailFrom).toBe('vibeLABS <no-reply@vibelabsmc.org>');
		expect(config.mailOutbox).toBe('.data/outbox');
		expect(config.storageDir).toBe('.data/storage');
		expect(config.clamd).toBeNull();
		expect(config.adminGithubIds).toEqual([]);
		expect(config.noindex).toBe(false);
		expect(config.databasePool).toBe(10);
		expect(config.endpoints.githubApi).toBe('https://api.github.com');
		expect(config.endpoints.hibp).toBe('https://api.pwnedpasswords.com');
	});

	it('accepts a base64 secret and lists of admins and account origins', () => {
		const config = parseConfig({
			...base,
			APP_SECRET: Buffer.alloc(48, 7).toString('base64'),
			ADMIN_GITHUB_IDS: ' 123, 456 ,',
			ACCOUNT_ORIGINS: 'https://docs.vibelabsmc.org,http://localhost:4321'
		});

		expect(config.secret).toHaveLength(48);
		expect(config.adminGithubIds).toEqual(['123', '456']);
		expect(config.accountOrigins).toEqual(['https://docs.vibelabsmc.org', 'http://localhost:4321']);
	});

	it('takes a pool size between 1 and 50', () => {
		expect(parseConfig({ ...base, DATABASE_POOL: '1' }).databasePool).toBe(1);
		expect(parseConfig({ ...base, DATABASE_POOL: '500' }).databasePool).toBe(50);
		expect(parseConfig({ ...base, DATABASE_POOL: 'x' }).databasePool).toBe(10);
	});

	it('marks a preview as noindex only when NOINDEX=1', () => {
		expect(parseConfig({ ...base, NOINDEX: '1' }).noindex).toBe(true);
		expect(parseConfig({ ...base, NOINDEX: 'true' }).noindex).toBe(false);
	});

	it('turns on an OAuth provider only when both of its values are set', () => {
		const config = parseConfig({
			...base,
			GITHUB_CLIENT_ID: 'id',
			GITHUB_CLIENT_SECRET: 'secret'
		});

		expect(config.github).toEqual({ clientId: 'id', clientSecret: 'secret' });
		expect(() => parseConfig({ ...base, DISCORD_CLIENT_ID: 'id' })).toThrow(
			'DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be set together.'
		);
	});

	it('lets tests point every outside service somewhere else, and switch off the breach check', () => {
		const config = parseConfig({
			...base,
			GITHUB_AUTH_URL: 'http://fake/gh',
			GITHUB_API_URL: 'http://fake/gh-api',
			DISCORD_AUTH_URL: 'http://fake/dc',
			DISCORD_API_URL: 'http://fake/dc-api',
			GITHUB_AVATAR_URL: 'http://fake/gh-avatars',
			DISCORD_CDN_URL: 'http://fake/dc-cdn',
			MOJANG_MANIFEST_URL: 'http://fake/mojang',
			HIBP_URL: 'off'
		});

		expect(config.endpoints).toEqual({
			githubAuth: 'http://fake/gh',
			githubApi: 'http://fake/gh-api',
			discordAuth: 'http://fake/dc',
			discordApi: 'http://fake/dc-api',
			githubAvatars: 'http://fake/gh-avatars',
			discordCdn: 'http://fake/dc-cdn',
			hibp: null,
			mojangManifest: 'http://fake/mojang'
		});
	});

	it('lists every problem at once', () => {
		expect(() => parseConfig({})).toThrow(
			/ORIGIN is required[\s\S]*DATABASE_URL is required[\s\S]*APP_SECRET is required/
		);
	});

	it('rejects a short secret, an origin with a path and an unknown file delivery', () => {
		expect(() => parseConfig({ ...base, APP_SECRET: 'abcd' })).toThrow('at least 32 bytes');
		expect(() => parseConfig({ ...base, ORIGIN: 'https://vibelabsmc.org/app' })).toThrow(
			'ORIGIN must be an origin'
		);
		expect(() => parseConfig({ ...base, ORIGIN: 'not a url' })).toThrow('ORIGIN must be an origin');
		expect(() => parseConfig({ ...base, FILE_DELIVERY: 'ftp' })).toThrow('FILE_DELIVERY');
	});

	it('accepts an origin written with a trailing slash', () => {
		expect(parseConfig({ ...base, ORIGIN: 'https://vibelabsmc.org/' }).origin).toBe(
			'https://vibelabsmc.org'
		);
	});

	it('demands https and virus scanning in production, and hands files to nginx', () => {
		expect(() => parseConfig({ ...base, NODE_ENV: 'production' })).toThrow(
			/https in production[\s\S]*CLAMD is required/
		);

		const config = parseConfig({
			...base,
			NODE_ENV: 'production',
			ORIGIN: 'https://develop.vibelabsmc.org',
			CLAMD: '/var/run/clamav/clamd.ctl',
			SMTP_URL: 'smtps://user:pass@smtp.example.com:465'
		});
		expect(config.production).toBe(true);
		expect(config.fileDelivery).toBe('x-accel');
		expect(config.smtpUrl).toBe('smtps://user:pass@smtp.example.com:465');
	});
});
