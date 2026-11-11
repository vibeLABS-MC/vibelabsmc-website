import { error, fail } from '@sveltejs/kit';
import {
	createReport,
	getCollection,
	isReportReason,
	isReportTarget,
	setFollow,
	setInCollection
} from '#lib/server/community/community.ts';
import { field, limitAction } from '#lib/server/http.ts';
import { renderMarkdown } from '#lib/server/marketplace/markdown.ts';
import { canView, getProjectBySlug, memberRole } from '#lib/server/marketplace/projects.ts';
import { typeFromPath } from '#lib/marketplace/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();
	return { descriptionHtml: renderMarkdown(project.description) };
};

/** The project for an action, checked the same way the page is. */
async function projectFor(locals: App.Locals, params: { type: string; slug: string }) {
	const info = typeFromPath(params.type);
	const project = info ? await getProjectBySlug(locals.db, info.id, params.slug) : null;
	if (!project) error(404, 'Not found');
	const role = await memberRole(locals.db, project.id, locals.user?.id);
	if (!canView(project, role, locals.user?.role ?? null)) error(404, 'Not found');
	return project;
}

export const actions: Actions = {
	follow: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to follow projects.' });
		const project = await projectFor(locals, params);
		const limited = limitAction(locals, 'write', locals.user.id);
		if (limited) return limited;
		await setFollow(
			locals.db,
			locals.user.id,
			project.id,
			field(await request.formData(), 'on') === '1'
		);
		return { followed: true };
	},

	collect: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to save projects.' });
		const project = await projectFor(locals, params);
		const data = await request.formData();
		const collection = await getCollection(locals.db, field(data, 'collection'));
		if (!collection || collection.ownerId !== locals.user.id)
			return fail(404, { message: 'Collection not found.' });
		await setInCollection(locals.db, collection.id, project.id, field(data, 'on') === '1');
		return { collected: true };
	},

	report: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to report.' });
		await projectFor(locals, params);
		const limited = limitAction(locals, 'report', locals.user.id);
		if (limited) return limited;
		const data = await request.formData();
		const targetType = field(data, 'target');
		const reason = field(data, 'reason');
		const targetId = field(data, 'id');
		if (!isReportTarget(targetType) || !isReportReason(reason) || !targetId)
			return fail(400, { message: 'Choose a reason.' });
		await createReport(locals.db, {
			reporterId: locals.user.id,
			targetType,
			targetId,
			reason,
			body: field(data, 'body')
		});
		return { reported: true };
	}
};
