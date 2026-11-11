import { loadProjectPage } from '#lib/server/marketplace/page.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params, cookies }) =>
	loadProjectPage(locals, params, cookies);
