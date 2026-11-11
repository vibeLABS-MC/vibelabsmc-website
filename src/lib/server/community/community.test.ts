import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testDb } from '../../../../tests/helpers/db.ts';
import { makeUser } from '../../../../tests/helpers/fixtures.ts';
import type { Database } from '../db/index.ts';
import { files, projectMembers, projects, sessions, versions } from '../db/schema.ts';
import { newId } from '../security/crypto.ts';
import { createSession, validateSession } from '../auth/session.ts';
import { findUserById } from '../auth/users.ts';
import {
	allowedDecisions,
	auditEntries,
	decide,
	fileQueue,
	listUsers,
	overview,
	reviewQueue,
	setBan,
	setFileVerdict,
	setRole
} from '../admin/moderation.ts';
import {
	addImage,
	listGallery,
	moveImage,
	removeImage,
	updateImage,
	GALLERY_MAX
} from '../marketplace/gallery.ts';
import { getProject } from '../marketplace/projects.ts';
import { audit } from '../audit.ts';
import { listNotifications } from './notifications.ts';
import {
	canSeeCollection,
	closeReport,
	collectionProblem,
	collectionProjectIds,
	countOpenReports,
	createCollection,
	createReport,
	deleteCollection,
	deleteReview,
	followedProjectIds,
	getCollection,
	getReview,
	isFollowing,
	isReportReason,
	isReportTarget,
	listReports,
	listReviews,
	projectNames,
	ratingHistogram,
	replyToReview,
	reviewProblem,
	saveReview,
	setFollow,
	setInCollection,
	setReviewStatus,
	updateCollection,
	userCollections,
	userReview
} from './community.ts';

let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
	const t = await testDb();
	db = t.db;
	close = () => t.client.close();
});
afterAll(() => close());

async function project(status: 'approved' | 'in_review' | 'draft' = 'approved', ownerId?: string) {
	const id = newId();
	await db
		.insert(projects)
		.values({ id, slug: `p-${id}`, type: 'shader', name: `Pack ${id}`, status });
	if (ownerId)
		await db
			.insert(projectMembers)
			.values({ projectId: id, userId: ownerId, role: 'owner', acceptedAt: new Date() });
	return id;
}

describe('follows', () => {
	it('follows and unfollows, keeping the count right', async () => {
		const user = await makeUser(db);
		const id = await project();

		await setFollow(db, user.id, id, true);
		await setFollow(db, user.id, id, true);
		expect(await isFollowing(db, user.id, id)).toBe(true);
		expect((await getProject(db, id))?.follows).toBe(1);
		expect(await followedProjectIds(db, user.id)).toEqual([id]);

		await setFollow(db, user.id, id, false);
		expect(await isFollowing(db, user.id, id)).toBe(false);
		expect(await isFollowing(db, undefined, id)).toBe(false);
		expect((await getProject(db, id))?.follows).toBe(0);
	});
});

