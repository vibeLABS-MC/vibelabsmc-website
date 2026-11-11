import { fail, redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { sudoFailure } from '#lib/server/auth/guards.ts';
import { field } from '#lib/server/http.ts';
import { editableProject } from '#lib/server/marketplace/editor.ts';
import { deleteProject } from '#lib/server/marketplace/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	await editableProject(locals, params.id, 'owner');
	return {};
};

export const actions: Actions = {
	delete: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id, 'owner');
		const sudo = sudoFailure(locals, `/dashboard/projects/${project.id}/settings`);
		if (sudo) return sudo;
		if (field(await request.formData(), 'confirm') !== project.slug)
			return fail(400, { message: 'Type the project address exactly to confirm.' });
		await deleteProject(locals.db, project.id);
		await audit(locals.db, {
			actorId: user.id,
			action: 'project.deleted',
			targetType: 'project',
			targetId: project.id,
			details: { name: project.name, slug: project.slug },
			ipHash: locals.ipHash
		});
		redirect(303, '/dashboard');
	}
};
