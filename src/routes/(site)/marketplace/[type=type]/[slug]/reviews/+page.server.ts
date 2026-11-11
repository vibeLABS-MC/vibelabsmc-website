import { error, fail } from '@sveltejs/kit';
import {
	deleteReview,
	getReview,
	listReviews,
	ratingHistogram,
	replyToReview,
	reviewProblem,
	saveReview,
	userReview
} from '#lib/server/community/community.ts';
import { notify } from '#lib/server/community/notifications.ts';
import { field, limitAction } from '#lib/server/http.ts';
import { getProjectBySlug, memberRole } from '#lib/server/marketplace/projects.ts';
import { typeFromPath } from '#lib/marketplace/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { project } = await parent();
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const [reviews, histogram, mine] = await Promise.all([
		listReviews(locals.db, project.id, { page, perPage: 10 }),
		ratingHistogram(locals.db, project.id),
		userReview(locals.db, project.id, locals.user?.id)
	]);
	return { reviews, histogram, mine, page };
};

async function context(locals: App.Locals, params: { type: string; slug: string }) {
	if (!locals.user) error(401, 'Sign in first.');
	const info = typeFromPath(params.type);
	const project = info ? await getProjectBySlug(locals.db, info.id, params.slug) : null;
	if (!project || project.status !== 'approved') error(404, 'Not found');
	return {
		user: locals.user,
		project,
		role: await memberRole(locals.db, project.id, locals.user.id)
	};
}

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const { user, project, role } = await context(locals, params);
		if (role) return fail(403, { message: 'You can’t review a project you work on.' });
		const limited = limitAction(locals, 'review', user.id);
		if (limited) return limited;
		const data = await request.formData();
		const rating = Number(field(data, 'rating'));
		const body = field(data, 'body');
		const problem = reviewProblem(rating, body);
		if (problem) return fail(400, { message: problem, rating, body });
		await saveReview(locals.db, { projectId: project.id, userId: user.id, rating, body });
		return { saved: true };
	},

	delete: async ({ request, locals, params }) => {
		const { user, project } = await context(locals, params);
		const review = await getReview(locals.db, field(await request.formData(), 'id'));
		if (!review || review.projectId !== project.id || review.userId !== user.id)
			return fail(404, { message: 'Review not found.' });
		await deleteReview(locals.db, review.id);
		return { deleted: true };
	},

	reply: async ({ request, locals, params }) => {
		const { user, project, role } = await context(locals, params);
		if (!role) return fail(403, { message: 'Only the project team can reply.' });
		const data = await request.formData();
		const review = await getReview(locals.db, field(data, 'id'));
		if (!review || review.projectId !== project.id)
			return fail(404, { message: 'Review not found.' });
		const reply = field(data, 'reply').slice(0, 2000);
		await replyToReview(locals.db, review.id, reply || null);
		if (reply && review.userId !== user.id)
			await notify(locals.db, [review.userId], 'review_reply', {
				projectId: project.id,
				projectName: project.name,
				projectType: project.type,
				slug: project.slug
			});
		return { replied: true };
	}
};
