import { renderMarkdown } from '#lib/server/marketplace/markdown.ts';
import type { PageServerLoad } from './$types';

/** Every listed version's changelog, newest first, rendered safely. */
export const load: PageServerLoad = async ({ parent }) => {
	const { versions } = await parent();
	return {
		entries: versions
			.filter((v) => v.status === 'listed')
			.map((v) => ({
				id: v.id,
				name: v.name,
				versionNumber: v.versionNumber,
				channel: v.channel,
				publishedAt: v.publishedAt,
				html: v.changelog.trim() ? renderMarkdown(v.changelog) : ''
			}))
	};
};
