import { error, fail, redirect } from '@sveltejs/kit';
import { listGameVersions } from '#lib/server/marketplace/catalog.ts';
import { editableProject } from '#lib/server/marketplace/editor.ts';
import { getVersion, updateVersion } from '#lib/server/marketplace/releases.ts';
import { readVersionFields } from '#lib/server/marketplace/version-form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { project } = await editableProject(locals, params.id);
	const version = await getVersion(locals.db, params.vid);
	if (!version || version.projectId !== project.id) error(404, 'Not found');
	return { version, gameVersions: (await listGameVersions(locals.db)).map((v) => v.version) };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { project } = await editableProject(locals, params.id);
		const version = await getVersion(locals.db, params.vid);
		if (!version || version.projectId !== project.id) error(404, 'Not found');
		const values = await readVersionFields(
			locals.db,
			project.type,
			await request.formData(),
			version.name
		);
		if ('problem' in values) return fail(400, { message: values.problem });
		await updateVersion(locals.db, version.id, values);
		redirect(303, `/dashboard/projects/${project.id}/versions`);
	}
};
