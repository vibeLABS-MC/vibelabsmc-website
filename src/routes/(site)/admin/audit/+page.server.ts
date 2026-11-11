import { requireStaff } from '#lib/server/auth/guards.ts';
import { auditEntries } from '#lib/server/admin/moderation.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireStaff(locals);
	const action = (url.searchParams.get('action') ?? '').trim().slice(0, 40);
	const before = Number(url.searchParams.get('before')) || undefined;
	const entries = await auditEntries(locals.db, { action, before, limit: 50 });
	return {
		action,
		entries: entries.map((e) => ({
			...e.entry,
			actor: e.actor?.displayName ?? null,
			actorUsername: e.actor?.username ?? null
		})),
		older: entries.length === 50 ? entries.at(-1)!.entry.id : null
	};
};
