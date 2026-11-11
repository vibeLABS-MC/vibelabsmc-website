import { fail } from '@sveltejs/kit';
import { field, limitAction } from '#lib/server/http.ts';
import { editableProject, lockedForReview } from '#lib/server/marketplace/editor.ts';
import { listGallery } from '#lib/server/marketplace/gallery.ts';
import { updateDescription } from '#lib/server/marketplace/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { project } = await parent();
	const gallery = await listGallery(locals.db, project.id);
	return { images: gallery.map((g) => ({ key: g.imageKey, title: g.title })) };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		if (lockedForReview(project))
			return fail(409, { message: 'Withdraw the submission to make changes.' });
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return limited;
		const description = field(await request.formData(), 'description');
		if (description.length > 100_000)
			return fail(400, { message: 'Keep the description under 100,000 characters.' });
		await updateDescription(locals.db, project.id, description);
		return { saved: true };
	}
};
