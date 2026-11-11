<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import Listing from '#lib/components/market/Listing.svelte';

	let { data } = $props();
</script>

<Seo
	title={data.info.name}
	description="{data.info
		.blurb} Free downloads on the vibeLABS marketplace, checked and virus-scanned."
/>

<main id="main" class="container page">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href="/marketplace">Marketplace</a><ChevronRight aria-hidden="true" /><span
			>{data.info.name}</span
		>
	</nav>
	<header class="page-head">
		<div>
			<h1>{data.info.name}</h1>
			<p>{data.info.blurb}</p>
		</div>
		<a class="btn primary" href="/dashboard/projects/new?type={data.info.id}"
			>Publish a {data.info.singular.toLowerCase()}</a
		>
	</header>
	<Listing
		info={data.info}
		query={data.query}
		result={data.result}
		categories={data.categories}
		versions={data.versions}
		setup={data.setup}
	/>
</main>

<style>
	.crumbs {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		color: var(--fg-4);
		margin-bottom: 12px;
	}
	.crumbs a {
		color: var(--fg-3);
		font-weight: 500;
	}
	.crumbs a:hover {
		color: var(--fg);
	}
	.crumbs :global(svg) {
		width: 16px;
		height: 16px;
	}
</style>
