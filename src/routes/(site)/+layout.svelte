<script lang="ts">
	import Footer from '#lib/components/Footer.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';

	let { children } = $props();
</script>

<SiteHeader />
{@render children()}
<Footer />
