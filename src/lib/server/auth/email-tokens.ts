/**
 * One-time links sent by email (verify an address, reset a password). The link carries a
 * 256-bit token; the database keeps only its hash. A token works once, for 30 minutes, and a
 * new one replaces any older unused token for the same purpose.
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { emailTokens } from '../db/schema.ts';
import { randomToken, sha256 } from '../security/crypto.ts';

export const TOKEN_TTL_MS = 30 * 60 * 1000;
export type TokenPurpose = (typeof emailTokens.$inferSelect)['purpose'];

export async function createEmailToken(
	db: Database,
	input: { userId: string; purpose: TokenPurpose; email: string },
	now = new Date()
): Promise<string> {
	const token = randomToken();
	await db
		.delete(emailTokens)
		.where(
			and(
				eq(emailTokens.userId, input.userId),
				eq(emailTokens.purpose, input.purpose),
				isNull(emailTokens.usedAt)
			)
		);
	await db.insert(emailTokens).values({
		id: sha256(token),
		userId: input.userId,
		purpose: input.purpose,
		email: input.email,
		createdAt: now,
		expiresAt: new Date(now.getTime() + TOKEN_TTL_MS)
	});
	return token;
}

/** Uses up a token. Two requests racing with the same token: only one gets the row. */
export async function consumeEmailToken(
	db: Database,
	token: string,
	purpose: TokenPurpose,
	now = new Date()
): Promise<{ userId: string; email: string } | null> {
	const [row] = await db
		.update(emailTokens)
		.set({ usedAt: now })
		.where(
			and(
				eq(emailTokens.id, sha256(token)),
				eq(emailTokens.purpose, purpose),
				isNull(emailTokens.usedAt),
				gt(emailTokens.expiresAt, now)
			)
		)
		.returning({ userId: emailTokens.userId, email: emailTokens.email });
	return row ?? null;
}

/** Whose valid token is this? Lets the reset form be shown and checked without spending it. */
export async function peekEmailToken(
	db: Database,
	token: string,
	purpose: TokenPurpose,
	now = new Date()
): Promise<{ userId: string; email: string } | null> {
	const [row] = await db
		.select({ userId: emailTokens.userId, email: emailTokens.email })
		.from(emailTokens)
		.where(
			and(
				eq(emailTokens.id, sha256(token)),
				eq(emailTokens.purpose, purpose),
				isNull(emailTokens.usedAt),
				gt(emailTokens.expiresAt, now)
			)
		);
	return row ?? null;
}
