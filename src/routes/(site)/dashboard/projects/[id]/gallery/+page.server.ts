import { fail } from '@sveltejs/kit';
import { field, file, limitAction } from '#lib/server/http.ts';
import { editableProject } from '#lib/server/marketplace/editor.ts';
import {
	addImage,
	GALLERY_MAX,
	listGallery,
	moveImage,
	removeImage,
	updateImage
} from '#lib/server/marketplace/gallery.ts';
import { ImageError, storeImage } from '#lib/server/media/images.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { project } = await parent();
	return { gallery: await listGallery(locals.db, project.id), max: GALLERY_MAX };
};

export const actions: Actions = {
	upload: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		const limited = limitAction(locals, 'upload', user.id);
		if (limited) return limited;
		const data = await request.formData();
		const upload = file(data, 'image');
		if (!upload) return fail(400, { message: 'Choose an image.' });
		try {
			const stored = await storeImage(
				locals.config.storageDir,
				Buffer.from(await upload.arrayBuffer()),
				'gallery'
			);
			const added = await addImage(locals.db, project.id, stored, field(data, 'title'));
			if (!added) return fail(400, { message: `A gallery holds up to ${GALLERY_MAX} images.` });
			return { added: true };
		} catch (cause) {
			if (cause instanceof ImageError) return fail(400, { message: cause.message });
			throw cause;
		}
	},

	update: async ({ request, locals, params }) => {
		const { project } = await editableProject(locals, params.id);
		const data = await request.formData();
		await updateImage(locals.db, project.id, field(data, 'id'), {
			title: field(data, 'title'),
			description: field(data, 'description'),
			featured: data.get('featured') === 'on'
		});
		return { saved: true };
	},

	move: async ({ request, locals, params }) => {
		const { project } = await editableProject(locals, params.id);
		const data = await request.formData();
		await moveImage(
			locals.db,
			project.id,
			field(data, 'id'),
			field(data, 'direction') === 'up' ? -1 : 1
		);
		return { moved: true };
	},

	remove: async ({ request, locals, params }) => {
		const { project } = await editableProject(locals, params.id);
		await removeImage(locals.db, project.id, field(await request.formData(), 'id'));
		return { removed: true };
	}
};
