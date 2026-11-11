// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Config } from '#lib/server/config.ts';
import type { Database } from '#lib/server/db/index.ts';
import type { Session } from '#lib/server/auth/session.ts';
import type { SessionUser } from '#lib/server/auth/viewer.ts';
import type { Mailer } from '#lib/server/mail/mailer.ts';
import type { RateLimiter } from '#lib/server/security/rate-limit.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			/** Shown on the error page so a report can be matched to the server log. */
			id?: string;
		}
		interface Locals {
			db: Database;
			config: Config;
			limiter: RateLimiter;
			mailer: Mailer;
			keys: { ip: Buffer; totp: Buffer };
			/** The signed-in user, or null (also null while a second factor is still owed). */
			user: SessionUser | null;
			session: Session | null;
			/** A session that has passed the password or provider step but still owes the second factor. */
			pendingSession: Session | null;
			ip: string;
			ipHash: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
