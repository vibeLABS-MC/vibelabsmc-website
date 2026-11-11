/** Everything a marketplace listing page needs, loaded together. */
import { listCategories, listGameVersions } from './catalog.ts';
import { searchProjects } from './search.ts';
import { parseQuery } from '../../marketplace/search.ts';
import { parseSetup, SETUP_COOKIE } from '../../marketplace/setup.ts';
import type { ProjectType } from '../../marketplace/taxonomy.ts';
import type { Cookies } from '@sveltejs/kit';

export async function listingData(
	locals: App.Locals,
	url: URL,
	cookies: Cookies,
	type: ProjectType | null
) {
	const query = parseQuery(url.searchParams);
	const [result, categories, versions] = await Promise.all([
		searchProjects(locals.db, type, query),
		type ? listCategories(locals.db, type) : Promise.resolve([]),
		listGameVersions(locals.db)
	]);
	return {
		query,
		result,
		categories: categories.map((c) => ({
			slug: c.slug,
			name: c.name,
			group: c.group as 'categories' | 'features' | 'resolution' | 'performance'
		})),
		versions: versions.map((v) => v.version),
		setup: parseSetup(cookies.get(SETUP_COOKIE))
	};
}
