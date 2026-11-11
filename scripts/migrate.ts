/**
 * Applies new migrations from drizzle/ to the database in DATABASE_URL. The deploy runs this
 * before switching to a new release; an applied migration is never run twice.
 *
 *   DATABASE_URL=... bun scripts/migrate.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { join } from 'node:path';
import postgres from 'postgres';
import { connectionOptions } from '../src/lib/server/db/index.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required.');
const options = connectionOptions(url);
const client = postgres(options.url, {
	max: 1,
	onnotice: () => {},
	...(options.host ? { host: options.host } : {})
});
await migrate(drizzle(client), { migrationsFolder: join(import.meta.dirname, '..', 'drizzle') });
await client.end();
console.log('Migrations are up to date.');