describe('reviews', () => {
	it('checks the rating and length', () => {
		expect(reviewProblem(5, 'Lovely water reflections.')).toBeNull();
		expect(reviewProblem(0, 'Lovely water reflections.')).toBe('Choose 1 to 5 stars.');
		expect(reviewProblem(4.5, 'Lovely water reflections.')).toBe('Choose 1 to 5 stars.');
		expect(reviewProblem(3, 'short')).toBe('Write at least 10 characters.');
		expect(reviewProblem(3, 'x'.repeat(4001))).toBe('Keep it under 4000 characters.');
	});

	it('keeps one review per person, updates it, and keeps the average right', async () => {
		const a = await makeUser(db);
		const b = await makeUser(db);
		const id = await project();

		const first = await saveReview(db, {
			projectId: id,
			userId: a.id,
			rating: 2,
			body: 'Too dark at night.'
		});
		const updated = await saveReview(db, {
			projectId: id,
			userId: a.id,
			rating: 4,
			body: 'Better after the update.'
		});
		expect(updated.id).toBe(first.id);
		await saveReview(db, { projectId: id, userId: b.id, rating: 5, body: 'Wonderful clouds.' });

		expect(await getProject(db, id)).toMatchObject({ ratingSum: 9, ratingCount: 2 });
		expect(await ratingHistogram(db, id)).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 });
		expect((await userReview(db, id, a.id))?.rating).toBe(4);
		expect(await userReview(db, id, undefined)).toBeNull();
		const list = await listReviews(db, id);
		expect(list.map((r) => r.review.rating)).toEqual([5, 4]);
		expect(list[0]!.author.username).toBe(b.username);
	});

	it('lets the team reply, staff hide, and authors delete', async () => {
		const a = await makeUser(db);
		const id = await project();
		const review = await saveReview(db, {
			projectId: id,
			userId: a.id,
			rating: 1,
			body: 'Crashes on start-up.'
		});

		await replyToReview(db, review.id, 'Fixed in 1.2, thanks!');
		expect((await getReview(db, review.id))?.ownerReply).toBe('Fixed in 1.2, thanks!');
		await replyToReview(db, review.id, null);
		expect((await getReview(db, review.id))?.ownerReplyAt).toBeNull();

		await setReviewStatus(db, review.id, 'hidden');
		expect(await listReviews(db, id)).toEqual([]);
		expect(await listReviews(db, id, { includeHidden: true })).toHaveLength(1);
		expect((await getProject(db, id))?.ratingCount).toBe(0);

		await deleteReview(db, review.id);
		expect(await getReview(db, review.id)).toBeNull();
	});
});

describe('collections', () => {
	it('checks names, and creates, edits and deletes collections', async () => {
		expect(collectionProblem('Favourites', '')).toBeNull();
		expect(collectionProblem(' ', '')).toBe('Use a name of 1 to 64 characters.');
		expect(collectionProblem('x', 'y'.repeat(501))).toBe(
			'Keep the description under 500 characters.'
		);

		const owner = await makeUser(db);
		const c = await createCollection(db, owner.id, {
			name: 'Night packs',
			description: '',
			visibility: 'private'
		});
		await updateCollection(db, c.id, {
			name: 'Night shaders',
			description: 'Dark and moody',
			visibility: 'public'
		});
		expect(await getCollection(db, c.id)).toMatchObject({
			name: 'Night shaders',
			visibility: 'public'
		});
		await deleteCollection(db, c.id);
		expect(await getCollection(db, c.id)).toBeNull();
	});

	it('holds approved projects, and says which collections hold a project', async () => {
		const owner = await makeUser(db);
		const shown = await project('approved');
		const hidden = await project('draft');
		const c = await createCollection(db, owner.id, {
			name: 'Mine',
			description: '',
			visibility: 'unlisted'
		});
		const other = await createCollection(db, owner.id, {
			name: 'Other',
			description: '',
			visibility: 'public'
		});

		await setInCollection(db, c.id, shown, true);
		await setInCollection(db, c.id, hidden, true);
		await setInCollection(db, c.id, shown, true);
		expect(await collectionProjectIds(db, c.id)).toEqual([shown]);

		const list = await userCollections(db, owner.id, { projectId: shown });
		expect(list.map((l) => [l.collection.name, l.size, l.contains])).toEqual(
			expect.arrayContaining([
				['Mine', 2, true],
				['Other', 0, false]
			])
		);
		expect(
			(await userCollections(db, owner.id, { publicOnly: true })).map((l) => l.collection.name)
		).toEqual(['Other']);

		await setInCollection(db, c.id, shown, false);
		expect(await collectionProjectIds(db, c.id)).toEqual([]);
	});

	it('shows private collections only to their owner and staff', () => {
		const c = { ownerId: 'o', visibility: 'private' as const, hidden: false };
		expect(canSeeCollection(c, 'o', false)).toBe(true);
		expect(canSeeCollection(c, 'x', false)).toBe(false);
		expect(canSeeCollection(c, undefined, true)).toBe(true);
		expect(canSeeCollection({ ...c, visibility: 'unlisted' }, undefined, false)).toBe(true);
		expect(canSeeCollection({ ...c, visibility: 'public', hidden: true }, undefined, false)).toBe(
			false
		);
	});
});

