/**
 * Server configuration, read once from the environment.
 *
 * `parseConfig` is pure so every rule is unit-tested; `src/lib/server/runtime.ts` feeds it the
 * real environment. Anything missing that production needs stops the server at start-up with
 * every problem listed, instead of failing later on the first request that needs it.
 */

export interface OAuthClient {
	clientId: string;
	clientSecret: string;
}

export interface Endpoints {
	githubAuth: string;
	githubApi: string;
	discordAuth: string;
	discordApi: string;
	/** Where profile pictures are downloaded from (built from the profile, never taken from it). */
	githubAvatars: string;
	discordCdn: string;
	/** Have I Been Pwned range API, or null to skip the breach check (tests, offline dev). */
	hibp: string | null;
	mojangManifest: string;
}

export interface Config {
	/** The public origin the site is served from, e.g. https://develop.vibelabsmc.org */
	origin: string;
	production: boolean;
	databaseUrl: string;
	/** Connections in the pool (1 for the in-process test database). */
	databasePool: number;
	/** At least 32 bytes; every other key (TOTP encryption, IP hashing) is derived from it. */
	secret: Buffer;
	github: OAuthClient | null;
	discord: OAuthClient | null;
	/** SMTP connection URL, or null: production then turns email sign-up off, dev writes to the outbox. */
	smtpUrl: string | null;
	mailFrom: string;
	/** Where development mail is written as JSON files instead of being sent. */
	mailOutbox: string;
	/** GitHub numeric user IDs that become admins the first time they sign in. */
	adminGithubIds: string[];
	storageDir: string;
	/** `/path/to/clamd.ctl` or `tcp://host:port`; null means uploads are not scanned (dev only). */
	clamd: string | null;
	/** `x-accel` hands file downloads to nginx; `stream` serves them from the app (dev, tests). */
	fileDelivery: 'x-accel' | 'stream';
	/** Origins (the docs site) allowed to read the signed-in user from /api/session. */
	accountOrigins: string[];
	/** Previews ask search engines to stay away (X-Robots-Tag and robots.txt). */
	noindex: boolean;
	endpoints: Endpoints;
}

type Env = Record<string, string | undefined>;

const DEFAULT_ENDPOINTS: Endpoints = {
	githubAuth: 'https://github.com',
	githubApi: 'https://api.github.com',
	discordAuth: 'https://discord.com',
	discordApi: 'https://discord.com/api/v10',
	githubAvatars: 'https://avatars.githubusercontent.com',
	discordCdn: 'https://cdn.discordapp.com',
	hibp: 'https://api.pwnedpasswords.com',
	mojangManifest: 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
};

const list = (value: string | undefined) =>
	(value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);

function decodeSecret(value: string | undefined, problems: string[]): Buffer {
	if (!value) {
		problems.push('APP_SECRET is required (32+ random bytes, as hex or base64).');
		return Buffer.alloc(0);
	}
	const bytes = /^[0-9a-f]+$/i.test(value)
		? Buffer.from(value, 'hex')
		: Buffer.from(value, 'base64');
	if (bytes.length < 32) problems.push('APP_SECRET must decode to at least 32 bytes.');
	return bytes;
}

function oauthClient(env: Env, prefix: string, problems: string[]): OAuthClient | null {
	const clientId = env[`${prefix}_CLIENT_ID`];
	const clientSecret = env[`${prefix}_CLIENT_SECRET`];
	if (!clientId && !clientSecret) return null;
	if (!clientId || !clientSecret) {
		problems.push(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must be set together.`);
		return null;
	}
	return { clientId, clientSecret };
}

function parseOrigin(value: string | undefined, problems: string[]): string {
	if (!value) {
		problems.push('ORIGIN is required, e.g. https://develop.vibelabsmc.org');
		return '';
	}
	try {
		const url = new URL(value);
		if (url.origin !== value.replace(/\/$/, '')) throw new Error('not an origin');
		return url.origin;
	} catch {
		problems.push(`ORIGIN must be an origin like https://vibelabsmc.org, got "${value}".`);
		return '';
	}
}

function productionProblems(config: Omit<Config, 'endpoints'>): string[] {
	const problems: string[] = [];
	if (!config.origin.startsWith('https://')) problems.push('ORIGIN must use https in production.');
	if (!config.clamd) problems.push('CLAMD is required in production: every upload is scanned.');
	return problems;
}

export function parseConfig(env: Env): Config {
	const problems: string[] = [];
	const production = env.NODE_ENV === 'production';
	const origin = parseOrigin(env.ORIGIN, problems);
	const databaseUrl = env.DATABASE_URL ?? '';
	if (!databaseUrl) problems.push('DATABASE_URL is required.');
	const fileDelivery = env.FILE_DELIVERY ?? (production ? 'x-accel' : 'stream');
	if (fileDelivery !== 'x-accel' && fileDelivery !== 'stream')
		problems.push('FILE_DELIVERY must be "x-accel" or "stream".');

	const config = {
		origin,
		production,
		databaseUrl,
		databasePool: Math.min(Math.max(Number(env.DATABASE_POOL) || 10, 1), 50),
		secret: decodeSecret(env.APP_SECRET, problems),
		github: oauthClient(env, 'GITHUB', problems),
		discord: oauthClient(env, 'DISCORD', problems),
		smtpUrl: env.SMTP_URL || null,
		mailFrom: env.MAIL_FROM || 'vibeLABS <no-reply@vibelabsmc.org>',
		mailOutbox: env.MAIL_OUTBOX || '.data/outbox',
		adminGithubIds: list(env.ADMIN_GITHUB_IDS),
		storageDir: env.STORAGE_DIR || '.data/storage',
		clamd: env.CLAMD || null,
		fileDelivery: fileDelivery as Config['fileDelivery'],
		accountOrigins: list(env.ACCOUNT_ORIGINS ?? 'https://docs.vibelabsmc.org'),
		noindex: env.NOINDEX === '1'
	};
	if (production) problems.push(...productionProblems(config));
	if (problems.length) throw new Error(`Configuration problems:\n- ${problems.join('\n- ')}`);

	return {
		...config,
		endpoints: {
			githubAuth: env.GITHUB_AUTH_URL || DEFAULT_ENDPOINTS.githubAuth,
			githubApi: env.GITHUB_API_URL || DEFAULT_ENDPOINTS.githubApi,
			discordAuth: env.DISCORD_AUTH_URL || DEFAULT_ENDPOINTS.discordAuth,
			discordApi: env.DISCORD_API_URL || DEFAULT_ENDPOINTS.discordApi,
			githubAvatars: env.GITHUB_AVATAR_URL || DEFAULT_ENDPOINTS.githubAvatars,
			discordCdn: env.DISCORD_CDN_URL || DEFAULT_ENDPOINTS.discordCdn,
			hibp: env.HIBP_URL === 'off' ? null : env.HIBP_URL || DEFAULT_ENDPOINTS.hibp,
			mojangManifest: env.MOJANG_MANIFEST_URL || DEFAULT_ENDPOINTS.mojangManifest
		}
	};
}
