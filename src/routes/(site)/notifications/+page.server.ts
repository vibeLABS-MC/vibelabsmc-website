import { requireUser } from '#lib/server/auth/guards.ts';
import { listNotifications, markRead } from '#lib/server/community/notifications.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = requireUser(locals, url);
	const before = Number(url.searchParams.get('before')) || undefined;
	const items = await listNotifications(locals.db, user.id, { before, limit: 30 });
	// Seen now: they stay highlighted on this page, and the header count clears on the next one.
	const unread = items.filter((n) => !n.readAt).map((n) => n.id);
	if (unread.length) await markRead(locals.db, user.id, unread);
	return { items, more: items.length === 30 ? items.at(-1)!.id : null };
};

export const actions: Actions = {
	readAll: async ({ locals, url }) => {
		const { user } = requireUser(locals, url);
		await markRead(locals.db, user.id);
		return { read: true };
	}
};
