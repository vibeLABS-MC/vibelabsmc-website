import { error } from '@sveltejs/kit';
import { renderMarkdown } from '#lib/server/marketplace/markdown.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	const { versions } = await parent();
	const version = versions.find((v) => v.id === params.id);
	if (!version) error(404, 'Not found');
	return { version, changelogHtml: renderMarkdown(version.changelog) };
};
