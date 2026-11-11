/** Follows, reviews, collections and reports: what players do with projects. */
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../db/index.ts';
import {
	collectionProjects,
	collections,
	follows,
	projects,
	reports,
	reviews,
	users
} from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import { recountProjects } from '../marketplace/stats.ts';

// ------------------------------------------------------------------ follows

export async function setFollow(
	db: Database,
	userId: string,
	projectId: string,
	on: boolean
): Promise<void> {
	if (on) await db.insert(follows).values({ userId, projectId }).onConflictDoNothing();
	else
		await db
			.delete(follows)
			.where(and(eq(follows.userId, userId), eq(follows.projectId, projectId)));
	await recountProjects(db, [projectId]);
}

export async function isFollowing(
	db: Database,
	userId: string | undefined,
	projectId: string
): Promise<boolean> {
	if (!userId) return false;
	const [row] = await db
		.select({ p: follows.projectId })
		.from(follows)
		.where(and(eq(follows.userId, userId), eq(follows.projectId, projectId)));
	return !!row;
}

export async function followedProjectIds(db: Database, userId: string): Promise<string[]> {
	const rows = await db
		.select({ id: follows.projectId })
		.from(follows)
		.where(eq(follows.userId, userId))
		.orderBy(desc(follows.createdAt));
	return rows.map((r) => r.id);
}

// ------------------------------------------------------------------ reviews

export type Review = typeof reviews.$inferSelect;
export const REVIEW_MIN = 10;
export const REVIEW_MAX = 4000;

export function reviewProblem(rating: number, body: string): string | null {
	if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'Choose 1 to 5 stars.';
	if (body.trim().length < REVIEW_MIN) return `Write at least ${REVIEW_MIN} characters.`;
	if (body.length > REVIEW_MAX) return `Keep it under ${REVIEW_MAX} characters.`;
	return null;
}

/** One review per person per project: writing again updates it. */
export async function saveReview(
	db: Database,
	input: { projectId: string; userId: string; rating: number; body: string }
): Promise<Review> {
	const [row] = await db
		.insert(reviews)
		.values({ id: newId(), ...input })
		.onConflictDoUpdate({
			target: [reviews.projectId, reviews.userId],
			set: { rating: input.rating, body: input.body, updatedAt: new Date() }
		})
		.returning();
	await recountProjects(db, [input.projectId]);
	return row!;
}

export async function getReview(db: Database, id: string): Promise<Review | null> {
	const [row] = await db.select().from(reviews).where(eq(reviews.id, id));
	return row ?? null;
}

export async function deleteReview(db: Database, id: string): Promise<void> {
	const [row] = await db
		.delete(reviews)
		.where(eq(reviews.id, id))
		.returning({ projectId: reviews.projectId });
	if (row) await recountProjects(db, [row.projectId]);
}

export async function setReviewStatus(
	db: Database,
	id: string,
	status: Review['status']
): Promise<void> {
	const [row] = await db
		.update(reviews)
		.set({ status })
		.where(eq(reviews.id, id))
		.returning({ projectId: reviews.projectId });
	if (row) await recountProjects(db, [row.projectId]);
}

export async function replyToReview(db: Database, id: string, reply: string | null): Promise<void> {
	await db
		.update(reviews)
		.set({ ownerReply: reply, ownerReplyAt: reply ? new Date() : null })
		.where(eq(reviews.id, id));
}

export async function listReviews(
	db: Database,
	projectId: string,
	options: { page?: number; perPage?: number; includeHidden?: boolean } = {}
) {
	const perPage = options.perPage ?? 10;
	return db
		.select({
			review: reviews,
			author: {
				username: users.username,
				displayName: users.displayName,
				avatarKey: users.avatarKey
			}
		})
		.from(reviews)
		.innerJoin(users, eq(users.id, reviews.userId))
		.where(
			and(
				eq(reviews.projectId, projectId),
				options.includeHidden ? undefined : eq(reviews.status, 'visible')
			)
		)
		.orderBy(desc(reviews.createdAt))
		.limit(perPage)
		.offset(((options.page ?? 1) - 1) * perPage);
}

/** How many reviews gave 5, 4, 3, 2 and 1 stars. */
export async function ratingHistogram(
	db: Database,
	projectId: string
): Promise<Record<1 | 2 | 3 | 4 | 5, number>> {
	const rows = await db
		.select({ rating: reviews.rating, n: count() })
		.from(reviews)
		.where(and(eq(reviews.projectId, projectId), eq(reviews.status, 'visible')))
		.groupBy(reviews.rating);
	const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	for (const row of rows) histogram[row.rating as 1] = row.n;
	return histogram;
}

export async function userReview(
	db: Database,
	projectId: string,
	userId: string | undefined
): Promise<Review | null> {
	if (!userId) return null;
	const [row] = await db
		.select()
		.from(reviews)
		.where(and(eq(reviews.projectId, projectId), eq(reviews.userId, userId)));
	return row ?? null;
}

// ------------------------------------------------------------------ collections

export type Collection = typeof collections.$inferSelect;
export type Visibility = Collection['visibility'];

export function collectionProblem(name: string, description: string): string | null {
	if (!name.trim() || name.length > 64) return 'Use a name of 1 to 64 characters.';
	if (description.length > 500) return 'Keep the description under 500 characters.';
	return null;
}

