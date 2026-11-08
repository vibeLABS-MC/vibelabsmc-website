<script lang="ts">
	import { page } from '$app/state';
	import SearchButton from '#lib/components/SearchButton.svelte';
</script>

<svelte:head><title>Page not found · vibeLABS docs</title></svelte:head>

<main id="main" class="lost">
	<a class="home" href="/" aria-label="vibeLABS home"><span class="logo"></span></a>
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? 'This page is not in the docs' : 'Something went wrong'}</h1>
	<p class="lede">
		{page.status === 404
			? 'The link may be old, or the page may have moved. Search for it, or start from the docs home.'
			: page.error?.message}
	</p>
	<div class="search"><SearchButton label="Search the docs…" /></div>
	<p class="links">
		<a class="btn primary" href="/docs">Browse all docs</a><a class="btn secondary" href="/">Home</a
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
		display: inline-block;
		color: var(--fg);
	}
	.code {
		margin-top: 48px;
		font: 600 14px/20px var(--mono);
		color: var(--accent-fg);
	}
	h1 {
		font-size: 36px;
		line-height: 44px;
		letter-spacing: -0.7px;
		font-weight: 600;
		margin: 8px 0 12px;
		text-wrap: balance;
	}
	.lede {
		color: var(--fg-3);
		font-size: 18px;
		line-height: 28px;
	}
	.search {
		margin: 32px auto 0;
		max-width: 420px;
	}
	.links {
		display: flex;
		gap: 12px;
		justify-content: center;
		margin-top: 20px;
	}
</style>
