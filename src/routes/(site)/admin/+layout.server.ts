import { requireStaff } from '#lib/server/auth/guards.ts';
import { overview } from '#lib/server/admin/moderation.ts';
import type { LayoutServerLoad } from './$types';

/** Staff only (with two-factor passed); the request hook already turned everyone else away. */
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = requireStaff(locals);
	return { counts: await overview(locals.db), isAdmin: user.role === 'admin' };
};
