import { fail, redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { field, limitAction } from '#lib/server/http.ts';
import { createProject } from '#lib/server/marketplace/projects.ts';
import { isProjectType, slugify, slugProblem } from '#lib/marketplace/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	requireUser(locals, url);
	const type = url.searchParams.get('type');
	return { type: type && isProjectType(type) ? type : 'shader' };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const data = await request.formData();
		const type = field(data, 'type');
		const name = field(data, 'name');
		const summary = field(data, 'summary');
		const slug = field(data, 'slug') || slugify(name);
		const values = { type, name, summary, slug };
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return fail(429, { ...values, message: limited.data.message });
		if (!isProjectType(type))
			return fail(400, { ...values, message: 'Choose what you’re publishing.' });
		if (name.length < 2 || name.length > 64)
			return fail(400, { ...values, message: 'Use a name of 2 to 64 characters.' });
		if (summary.length > 160)
			return fail(400, { ...values, message: 'Keep the summary to 160 characters.' });
		const problem = slugProblem(slug);
		if (problem) return fail(400, { ...values, message: `Address: ${problem}` });
		const made = await createProject(locals.db, { ownerId: user.id, type, name, slug, summary });
		if ('problem' in made)
			return fail(400, { ...values, message: 'That address is taken. Try another.' });
		await audit(locals.db, {
			actorId: user.id,
			action: 'project.created',
			targetType: 'project',
			targetId: made.project.id,
			details: { name, type },
			ipHash: locals.ipHash
		});
		redirect(303, `/dashboard/projects/${made.project.id}?created=1`);
	}
};
