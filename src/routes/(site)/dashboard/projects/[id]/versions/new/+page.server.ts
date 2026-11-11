import { fail, redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { field, fields, limitAction } from '#lib/server/http.ts';
import { listGameVersions } from '#lib/server/marketplace/catalog.ts';
import { editableProject } from '#lib/server/marketplace/editor.ts';
import { listStaged, publishVersion } from '#lib/server/marketplace/releases.ts';
import {
	readDependencies,
	readVersionFields,
	versionNumberProblem
} from '#lib/server/marketplace/version-form.ts';
import { unsupportedLoaders } from '#lib/server/uploads/archive.ts';
import { LOADER_NAMES, type Loader } from '#lib/marketplace/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { project, user } = await editableProject(locals, params.id);
	const [staged, versions] = await Promise.all([
		listStaged(locals.db, project.id, user.id),
		listGameVersions(locals.db)
	]);
	return {
		staged: staged.map((s) => ({
			id: s.id,
			filename: s.filename,
			size: s.size,
			scanStatus: s.scanStatus,
			scanDetail: s.scanDetail,
			detected: s.detected as { loaders?: string[] }
		})),
		gameVersions: versions.map((v) => v.version)
	};
};

const PROBLEMS = {
	'no-files': 'Upload at least one file.',
	'foreign-file': 'Some of those files aren’t yours to publish. Reload the page.',
	infected: 'A file failed the virus scan.',
	'duplicate-number': 'This project already has a version with that number.'
} as const;

export const actions: Actions = {
	publish: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return limited;
		const data = await request.formData();
		const versionNumber = field(data, 'versionNumber');
		const numberProblem = versionNumberProblem(versionNumber);
		if (numberProblem) return fail(400, { message: numberProblem });
		const values = await readVersionFields(
			locals.db,
			project.type,
			data,
			`${project.name} ${versionNumber}`
		);
		if ('problem' in values) return fail(400, { message: values.problem });

		const stagedIds = fields(data, 'files');
		if (project.type === 'mod') {
			const staged = (await listStaged(locals.db, project.id, user.id)).filter((s) =>
				stagedIds.includes(s.id)
			);
			const detected = [
				...new Set(staged.flatMap((s) => (s.detected as { loaders?: Loader[] }).loaders ?? []))
			];
			const missing = unsupportedLoaders(values.loaders, detected);
			if (missing.length)
				return fail(400, {
					message: `The jar has no manifest for ${missing.map((l) => LOADER_NAMES[l]).join(' or ')}. Untick it, or upload a jar built for it.`
				});
		}

		const result = await publishVersion(locals.db, locals.config.storageDir, {
			project,
			authorId: user.id,
			versionNumber,
			...values,
			stagedIds,
			primaryId: field(data, 'primary') || null,
			dependencies: await readDependencies(locals.db, data)
		});
		if ('problem' in result) return fail(400, { message: PROBLEMS[result.problem] });
		await audit(locals.db, {
			actorId: user.id,
			action: 'version.published',
			targetType: 'project',
			targetId: project.id,
			details: { version: versionNumber },
			ipHash: locals.ipHash
		});
		redirect(
			303,
			`/dashboard/projects/${project.id}/versions?published=${encodeURIComponent(versionNumber)}`
		);
	}
};
