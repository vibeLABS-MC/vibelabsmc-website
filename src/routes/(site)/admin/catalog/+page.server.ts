import { fail } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { requireAdmin } from '#lib/server/auth/guards.ts';
import { field } from '#lib/server/http.ts';
import {
	listCategories,
	listGameVersions,
	syncGameVersions,
	upsertCategory
} from '#lib/server/marketplace/catalog.ts';
import {
	isProjectType,
	PROJECT_TYPES,
	slugify,
	type CategoryGroup
} from '#lib/marketplace/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

const GROUPS: CategoryGroup[] = ['categories', 'features', 'resolution', 'performance'];

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals);
	const type = url.searchParams.get('type');
	const chosen = type && isProjectType(type) ? type : 'shader';
	const [categories, versions] = await Promise.all([
		listCategories(locals.db, chosen, true),
		listGameVersions(locals.db)
	]);
	return {
		type: chosen,
		types: PROJECT_TYPES.map((t) => ({ id: t.id, name: t.name })),
		categories,
		versions: versions.slice(0, 12).map((v) => v.version),
		versionCount: versions.length
	};
};

export const actions: Actions = {
	category: async ({ request, locals }) => {
		const { user } = requireAdmin(locals);
		const data = await request.formData();
		const projectType = field(data, 'type');
		const name = field(data, 'name').slice(0, 40);
		const group = field(data, 'group') as CategoryGroup;
		const slug = field(data, 'slug') || slugify(name);
		if (
			!isProjectType(projectType) ||
			!name ||
			!GROUPS.includes(group) ||
			!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
		)
			return fail(400, { message: 'Give the tag a name and a group.' });
		await upsertCategory(locals.db, {
			projectType,
			slug,
			group,
			name,
			hidden: data.get('hidden') === 'on'
		});
		await audit(locals.db, {
			actorId: user.id,
			action: 'admin.category_saved',
			targetType: 'category',
			targetId: `${projectType}:${slug}`,
			details: { name, group },
			ipHash: locals.ipHash
		});
		return { saved: true };
	},
	sync: async ({ locals }) => {
		const { user } = requireAdmin(locals);
		try {
			const added = await syncGameVersions(
				locals.db,
				fetch,
				locals.config.endpoints.mojangManifest
			);
			await audit(locals.db, {
				actorId: user.id,
				action: 'admin.versions_synced',
				details: { added },
				ipHash: locals.ipHash
			});
			return { synced: added };
		} catch (cause) {
			return fail(502, { message: (cause as Error).message });
		}
	}
};
