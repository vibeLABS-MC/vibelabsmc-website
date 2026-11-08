/** Site-wide facts. Change a link here and every page follows. */
export const SITE = {
	name: 'vibeLABS',
	title: 'vibeLABS docs',
	tagline: 'Community documentation for Minecraft shader players and developers.',
	url: 'https://vibelabsmc.org',
	repo: 'https://github.com/vibeLABS-MC/vibelabsmc-website',
	/** Public Discord invite. Discord buttons stay hidden until this is set. */
	discord: null as string | null
};

export const editUrl = (source: string) => `${SITE.repo}/edit/main/${source}`;
