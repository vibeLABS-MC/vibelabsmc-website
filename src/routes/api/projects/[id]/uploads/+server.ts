import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { notify } from '#lib/server/community/notifications.ts';
import { users } from '#lib/server/db/schema.ts';
import { limitRequest } from '#lib/server/http.ts';
import { getProject, memberRole } from '#lib/server/marketplace/projects.ts';
import { stageReceived } from '#lib/server/marketplace/releases.ts';
import { extensionProblem, inspectUpload } from '#lib/server/uploads/inspect.ts';
import {
	cleanFilename,
	FILE_MAX_BYTES,
	receive,
	UploadError
} from '#lib/server/uploads/receive.ts';
import type { RequestHandler } from './$types';

/**
 * Upload one project file. The body is the raw file (the browser sends it with fetch, so it can
 * show progress); the name comes in `x-filename`. The file is streamed to disk, hashed,
 * checked and virus-scanned before the answer comes back.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Sign in to upload.');
	const project = await getProject(locals.db, params.id);
	if (!project || !(await memberRole(locals.db, project.id, user.id))) error(404, 'Not found');
	limitRequest(locals, 'upload', user.id);

	const filename = cleanFilename(decodeURIComponent(request.headers.get('x-filename') ?? ''));
	const wrongType = extensionProblem(project.type, filename);
	if (wrongType) error(400, wrongType);
	const declared = Number(request.headers.get('content-length') ?? 0);
	if (declared > FILE_MAX_BYTES) error(413, 'Files can be at most 100 MB.');
	if (!request.body) error(400, 'The upload is empty.');

	let received;
	try {
		received = await receive(request.body, locals.config.storageDir);
	} catch (cause) {
		if (cause instanceof UploadError) error(400, cause.message);
		throw cause;
	}

	const inspection = await inspectUpload(received.path, project.type, locals.config.clamd);
	if (!inspection.ok) {
		if (inspection.scan.status === 'infected') {
			await audit(locals.db, {
				actorId: user.id,
				action: 'upload.infected',
				targetType: 'project',
				targetId: project.id,
				details: { filename, sha512: received.sha512, signature: inspection.scan.detail },
				ipHash: locals.ipHash
			});
			const staff = await locals.db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.role, 'admin'));
			await notify(
				locals.db,
				staff.map((s) => s.id),
				'file_flagged',
				{
					projectId: project.id,
					projectName: project.name,
					slug: project.slug,
					projectType: project.type,
					message: `Upload refused: ${inspection.scan.detail} found in ${filename} (by ${user.username}).`
				}
			);
		}
		error(422, inspection.problems.join(' '));
	}

	const staged = await stageReceived(locals.db, locals.config.storageDir, {
		userId: user.id,
		projectId: project.id,
		filename,
		received,
		inspection
	});
	return json({
		id: staged.id,
		filename: staged.filename,
		size: staged.size,
		sha1: staged.sha1,
		scanStatus: staged.scanStatus,
		scanDetail: staged.scanDetail,
		detected: staged.detected
	});
};
