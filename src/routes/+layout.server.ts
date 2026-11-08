import { navGroups } from '#lib/docs/summary.ts';
import { catalog } from '#lib/server/content.ts';

export const load = () => ({ nav: navGroups(catalog.nav) });
