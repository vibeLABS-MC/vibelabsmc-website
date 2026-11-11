/**
 * "My setup": the Minecraft version and loader a player uses, remembered in a cookie so cards can
 * say "works with your setup" and the Download button can pick the right file.
 */

export const SETUP_COOKIE = 'vl_setup';

export interface Setup {
	version: string | null;
	loader: string | null;
}

export function parseSetup(value: string | undefined | null): Setup {
	const [version, loader] = decodeURIComponent(value ?? '').split('|');
	const clean = (v: string | undefined) => (v && /^[\w.+-]{1,24}$/.test(v) ? v : null);
	return { version: clean(version), loader: clean(loader) };
}

export const serialiseSetup = (setup: Setup): string =>
	encodeURIComponent(`${setup.version ?? ''}|${setup.loader ?? ''}`);

export type Fit = 'yes' | 'no' | 'unknown';

/**
 * Does a project (or version) fit the setup? Loaders only count for types that have them, so a
 * texture pack fits any loader.
 */
export function fits(
	setup: Setup,
	item: { gameVersions: string[]; loaders: string[] },
	typeHasLoaders: boolean
): Fit {
	if (!setup.version && !setup.loader) return 'unknown';
	if (setup.version && !item.gameVersions.includes(setup.version)) return 'no';
	if (typeHasLoaders && setup.loader && item.loaders.length && !item.loaders.includes(setup.loader))
		return 'no';
	return 'yes';
}

/** The newest version that fits, preferring releases over betas and alphas. */
export function bestVersion<
	T extends { gameVersions: string[]; loaders: string[]; channel: string }
>(versions: T[], setup: Setup, typeHasLoaders: boolean): T | null {
	const fitting = versions.filter((v) => fits(setup, v, typeHasLoaders) !== 'no');
	return fitting.find((v) => v.channel === 'release') ?? fitting[0] ?? null;
}
