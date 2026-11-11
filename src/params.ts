import { defineParams } from '@sveltejs/kit/params';

/**
 * URL parameter matchers. These also run in the browser, so they can't import server code:
 * keep `provider` in step with PROVIDERS in src/lib/server/auth/oauth.ts.
 */
const TYPE_PATHS = ['shaders', 'texture-packs', 'mods', 'data-packs'] as const;

export const params = defineParams({
	provider: (param) => (param === 'github' || param === 'discord' ? param : undefined),
	/** Marketplace sections; keep in step with PROJECT_TYPES in src/lib/marketplace/taxonomy.ts. */
	type: (param) => ((TYPE_PATHS as readonly string[]).includes(param) ? param : undefined)
});
