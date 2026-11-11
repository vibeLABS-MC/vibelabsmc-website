import { editableProject } from '#lib/server/marketplace/editor.ts';
import { missingForReview } from '#lib/server/marketplace/projects.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const { project, role } = await editableProject(locals, params.id);
	const { search: _search, ...rest } = project;
	return {
		project: rest,
		role,
		missing:
			project.status === 'draft' || project.status === 'rejected'
				? await missingForReview(locals.db, project)
				: []
	};
};
