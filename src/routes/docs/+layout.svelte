<script lang="ts">
	import type { LayoutProps } from './$types';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import DocsHeader from '#lib/components/DocsHeader.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';

	let { data, children }: LayoutProps = $props();
	let menuOpen = $state(false);

	afterNavigate(() => (menuOpen = false));

	const current = $derived(page.data.page?.slug as string | undefined);
	const section = $derived(page.data.page?.section as string | undefined);
	const headings = $derived(page.data.headings ?? []);
</script>

<DocsHeader nav={data.nav} current={section} bind:menuOpen />
<div class="layout">
	<Sidebar nav={data.nav} {current} {headings} open={menuOpen} />
	{@render children()}
</div>
<Footer nav={data.nav} />

<style>
	.layout {
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr);
		max-width: 1440px;
		margin: 0 auto;
	}
	@media (max-width: 960px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
