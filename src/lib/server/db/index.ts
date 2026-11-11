/**
 * Database access. Every server module takes a `Database` as its first argument, so tests pass
 * an in-memory PGlite one (tests/helpers/db.ts) and the app passes the real Postgres one.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import postgres from 'postgres';
import * as schema from './schema.ts';

export { schema };
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Postgres connection options from a URL. `?host=/var/run/postgresql` means the Unix socket in
 * that folder, which lets the server use peer authentication with no password at all.
 */
export function connectionOptions(url: string): { url: string; host?: string } {
	const parsed = new URL(url);
	const socket = parsed.searchParams.get('host');
	if (!socket?.startsWith('/')) return { url };
	parsed.searchParams.delete('host');
	return { url: parsed.toString(), host: socket };
}

export function connect(url: string, max = 10): { db: Database; close: () => Promise<void> } {
	const options = connectionOptions(url);
	const client = postgres(options.url, {
		max,
		...(options.host ? { host: options.host } : {}),
		// Timestamps come back as Date objects through Drizzle; keep Postgres quiet in the logs.
		onnotice: () => {}
	});
	const db = drizzle(client, { schema, casing: 'snake_case' }) as unknown as Database;
	return { db, close: () => client.end({ timeout: 5 }) };
}

/** `pglite:memory` or `pglite:./folder`: Postgres compiled to WASM, inside this process. */
export const isPgliteUrl = (url: string): boolean => url.startsWith('pglite:');

/**
 * Opens the database. Real Postgres in production; PGlite (in-process, no server to install)
 * for local development and the site tests, migrated on start. PGlite is a development
 * dependency, loaded by name so it never ends up in the production bundle.
 */
export async function openDatabase(
	url: string,
	max = 10
): Promise<{ db: Database; close: () => Promise<void> }> {
	if (!isPgliteUrl(url)) return connect(url, max);
	const load = (name: string) => import(/* @vite-ignore */ name);
	const [{ PGlite }, { pg_trgm }, { drizzle: pgliteDrizzle }, { migrate }] = await Promise.all([
		load('@electric-sql/pglite'),
		load('@electric-sql/pglite/contrib/pg_trgm'),
		load('drizzle-orm/pglite'),
		load('drizzle-orm/pglite/migrator')
	]);
	const location = url.slice('pglite:'.length);
	if (location !== 'memory') mkdirSync(dirname(resolve(location)), { recursive: true });
	// Options go first: `new PGlite(undefined, options)` silently drops them (and pg_trgm with them).
	const client = new PGlite({
		...(location === 'memory' ? {} : { dataDir: location }),
		extensions: { pg_trgm }
	});
	const db = pgliteDrizzle(client, { schema, casing: 'snake_case' });
	await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
	return { db: db as Database, close: () => client.close() };
}
