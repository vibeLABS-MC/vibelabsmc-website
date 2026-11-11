/**
 * The running server's shared pieces: configuration, the database, rate limits, mail and the
 * derived keys. Started once (by the init hook, never during the build), then reused for every
 * request.
 */
import { dev } from '$app/env';
import { parseConfig, type Config } from './config.ts';
import { openDatabase, type Database } from './db/index.ts';
import { createMailer, type Mailer } from './mail/mailer.ts';
import { deriveKey } from './security/crypto.ts';
import { RateLimiter } from './security/rate-limit.ts';

export interface Runtime {
	config: Config;
	db: Database;
	limiter: RateLimiter;
	mailer: Mailer;
	keys: { ip: Buffer; totp: Buffer };
}

let starting: Promise<Runtime> | undefined;

/** The runtime, starting it on the first call. Every later call gets the same one. */
export function runtime(): Promise<Runtime> {
	starting ??= (async () => {
		// Production gets its variables from systemd; `bun run dev` reads them from .env.
		if (dev) {
			try {
				process.loadEnvFile('.env');
			} catch {
				// no .env: the defaults and the shell environment apply
			}
		}
		const config = parseConfig(process.env);
		const { db } = await openDatabase(config.databaseUrl, config.databasePool);
		return {
			config,
			db,
			limiter: new RateLimiter(),
			mailer: createMailer(config),
			keys: { ip: deriveKey(config.secret, 'ip-hash'), totp: deriveKey(config.secret, 'totp') }
		};
	})();
	return starting;
}
