/** Two query shapes used everywhere: one row or nothing, and a count. */
import { count, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Database } from './index.ts';

/** The first row of a query, or null when there is none. */
export async function firstOrNull<T>(rows: Promise<T[]>): Promise<T | null> {
	const [row] = await rows;
	return row ?? null;
}

/** How many rows of `table` match `where`. */
export async function countOf(db: Database, table: PgTable, where?: SQL): Promise<number> {
	const [row] = await db.select({ n: count() }).from(table).where(where);
	return row?.n ?? 0;
}
