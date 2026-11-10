/** Site-wide facts. Change a link here and every page follows. */
export const SITE = {
	name: 'vibeLABS',
	title: 'vibeLABS',
	tagline: 'A community for people who play with Minecraft shaders and people who write them.',
	url: 'https://vibelabsmc.org',
	/** The documentation lives in its own repo and on its own subdomain. */
	docs: 'https://docs.vibelabsmc.org',
	repo: 'https://github.com/vibeLABS-MC/vibelabsmc-website',
	docsRepo: 'https://github.com/vibeLABS-MC/vibelabsmc-docs',
	/** Public Discord invite. Discord links stay hidden until this is set. */
	discord: null as string | null
};

/**
 * A link to a page on the docs site, such as docsUrl('/using/install-iris/').
 * Paths are absolute and pages end in "/", the URLs the docs site serves.
 */
export function docsUrl(path = '/'): string {
	if (!path.startsWith('/')) throw new Error(`Docs paths start with "/": got "${path}"`);
	const page = path.split('#')[0];
	if (!page.endsWith('/')) throw new Error(`Docs page paths end with "/": got "${path}"`);
	return SITE.docs + path;
}
