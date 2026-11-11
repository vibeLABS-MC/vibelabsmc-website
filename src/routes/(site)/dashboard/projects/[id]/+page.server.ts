import { fail } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { field, fields, file, limitAction } from '#lib/server/http.ts';
import { listCategories, validCategories } from '#lib/server/marketplace/catalog.ts';
import { editableProject, linkProblem, lockedForReview } from '#lib/server/marketplace/editor.ts';
import {
	setIcon,
	submitForReview,
	updateDetails,
	withdrawSubmission
} from '#lib/server/marketplace/projects.ts';
import { ImageError, storeImage } from '#lib/server/media/images.ts';
import { licenseInfo, slugProblem } from '#lib/marketplace/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { project } = await parent();
	const categories = await listCategories(locals.db, project.type);
	return { categories: categories.map((c) => ({ slug: c.slug, name: c.name, group: c.group })) };
};

const LINKS = ['sourceUrl', 'issuesUrl', 'wikiUrl', 'discordUrl', 'licenseUrl'] as const;

export const actions: Actions = {
	details: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		if (lockedForReview(project))
			return fail(409, { message: 'Withdraw the submission to make changes.' });
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return limited;
		const data = await request.formData();
		const name = field(data, 'name');
		const slug = field(data, 'slug').toLowerCase();
		const summary = field(data, 'summary');
		const license = field(data, 'license');
		if (name.length < 2 || name.length > 64)
			return fail(400, { message: 'Use a name of 2 to 64 characters.' });
		if (summary.length > 160) return fail(400, { message: 'Keep the summary to 160 characters.' });
		const slugIssue = slugProblem(slug);
		if (slugIssue) return fail(400, { message: `Address: ${slugIssue}` });
		if (license && !licenseInfo(license))
			return fail(400, { message: 'Choose a licence from the list.' });
		const links = Object.fromEntries(LINKS.map((k) => [k, field(data, k) || null])) as Record<
			(typeof LINKS)[number],
			string | null
		>;
		for (const value of Object.values(links)) {
			const problem = linkProblem(value ?? '');
			if (problem) return fail(400, { message: problem });
		}
		if (license === 'custom' && !links.licenseUrl)
			return fail(400, { message: 'A custom licence needs a link to its text.' });
		const result = await updateDetails(locals.db, project.id, {
			name,
			slug,
			summary,
			license,
			categories: await validCategories(locals.db, project.type, fields(data, 'categories')),
			...links
		});
		if (result === 'slug-taken') return fail(400, { message: 'That address is taken.' });
		return { saved: true };
	},

	icon: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		const limited = limitAction(locals, 'upload', user.id);
		if (limited) return limited;
		const upload = file(await request.formData(), 'icon');
		if (!upload) return fail(400, { message: 'Choose an image.' });
		try {
			const stored = await storeImage(
				locals.config.storageDir,
				Buffer.from(await upload.arrayBuffer()),
				'icon'
			);
			await setIcon(locals.db, project.id, stored.key);
			return { saved: true };
		} catch (cause) {
			if (cause instanceof ImageError) return fail(400, { message: cause.message });
			throw cause;
		}
	},

	submit: async ({ locals, params }) => {
		const { project, user } = await editableProject(locals, params.id);
		const missing = await submitForReview(locals.db, project);
		if (missing.length) return fail(400, { message: `Add ${missing.join(', ')} first.` });
		await audit(locals.db, {
			actorId: user.id,
			action: 'project.submitted',
			targetType: 'project',
			targetId: project.id,
			ipHash: locals.ipHash
		});
		return { submitted: true };
	},

	withdraw: async ({ locals, params }) => {
		const { project } = await editableProject(locals, params.id);
		await withdrawSubmission(locals.db, project.id);
		return { withdrawn: true };
	}
};
