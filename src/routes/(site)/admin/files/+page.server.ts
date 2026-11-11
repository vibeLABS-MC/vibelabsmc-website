import { fail } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { requireStaff } from '#lib/server/auth/guards.ts';
import { fileQueue, setFileVerdict } from '#lib/server/admin/moderation.ts';
import { field } from '#lib/server/http.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireStaff(locals);
	return { files: await fileQueue(locals.db) };
};

export const actions: Actions = {
	verdict: async ({ request, locals }) => {
		const { user } = requireStaff(locals);
		const data = await request.formData();
		const verdict = field(data, 'verdict');
		if (verdict !== 'clean' && verdict !== 'infected')
			return fail(400, { message: 'Unknown verdict.' });
		const fileId = field(data, 'file');
		const note = field(data, 'note').slice(0, 500);
		if (verdict === 'infected' && !note)
			return fail(400, { message: 'Say why the file is removed: the team is told.' });
		if (!(await setFileVerdict(locals.db, fileId, verdict, note)))
			return fail(404, { message: 'File not found.' });
		await audit(locals.db, {
			actorId: user.id,
			action: `moderation.file_${verdict}`,
			targetType: 'file',
			targetId: fileId,
			details: note ? { note } : {},
			ipHash: locals.ipHash
		});
		return { done: true };
	}
};
