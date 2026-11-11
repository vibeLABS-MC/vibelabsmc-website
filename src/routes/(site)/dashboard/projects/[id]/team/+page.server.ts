import { fail, redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { notify } from '#lib/server/community/notifications.ts';
import { field, limitAction } from '#lib/server/http.ts';
import { editableProject } from '#lib/server/marketplace/editor.ts';
import {
	inviteMember,
	listMembers,
	removeMember,
	transferOwnership
} from '#lib/server/marketplace/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { project } = await parent();
	return { members: await listMembers(locals.db, project.id, true), me: locals.user!.id };
};

export const actions: Actions = {
	invite: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id, 'owner');
		const limited = limitAction(locals, 'write', user.id);
		if (limited) return limited;
		const username = field(await request.formData(), 'username').replace(/^@/, '');
		const { result, userId } = await inviteMember(locals.db, project.id, username);
		if (result === 'no-user') return fail(404, { message: `Nobody is called “${username}”.` });
		if (result === 'already')
			return fail(400, { message: `${username} is already on the team or invited.` });
		await notify(locals.db, [userId!], 'team_invite', {
			projectId: project.id,
			projectName: project.name,
			projectType: project.type,
			slug: project.slug,
			from: user.username
		});
		await audit(locals.db, {
			actorId: user.id,
			action: 'project.member_invited',
			targetType: 'project',
			targetId: project.id,
			details: { username },
			ipHash: locals.ipHash
		});
		return { invited: username };
	},

	remove: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id, 'owner');
		const target = field(await request.formData(), 'user');
		if (!(await removeMember(locals.db, project.id, target)))
			return fail(400, { message: 'The owner can’t be removed. Transfer ownership first.' });
		await audit(locals.db, {
			actorId: user.id,
			action: 'project.member_removed',
			targetType: 'project',
			targetId: project.id,
			details: { userId: target },
			ipHash: locals.ipHash
		});
		return { removed: true };
	},

	transfer: async ({ request, locals, params }) => {
		const { project, user } = await editableProject(locals, params.id, 'owner');
		const target = field(await request.formData(), 'user');
		if (!(await transferOwnership(locals.db, project.id, user.id, target)))
			return fail(400, {
				message: 'Only a maintainer who accepted the invitation can become owner.'
			});
		await audit(locals.db, {
			actorId: user.id,
			action: 'project.ownership_transferred',
			targetType: 'project',
			targetId: project.id,
			details: { to: target },
			ipHash: locals.ipHash
		});
		return { transferred: true };
	},

	leave: async ({ locals, params }) => {
		const { project, role, user } = await editableProject(locals, params.id);
		if (role === 'owner') return fail(400, { message: 'Transfer ownership before leaving.' });
		await removeMember(locals.db, project.id, user.id);
		redirect(303, '/dashboard');
	}
};
