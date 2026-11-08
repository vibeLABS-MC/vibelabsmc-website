<script lang="ts">
	import { page } from '$app/state';
	import { SITE } from '#lib/site.ts';

	let { title, description }: { title?: string; description: string } = $props();
	const fullTitle = $derived(
		title ? `${title} · ${SITE.title}` : `${SITE.title}: Minecraft shader documentation`
	);
	const url = $derived(new URL(page.url.pathname, SITE.url).href);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content={title ? 'article' : 'website'} />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:title" content={title ?? SITE.title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content="{SITE.url}/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
