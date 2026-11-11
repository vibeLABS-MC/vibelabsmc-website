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

/** A variable's value, or the fallback when it is missing or empty. */
const text = (env: Env, name: string, fallback: string): string => env[name] || fallback;
const optional = (env: Env, name: string): string | null => env[name] || null;

const ENDPOINT_VARIABLES: Record<keyof Endpoints, string> = {
	githubAuth: 'GITHUB_AUTH_URL',
	githubApi: 'GITHUB_API_URL',
	discordAuth: 'DISCORD_AUTH_URL',
	discordApi: 'DISCORD_API_URL',
	githubAvatars: 'GITHUB_AVATAR_URL',
	discordCdn: 'DISCORD_CDN_URL',
	hibp: 'HIBP_URL',
	mojangManifest: 'MOJANG_MANIFEST_URL'
};

function readEndpoints(env: Env): Endpoints {
	const endpoints = Object.fromEntries(
		Object.entries(ENDPOINT_VARIABLES).map(([key, name]) => [
			key,
			text(env, name, DEFAULT_ENDPOINTS[key as keyof Endpoints] ?? '')
		])
	) as unknown as Endpoints;
	if (env.HIBP_URL === 'off') endpoints.hibp = null;
	return endpoints;
}

function decodeSecret(value: string | undefined, problems: string[]): Buffer {
	if (!value) {
		problems.push('APP_SECRET is required (32+ random bytes, as hex or base64).');
		return Buffer.alloc(0);
	}
	const bytes = Buffer.from(value, /^[0-9a-f]+$/i.test(value) ? 'hex' : 'base64');
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

function readDatabase(env: Env, problems: string[]): { databaseUrl: string; databasePool: number } {
	const databaseUrl = text(env, 'DATABASE_URL', '');
	if (!databaseUrl) problems.push('DATABASE_URL is required.');
	return { databaseUrl, databasePool: Math.min(Math.max(Number(env.DATABASE_POOL) || 10, 1), 50) };
}

function readFileDelivery(
	env: Env,
	production: boolean,
	problems: string[]
): Config['fileDelivery'] {
	const value = text(env, 'FILE_DELIVERY', production ? 'x-accel' : 'stream');
	if (value !== 'x-accel' && value !== 'stream')
		problems.push('FILE_DELIVERY must be "x-accel" or "stream".');
	return value as Config['fileDelivery'];
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
	const config = {
		origin: parseOrigin(env.ORIGIN, problems),
		production,
		...readDatabase(env, problems),
		secret: decodeSecret(env.APP_SECRET, problems),
		github: oauthClient(env, 'GITHUB', problems),
		discord: oauthClient(env, 'DISCORD', problems),
		smtpUrl: optional(env, 'SMTP_URL'),
		mailFrom: text(env, 'MAIL_FROM', 'vibeLABS <no-reply@vibelabsmc.org>'),
		mailOutbox: text(env, 'MAIL_OUTBOX', '.data/outbox'),
		adminGithubIds: list(env.ADMIN_GITHUB_IDS),
		storageDir: text(env, 'STORAGE_DIR', '.data/storage'),
		clamd: optional(env, 'CLAMD'),
		fileDelivery: readFileDelivery(env, production, problems),
		accountOrigins: list(text(env, 'ACCOUNT_ORIGINS', 'https://docs.vibelabsmc.org')),
		noindex: env.NOINDEX === '1'
	};
	if (production) problems.push(...productionProblems(config));
	if (problems.length) throw new Error(`Configuration problems:\n- ${problems.join('\n- ')}`);
	return { ...config, endpoints: readEndpoints(env) };
}