describe('reports', () => {
	it('files, lists and closes reports', async () => {
		const reporter = await makeUser(db);
		const staff = await makeUser(db, { role: 'moderator' });
		expect(isReportReason('malware')).toBe(true);
		expect(isReportReason('boring')).toBe(false);
		expect(isReportTarget('review')).toBe(true);
		expect(isReportTarget('server')).toBe(false);

		const report = await createReport(db, {
			reporterId: reporter.id,
			targetType: 'project',
			targetId: 'p1',
			reason: 'stolen',
			body: 'x'.repeat(3000)
		});
		expect(report.body).toHaveLength(2000);
		expect(await countOpenReports(db)).toBeGreaterThan(0);
		expect((await listReports(db)).map((r) => r.report.id)).toContain(report.id);

		expect(
			await closeReport(db, report.id, staff.id, 'resolved', 'Removed the reupload.')
		).toMatchObject({ status: 'resolved', resolvedBy: staff.id });
		expect(await closeReport(db, report.id, staff.id, 'dismissed', 'x')).toBeNull();
		expect((await listReports(db, 'resolved')).map((r) => r.report.id)).toContain(report.id);
	});
});

describe('moderation', () => {
	it('approves a submitted project and tells its team', async () => {
		const owner = await makeUser(db);
		const id = await project('in_review', owner.id);

		expect((await reviewQueue(db)).map((q) => q.project.id)).toContain(id);
		expect(await decide(db, id, 'approve', '')).toBe('done');
		expect(await getProject(db, id)).toMatchObject({
			status: 'approved',
			publishedAt: expect.any(Date)
		});
		expect((await listNotifications(db, owner.id))[0]).toMatchObject({ kind: 'project_approved' });
	});

	it('needs a message to reject, ask for changes or withhold, and passes it on', async () => {
		const owner = await makeUser(db);
		const id = await project('in_review', owner.id);

		expect(await decide(db, id, 'reject', ' ')).toBe('needs-message');
		expect(await decide(db, id, 'changes', 'Please add screenshots.')).toBe('done');
		expect(await getProject(db, id)).toMatchObject({
			status: 'draft',
			moderationMessage: 'Please add screenshots.'
		});
		expect((await listNotifications(db, owner.id))[0]?.data).toMatchObject({
			message: 'Please add screenshots.'
		});
		expect(await decide(db, id, 'withhold', 'x')).toBe('not-allowed');
		expect(await decide(db, id, 'reject', 'Not a shader pack.')).toBe('done');
		expect((await getProject(db, id))?.status).toBe('rejected');
		expect(await decide(db, 'missing', 'approve', '')).toBe('missing');
	});

	it('only allows decisions that fit the project state', async () => {
		expect(allowedDecisions('in_review')).toEqual(['approve', 'changes', 'reject']);
		expect(allowedDecisions('approved')).toEqual(['withhold']);
		expect(allowedDecisions('withheld')).toEqual(['restore']);
		expect(allowedDecisions('rejected')).toEqual(['approve']);
		const id = await project('approved');
		expect(await decide(db, id, 'approve', '')).toBe('not-allowed');
		expect(await decide(db, id, 'withhold', 'Reported as stolen.')).toBe('done');
		expect(await decide(db, id, 'restore', '')).toBe('done');
		expect((await getProject(db, id))?.status).toBe('approved');
	});

	it('clears or removes files the scanner could not', async () => {
		const owner = await makeUser(db);
		const id = await project('approved', owner.id);
		const versionId = newId();
		await db.insert(versions).values({
			id: versionId,
			projectId: id,
			versionNumber: '1',
			name: 'One',
			gameVersions: [],
			loaders: []
		});
		const fileId = newId();
		await db.insert(files).values({
			id: fileId,
			versionId,
			filename: 'a.zip',
			size: 1,
			sha1: 'x',
			sha512: 'y',
			scanStatus: 'review'
		});

		expect((await fileQueue(db)).map((f) => f.file.id)).toContain(fileId);
		expect(await setFileVerdict(db, fileId, 'infected', 'Contains a stealer.')).toBe(true);
		expect((await listNotifications(db, owner.id))[0]).toMatchObject({ kind: 'file_flagged' });
		expect(await setFileVerdict(db, fileId, 'clean', '')).toBe(true);
		expect((await fileQueue(db)).map((f) => f.file.id)).not.toContain(fileId);
		expect(await setFileVerdict(db, 'missing', 'clean', '')).toBe(false);
	});

	it('changes roles and bans, signing the person out everywhere', async () => {
		const user = await makeUser(db, { username: 'Troublemaker', email: 'trouble@x.org' });
		const { token } = await createSession(db, { userId: user.id, ipHash: 'i', userAgent: 'u' });

		expect((await listUsers(db, 'troublem')).map((u) => u.id)).toEqual([user.id]);
		expect((await listUsers(db, 'trouble@x')).map((u) => u.id)).toEqual([user.id]);
		expect((await listUsers(db, '%')).length).toBe(0);

		await setRole(db, user.id, 'moderator');
		expect((await findUserById(db, user.id))?.role).toBe('moderator');
		expect(await validateSession(db, token)).toBeNull();

		const again = await createSession(db, { userId: user.id, ipHash: 'i', userAgent: 'u' });
		await setBan(db, user.id, 'Uploading malware');
		expect(await findUserById(db, user.id)).toMatchObject({
			banReason: 'Uploading malware',
			bannedAt: expect.any(Date)
		});
		expect(await db.select().from(sessions).where(eq(sessions.id, again.session.id))).toEqual([]);
		await setBan(db, user.id, null);
		expect((await findUserById(db, user.id))?.bannedAt).toBeNull();
	});

	it('summarises the site and reads the audit log newest first', async () => {
		const actor = await makeUser(db);
		await audit(db, {
			actorId: actor.id,
			action: 'moderation.approve',
			targetType: 'project',
			targetId: 'p'
		});
		await audit(db, { actorId: actor.id, action: 'auth.sign_in' });

		const stats = await overview(db);
		expect(stats.totalUsers).toBeGreaterThan(0);
		const entries = await auditEntries(db, { limit: 2 });
		expect(entries.map((e) => e.entry.action)).toEqual(['auth.sign_in', 'moderation.approve']);
		expect(
			(await auditEntries(db, { action: 'moderation' })).every((e) =>
				e.entry.action.startsWith('moderation')
			)
		).toBe(true);
		expect(
			await auditEntries(db, { before: entries[1]!.entry.id, action: 'auth.sign_in' })
		).toEqual([]);
		expect(await projectNames(db, [])).toEqual(new Map());
	});
});

