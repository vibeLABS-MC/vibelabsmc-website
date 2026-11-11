import { listingData } from '#lib/server/marketplace/listing.ts';
import type { PageServerLoad } from './$types';

/** Search across every project type at once (the marketplace home search box lands here). */
export const load: PageServerLoad = async ({ url, locals, cookies }) =>
	listingData(locals, url, cookies, null);
