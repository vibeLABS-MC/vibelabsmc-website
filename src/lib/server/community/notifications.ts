/**
 * In-site notifications: new versions of followed projects, moderation decisions, review
 * replies, team invitations and report outcomes.
 */
import { countOf } from '../db/query.ts';
import { and, count, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import { notifications } from '../db/schema.ts';

export type NotificationKind =
	| 'version_published'
	| 'project_approved'
	| 'project_rejected'
	| 'project_changes_requested'
	| 'project_withheld'
	| 'review_reply'
	| 'team_invite'
	| 'report_resolved'
	| 'file_flagged';

export type Notification = typeof notifications.$inferSelect;

export async function notify(
	db: Database,
	userIds: string[],
	kind: NotificationKind,
	data: Record<string, unknown>
): Promise<void> {
	const unique = [...new Set(userIds)];
	if (unique.length === 0) return;
	await db.insert(notifications).values(unique.map((userId) => ({ userId, kind, data })));
}

export const unreadCount = (db: Database, userId: string): Promise<number> =>
	countOf(db, notifications, and(eq(notifications.userId, userId), isNull(notifications.readAt)));

export async function listNotifications(
	db: Database,
	userId: string,
	options: { before?: number; limit?: number } = {}
): Promise<Notification[]> {
	const limit = options.limit ?? 30;
	return db
		.select()
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				options.before ? lt(notifications.id, options.before) : undefined
			)
		)
		.orderBy(desc(notifications.id))
		.limit(limit);
}

/** Marks some (or, with no IDs, all) of a user's notifications as read. */
export async function markRead(db: Database, userId: string, ids?: number[]): Promise<void> {
	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.userId, userId),
				isNull(notifications.readAt),
				ids ? inArray(notifications.id, ids.length ? ids : [-1]) : undefined
			)
		);
}
