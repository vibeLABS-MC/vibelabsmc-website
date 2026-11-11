import { eq, inArray } from 'drizzle-orm';
import { requireStaff } from '#lib/server/auth/guards.ts';
import { moderate } from '#lib/server/admin/actions.ts';
import { reviewQueue } from '#lib/server/admin/moderation.ts';
import { files, versions } from '#lib/server/db/schema.ts';
import { markdownToText } from '#lib/server/marketplace/markdown.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	const queue = await reviewQueue(locals.db);
	const ids = queue.map((q) => q.project.id);
	const fileRows = ids.length
		? await locals.db
				.select({ projectId: versions.projectId, scan: files.scanStatus, name: files.filename })
				.from(files)
				.innerJoin(versions, eq(versions.id, files.versionId))
				.where(inArray(versions.projectId, ids))
		: [];
	return {
		queue: queue.map(({ project, owner }) => ({
			id: project.id,
			name: project.name,
			slug: project.slug,
			type: project.type,
			iconKey: project.iconKey,
			summary: project.summary,
			description: markdownToText(project.description, 400),
			license: project.license,
			submittedAt: project.submittedAt,
			owner,
			files: fileRows.filter((f) => f.projectId === project.id)
		}))
	};
};

export const actions: Actions = {
	moderate: async ({ request, locals }) => moderate(locals, await request.formData())
};
