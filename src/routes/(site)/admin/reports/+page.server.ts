import { fail } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { requireStaff } from '#lib/server/auth/guards.ts';
import {
	closeReport,
	getReview,
	listReports,
	setReviewStatus
} from '#lib/server/community/community.ts';
import { notify } from '#lib/server/community/notifications.ts';
import { projects, reviews, users, versions } from '#lib/server/db/schema.ts';
import { field } from '#lib/server/http.ts';
import type { Actions, PageServerLoad } from './$types';

/** Where each reported thing lives, so a moderator can open it. */
async function targets(db: App.Locals['db'], rows: Awaited<ReturnType<typeof listReports>>) {
	const ids = (type: string) =>
		rows.filter((r) => r.report.targetType === type).map((r) => r.report.targetId);
	const lookup = async <T>(list: string[], query: (list: string[]) => Promise<T[]>) =>
		list.length ? query(list) : [];
	const [p, v, r, u] = await Promise.all([
		lookup(ids('project'), (l) =>
			db
				.select({ id: projects.id, name: projects.name, slug: projects.slug, type: projects.type })
				.from(projects)
				.where(inArray(projects.id, l))
		),
		lookup(ids('version'), (l) =>
			db
				.select({ id: versions.id, name: versions.name, slug: projects.slug, type: projects.type })
				.from(versions)
				.innerJoin(projects, eq(projects.id, versions.projectId))
				.where(inArray(versions.id, l))
		),
		lookup(ids('review'), (l) =>
			db
				.select({
					id: reviews.id,
					body: reviews.body,
					status: reviews.status,
					slug: projects.slug,
					type: projects.type,
					name: projects.name
				})
				.from(reviews)
				.innerJoin(projects, eq(projects.id, reviews.projectId))
				.where(inArray(reviews.id, l))
		),
		lookup(ids('user'), (l) =>
			db
				.select({ id: users.id, username: users.username, displayName: users.displayName })
				.from(users)
				.where(inArray(users.id, l))
		)
	]);
	return { projects: p, versions: v, reviews: r, users: u };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireStaff(locals);
	const status = url.searchParams.get('status') === 'closed' ? 'resolved' : 'open';
	const rows = await listReports(locals.db, status);
	return { status, reports: rows, targets: await targets(locals.db, rows) };
};

export const actions: Actions = {
	close: async ({ request, locals }) => {
		const { user } = requireStaff(locals);
		const data = await request.formData();
		const status = field(data, 'status') === 'resolved' ? 'resolved' : 'dismissed';
		const resolution = field(data, 'resolution').slice(0, 1000);
		if (!resolution) return fail(400, { message: 'Write what you did, so others know.' });
		const report = await closeReport(locals.db, field(data, 'id'), user.id, status, resolution);
		if (!report) return fail(404, { message: 'That report was already handled.' });
		if (report.reporterId && status === 'resolved')
			await notify(locals.db, [report.reporterId], 'report_resolved', { message: resolution });
		await audit(locals.db, {
			actorId: user.id,
			action: `moderation.report_${status}`,
			targetType: report.targetType,
			targetId: report.targetId,
			details: { resolution },
			ipHash: locals.ipHash
		});
		return { closed: true };
	},

	hideReview: async ({ request, locals }) => {
		const { user } = requireStaff(locals);
		const review = await getReview(locals.db, field(await request.formData(), 'review'));
		if (!review) return fail(404, { message: 'Review not found.' });
		const hide = review.status === 'visible';
		await setReviewStatus(locals.db, review.id, hide ? 'hidden' : 'visible');
		await audit(locals.db, {
			actorId: user.id,
			action: hide ? 'moderation.review_hidden' : 'moderation.review_shown',
			targetType: 'review',
			targetId: review.id,
			ipHash: locals.ipHash
		});
		return { done: true };
	}
};
