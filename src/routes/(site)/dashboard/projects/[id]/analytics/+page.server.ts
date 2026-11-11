import { downloadHistory, listVersions } from '#lib/server/marketplace/releases.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { project } = await parent();
	const days = url.searchParams.get('days') === '90' ? 90 : 30;
	const [history, versions] = await Promise.all([
		downloadHistory(locals.db, project.id, days),
		listVersions(locals.db, project.id, true)
	]);
	return {
		days,
		history,
		versions: versions
			.map((v) => ({ id: v.id, name: v.name, downloads: v.downloads }))
			.sort((a, b) => b.downloads - a.downloads)
			.slice(0, 10)
	};
};