export async function createCollection(
	db: Database,
	ownerId: string,
	input: { name: string; description: string; visibility: Visibility }
): Promise<Collection> {
	const [row] = await db
		.insert(collections)
		.values({ id: newId(), ownerId, ...input })
		.returning();
	return row!;
}

export async function updateCollection(
	db: Database,
	id: string,
	input: { name: string; description: string; visibility: Visibility }
): Promise<void> {
	await db
		.update(collections)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(collections.id, id));
}

export async function deleteCollection(db: Database, id: string): Promise<void> {
	await db.delete(collections).where(eq(collections.id, id));
}

export async function getCollection(db: Database, id: string): Promise<Collection | null> {
	const [row] = await db.select().from(collections).where(eq(collections.id, id));
	return row ?? null;
}

/** Anyone may open public and unlisted collections; private ones only their owner (and staff). */
export const canSeeCollection = (
	c: Pick<Collection, 'visibility' | 'ownerId' | 'hidden'>,
	viewerId: string | undefined,
	staff: boolean
): boolean => staff || c.ownerId === viewerId || (c.visibility !== 'private' && !c.hidden);

export async function setInCollection(
	db: Database,
	collectionId: string,
	projectId: string,
	on: boolean
): Promise<void> {
	if (on)
		await db.insert(collectionProjects).values({ collectionId, projectId }).onConflictDoNothing();
	else
		await db
			.delete(collectionProjects)
			.where(
				and(
					eq(collectionProjects.collectionId, collectionId),
					eq(collectionProjects.projectId, projectId)
				)
			);
	await db
		.update(collections)
		.set({ updatedAt: new Date() })
		.where(eq(collections.id, collectionId));
}

export async function collectionProjectIds(db: Database, collectionId: string): Promise<string[]> {
	const rows = await db
		.select({ id: collectionProjects.projectId })
		.from(collectionProjects)
		.innerJoin(projects, eq(projects.id, collectionProjects.projectId))
		.where(and(eq(collectionProjects.collectionId, collectionId), eq(projects.status, 'approved')))
		.orderBy(desc(collectionProjects.addedAt));
	return rows.map((r) => r.id);
}

/** A user's collections, with how many projects each holds and whether it holds `projectId`. */
export async function userCollections(
	db: Database,
	ownerId: string,
	options: { projectId?: string; publicOnly?: boolean } = {}
) {
	return db
		.select({
			collection: collections,
			size: sql<number>`(select count(*) from ${collectionProjects} cp where cp.collection_id = ${collections.id})::int`,
			contains: options.projectId
				? sql<boolean>`exists(select 1 from ${collectionProjects} cp where cp.collection_id = ${collections.id} and cp.project_id = ${options.projectId})`
				: sql<boolean>`false`
		})
		.from(collections)
		.where(
			and(
				eq(collections.ownerId, ownerId),
				options.publicOnly
					? and(eq(collections.visibility, 'public'), eq(collections.hidden, false))
					: undefined
			)
		)
		.orderBy(desc(collections.updatedAt));
}

// ------------------------------------------------------------------ reports

export const REPORT_REASONS = {
	malware: 'Malware or harmful code',
	stolen: 'Stolen or reuploaded work',
	inappropriate: 'Inappropriate content',
	spam: 'Spam or misleading',
	broken: 'Does not work as described',
	harassment: 'Harassment or hate',
	other: 'Something else'
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
export const REPORT_TARGETS = ['project', 'version', 'review', 'user', 'collection'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const isReportReason = (value: string): value is ReportReason => value in REPORT_REASONS;
export const isReportTarget = (value: string): value is ReportTarget =>
	(REPORT_TARGETS as readonly string[]).includes(value);

export async function createReport(
	db: Database,
	input: {
		reporterId: string;
		targetType: ReportTarget;
		targetId: string;
		reason: ReportReason;
		body: string;
	}
) {
	const [row] = await db
		.insert(reports)
		.values({ id: newId(), ...input, body: input.body.slice(0, 2000) })
		.returning();
	return row!;
}

export async function listReports(
	db: Database,
	status: 'open' | 'resolved' | 'dismissed' = 'open',
	limit = 100
) {
	return db
		.select({
			report: reports,
			reporter: { username: users.username, displayName: users.displayName }
		})
		.from(reports)
		.leftJoin(users, eq(users.id, reports.reporterId))
		.where(eq(reports.status, status))
		.orderBy(status === 'open' ? asc(reports.createdAt) : desc(reports.resolvedAt))
		.limit(limit);
}

export async function closeReport(
	db: Database,
	id: string,
	staffId: string,
	status: 'resolved' | 'dismissed',
	resolution: string
) {
	const [row] = await db
		.update(reports)
		.set({ status, resolution, resolvedBy: staffId, resolvedAt: new Date() })
		.where(and(eq(reports.id, id), eq(reports.status, 'open')))
		.returning();
	return row ?? null;
}

export async function countOpenReports(db: Database): Promise<number> {
	const [row] = await db.select({ n: count() }).from(reports).where(eq(reports.status, 'open'));
	return row?.n ?? 0;
}

export async function projectNames(db: Database, ids: string[]) {
	if (!ids.length) return new Map<string, { name: string; slug: string; type: string }>();
	const rows = await db
		.select({ id: projects.id, name: projects.name, slug: projects.slug, type: projects.type })
		.from(projects)
		.where(inArray(projects.id, ids));
	return new Map(rows.map(({ id, ...r }) => [id, r]));
}
