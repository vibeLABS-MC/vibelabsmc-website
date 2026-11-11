/** Small builders for test data, so each test states only what matters to it. */
import type { Database } from '../../src/lib/server/db/index.ts';
import { users } from '../../src/lib/server/db/schema.ts';
import { newId } from '../../src/lib/server/security/crypto.ts';

export async function makeUser(
	db: Database,
	values: Partial<typeof users.$inferInsert> = {}
): Promise<typeof users.$inferSelect> {
	const id = values.id ?? newId();
	const [user] = await db
		.insert(users)
		.values({ id, username: `user_${id}`, displayName: `User ${id}`, ...values })
		.returning();
	return user!;
}
