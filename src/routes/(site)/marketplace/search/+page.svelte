<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import Listing from '#lib/components/market/Listing.svelte';

	let { data } = $props();
</script>

<Seo
	title={data.query.q ? `“${data.query.q}” in the marketplace` : 'Search the marketplace'}
	description="Search every shader pack, texture pack, mod and data pack on vibeLABS."
/>

<main id="main" class="container page">
	<header class="page-head">
		<div>
			<h1>Search the marketplace</h1>
			<p>Shader packs, texture packs, mods and data packs together.</p>
		</div>
	</header>
	<Listing
		info={null}
		query={data.query}
		result={data.result}
		categories={data.categories}
		versions={data.versions}
		setup={data.setup}
	/>
</main>
