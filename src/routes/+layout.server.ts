import { unreadCount } from '#lib/server/community/notifications.ts';
import type { LayoutServerLoad } from './$types';

/** Every page knows who is signed in (just what the header needs) and how many notifications wait. */
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) return { user: null, unread: 0 };
	return {
		user: {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			avatarKey: user.avatarKey,
			role: user.role
		},
		unread: await unreadCount(locals.db, user.id)
	};
};
