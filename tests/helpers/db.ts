/**
 * A fresh, fully migrated Postgres for each test file: PGlite runs Postgres in-process, so
 * tests need no database server and never share state.
 */
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { join } from 'node:path';
import type { Database } from '../../src/lib/server/db/index.ts';
import * as schema from '../../src/lib/server/db/schema.ts';

export const MIGRATIONS = join(import.meta.dirname, '..', '..', 'drizzle');

export async function testDb(): Promise<{ db: Database; client: PGlite }> {
	const client = new PGlite({ extensions: { pg_trgm } });
	const pglite = drizzle(client, { schema, casing: 'snake_case' });
	await migrate(pglite, { migrationsFolder: MIGRATIONS });
	return { db: pglite as unknown as Database, client };
}
