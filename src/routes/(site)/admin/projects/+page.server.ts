import { desc, eq, ilike, and } from 'drizzle-orm';
import { requireStaff } from '#lib/server/auth/guards.ts';
import { moderate } from '#lib/server/admin/actions.ts';
import { allowedDecisions } from '#lib/server/admin/moderation.ts';
import { projects } from '#lib/server/db/schema.ts';
import type { Actions, PageServerLoad } from './$types';

const STATUSES = ['approved', 'in_review', 'draft', 'rejected', 'withheld'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireStaff(locals);
	const status = STATUSES.find((s) => s === url.searchParams.get('status')) ?? 'approved';
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 64);
	const rows = await locals.db
		.select({
			id: projects.id,
			name: projects.name,
			slug: projects.slug,
			type: projects.type,
			iconKey: projects.iconKey,
			status: projects.status,
			downloads: projects.downloads,
			updatedAt: projects.updatedAt,
			moderationMessage: projects.moderationMessage
		})
		.from(projects)
		.where(
			and(
				eq(projects.status, status),
				q ? ilike(projects.name, `%${q.replace(/[%_\\]/g, '\\$&')}%`) : undefined
			)
		)
		.orderBy(desc(projects.updatedAt))
		.limit(100);
	return {
		status,
		q,
		statuses: STATUSES,
		projects: rows.map((r) => ({ ...r, decisions: allowedDecisions(r.status) }))
	};
};

export const actions: Actions = {
	moderate: async ({ request, locals }) => moderate(locals, await request.formData())
};