describe('gallery', () => {
	const image = (n: number) => ({ key: String(n).padStart(64, '0'), width: 1920, height: 1080 });

	it('adds images (first one featured), captions, reorders and removes them', async () => {
		const id = await project();
		const a = (await addImage(db, id, image(1), 'Sunset'))!;
		const b = (await addImage(db, id, image(2)))!;
		expect([a.featured, b.featured]).toEqual([true, false]);

		await updateImage(db, id, b.id, { title: 'Water', description: 'Reflections', featured: true });
		let list = await listGallery(db, id);
		expect(list.map((g) => [g.title, g.featured])).toEqual([
			['Sunset', false],
			['Water', true]
		]);

		await moveImage(db, id, b.id, -1);
		list = await listGallery(db, id);
		expect(list.map((g) => g.title)).toEqual(['Water', 'Sunset']);
		await moveImage(db, id, b.id, -1);
		await moveImage(db, id, 'missing', 1);

		await removeImage(db, id, a.id);
		expect((await listGallery(db, id)).map((g) => g.id)).toEqual([b.id]);
	});

	it(`stops at ${GALLERY_MAX} images`, async () => {
		const id = await project();
		for (let i = 0; i < GALLERY_MAX; i++) await addImage(db, id, image(i));
		expect(await addImage(db, id, image(99))).toBeNull();
	});
});
