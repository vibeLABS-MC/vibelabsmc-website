<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import { docsUrl } from '#lib/site.ts';
</script>

<svelte:head><title>Page not found · vibeLABS</title></svelte:head>

<main id="main" class="lost">
	<a class="home" href="/" aria-label="vibeLABS home"><Logo height={36} /></a>
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? 'This page does not exist' : 'Something went wrong'}</h1>
	<p class="lede">
		{page.status === 404
			? 'Looking for a guide? The documentation now lives at docs.vibelabsmc.org.'
			: page.error?.message}
	</p>
	<p class="links">
		<a class="btn primary" href={docsUrl()}>Go to the docs</a><a class="btn secondary" href="/"
			>Home</a
		>
	</p>
</main>

<style>
	.lost {
		max-width: 560px;
		margin: 0 auto;
		padding: 15vh 24px 64px;
		text-align: center;
	}
	.home {
		display: inline-flex;
		color: var(--fg);
		border-radius: 6px;
	}
	.code {
		margin-top: 48px;
		font: 600 14px/20px var(--mono);
		color: var(--accent-fg);
	}
	h1 {
		font-size: 36px;
		line-height: 44px;
		letter-spacing: -0.02em;
		font-weight: 600;
		margin: 8px 0 12px;
		text-wrap: balance;
	}
	.lede {
		color: var(--fg-3);
		font-size: 18px;
		line-height: 28px;
	}
	.links {
		display: flex;
		gap: 12px;
		justify-content: center;
		margin-top: 32px;
	}
</style>
