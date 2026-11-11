import { error } from '@sveltejs/kit';
import { listingData } from '#lib/server/marketplace/listing.ts';
import { typeFromPath } from '#lib/marketplace/taxonomy.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals, cookies }) => {
	const info = typeFromPath(params.type);
	if (!info) error(404, 'Not found');
	return { info, ...(await listingData(locals, url, cookies, info.id)) };
};
