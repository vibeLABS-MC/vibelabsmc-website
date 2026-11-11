import { fail } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { requireAdmin, requireStaff, sudoFailure } from '#lib/server/auth/guards.ts';
import { hasSudo } from '#lib/server/auth/session.ts';
import { deleteUserSessions } from '#lib/server/auth/session.ts';
import { findUserById } from '#lib/server/auth/users.ts';
import { isStaff, type Role } from '#lib/server/auth/access.ts';
import { listUsers, setBan, setRole } from '#lib/server/admin/moderation.ts';
import { field } from '#lib/server/http.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, session } = requireStaff(locals);
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 64);
	const rows = await listUsers(locals.db, q);
	return {
		q,
		me: user.id,
		isAdmin: user.role === 'admin',
		sudo: hasSudo(session),
		// Moderators don't see email addresses; admins do.
		users: rows.map((u) => ({
			...u,
			email: user.role === 'admin' ? u.email : null,
			totp: !!u.totp
		}))
	};
};

const ROLES: Role[] = ['user', 'moderator', 'admin'];

async function target(locals: App.Locals, data: FormData, me: string) {
	const user = await findUserById(locals.db, field(data, 'user'));
	if (!user) return { problem: fail(404, { message: 'User not found.' }) };
	if (user.id === me)
		return { problem: fail(400, { message: 'You can’t do that to your own account.' }) };
	return { user };
}

export const actions: Actions = {
	role: async ({ request, locals }) => {
		const { user: admin } = requireAdmin(locals);
		const sudo = sudoFailure(locals, '/admin/users');
		if (sudo) return sudo;
		const data = await request.formData();
		const found = await target(locals, data, admin.id);
		if ('problem' in found) return found.problem;
		const role = field(data, 'role') as Role;
		if (!ROLES.includes(role)) return fail(400, { message: 'Unknown role.' });
		await setRole(locals.db, found.user.id, role);
		await audit(locals.db, {
			actorId: admin.id,
			action: 'admin.role_changed',
			targetType: 'user',
			targetId: found.user.id,
			details: { from: found.user.role, to: role },
			ipHash: locals.ipHash
		});
		return {
			done: `${found.user.displayName} is now ${role === 'user' ? 'a regular user' : `a ${role}`}. They were signed out everywhere.`
		};
	},

	ban: async ({ request, locals }) => {
		const { user: staff } = requireStaff(locals);
		const sudo = sudoFailure(locals, '/admin/users');
		if (sudo) return sudo;
		const data = await request.formData();
		const found = await target(locals, data, staff.id);
		if ('problem' in found) return found.problem;
		if (isStaff(found.user.role) && staff.role !== 'admin')
			return fail(403, { message: 'Only admins can suspend staff.' });
		const reason = field(data, 'reason').slice(0, 300);
		const banning = !found.user.bannedAt;
		if (banning && !reason)
			return fail(400, { message: 'Give a reason: the person sees it when they try to sign in.' });
		await setBan(locals.db, found.user.id, banning ? reason : null);
		await audit(locals.db, {
			actorId: staff.id,
			action: banning ? 'admin.user_banned' : 'admin.user_unbanned',
			targetType: 'user',
			targetId: found.user.id,
			details: banning ? { reason } : {},
			ipHash: locals.ipHash
		});
		return {
			done: banning
				? `${found.user.displayName} is suspended and signed out.`
				: `${found.user.displayName} can sign in again.`
		};
	},

	signOut: async ({ request, locals }) => {
		const { user: staff } = requireStaff(locals);
		const found = await target(locals, await request.formData(), staff.id);
		if ('problem' in found) return found.problem;
		await deleteUserSessions(locals.db, found.user.id);
		await audit(locals.db, {
			actorId: staff.id,
			action: 'admin.sessions_revoked',
			targetType: 'user',
			targetId: found.user.id,
			ipHash: locals.ipHash
		});
		return { done: `${found.user.displayName} was signed out everywhere.` };
	}
};
