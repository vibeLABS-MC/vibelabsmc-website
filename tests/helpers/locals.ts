/** Request context for testing route-level helpers without a running server. */
import { createServer, type AddressInfo, type Server } from 'node:net';
import { parseConfig } from '../../src/lib/server/config.ts';
import type { Database } from '../../src/lib/server/db/index.ts';
import type { Session } from '../../src/lib/server/auth/session.ts';
import type { SessionUser } from '../../src/lib/server/auth/viewer.ts';
import { RateLimiter } from '../../src/lib/server/security/rate-limit.ts';

export const testConfig = (env: Record<string, string> = {}) =>
	parseConfig({
		ORIGIN: 'https://vibelabsmc.test',
		DATABASE_URL: 'pglite:memory',
		APP_SECRET: 'cd'.repeat(32),
		...env
	});

export function sessionUser(values: Partial<SessionUser> = {}): SessionUser {
	return {
		id: 'u1',
		username: 'steve',
		displayName: 'Steve',
		avatarKey: null,
		role: 'user',
		email: null,
		emailVerified: false,
		hasPassword: false,
		totpEnabled: false,
		...values
	};
}

export function session(values: Partial<Session> = {}): Session {
	const now = new Date();
	return {
		id: 's1',
		userId: 'u1',
		createdAt: now,
		lastSeenAt: now,
		expiresAt: new Date(now.getTime() + 86_400_000),
		pendingTwoFactor: false,
		twoFactorVerified: false,
		sudoUntil: null,
		ipHash: 'ip',
		userAgent: 'test',
		...values
	};
}

export function locals(values: Partial<App.Locals> = {}): App.Locals {
	return {
		db: undefined as unknown as Database,
		config: testConfig(),
		limiter: new RateLimiter(),
		mailer: { available: true, send: async () => {} },
		keys: { ip: Buffer.alloc(32, 1), totp: Buffer.alloc(32, 2) },
		user: null,
		session: null,
		pendingSession: null,
		ip: '127.0.0.1',
		ipHash: 'ip-hash',
		...values
	};
}

/** What a SvelteKit `redirect()` or `error()` threw: `{ status, location }` or `{ status, body }`. */
export async function thrown(
	work: () => unknown
): Promise<{ status: number; location?: string; body?: { message: string } }> {
	try {
		await work();
	} catch (caught) {
		return caught as { status: number; location?: string; body?: { message: string } };
	}
	throw new Error('Expected a redirect or error to be thrown.');
}

export const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/** A tiny clamd: answers INSTREAM, finds EICAR, and can be told to fail. */
export async function fakeClamd(
	mode: { broken?: boolean } = {}
): Promise<{ target: string; close: () => void }> {
	const server: Server = createServer((socket) => {
		if (mode.broken) return void socket.end('INSTREAM size limit exceeded. ERROR\0');
		let buffer = Buffer.alloc(0);
		let data = Buffer.alloc(0);
		let started = false;
		socket.on('data', (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]);
			if (!started) {
				const end = buffer.indexOf(0);
				if (end < 0) return;
				started = true;
				buffer = buffer.subarray(end + 1);
			}
			while (buffer.length >= 4) {
				const length = buffer.readUInt32BE(0);
				if (length === 0)
					return void socket.end(data.includes(EICAR) ? 'stream: Eicar FOUND\0' : 'stream: OK\0');
				if (buffer.length < 4 + length) return;
				data = Buffer.concat([data, buffer.subarray(4, 4 + length)]);
				buffer = buffer.subarray(4 + length);
			}
		});
	});
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	return {
		target: `tcp://127.0.0.1:${(server.address() as AddressInfo).port}`,
		close: () => server.close()
	};
}
