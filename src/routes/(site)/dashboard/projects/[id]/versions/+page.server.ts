import { fail } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { field } from '#lib/server/http.ts';
import { editableProject } from '#lib/server/marketplace/editor.ts';
import { deleteVersion, getVersion, listVersions } from '#lib/server/marketplace/releases.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { project } = await parent();
	const versions = await listVersions(locals.db, project.id, true);
	return {
		versions: versions.map((v) => ({
			id: v.id,
			name: v.name,
			versionNumber: v.versionNumber,
			channel: v.channel,
			status: v.status,
			gameVersions: v.gameVersions,
			loaders: v.loaders,
			downloads: v.downloads,
			publishedAt: v.publishedAt,
			files: v.files.map((f) => ({
				id: f.id,
				filename: f.filename,
				scanStatus: f.scanStatus,
				scanDetail: f.scanDetail
			}))
		}))
	};
};

export const actions: Actions = {
	delete: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		const version = await getVersion(locals.db, field(await request.formData(), 'id'));
		if (!version || version.projectId !== project.id)
			return fail(404, { message: 'Version not found.' });
		await deleteVersion(locals.db, version.id);
		await audit(locals.db, {
			actorId: user.id,
			action: 'version.deleted',
			targetType: 'project',
			targetId: project.id,
			details: { version: version.versionNumber },
			ipHash: locals.ipHash
		});
		return { deleted: true };
	}
};
