<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { ArrowUpRight, Menu, X } from '@lucide/svelte';
	import Logo from './Logo.svelte';
	import type { NavLink } from '#lib/nav.ts';
	import { docsUrl } from '#lib/site.ts';

	let { links }: { links: NavLink[] } = $props();
	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class="btn ghost menu-button" aria-label="Open menu">
		<Menu aria-hidden="true" />
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay class="sheet-overlay" />
		<Dialog.Content class="sheet">
			<div class="sheet-head">
				<Logo height={26} />
				<Dialog.Close class="btn ghost" aria-label="Close menu"
					><X aria-hidden="true" /></Dialog.Close
				>
			</div>
			<Dialog.Title class="sr-only">Menu</Dialog.Title>
			<nav aria-label="Main">
				{#each links as link (link.href)}
					<a href={link.href} onclick={() => (open = false)}>
						<span>{link.label}</span><span class="sheet-note">{link.note}</span>
					</a>
				{/each}
			</nav>
			<a class="btn primary sheet-cta" href={docsUrl()}
				>Read the docs<ArrowUpRight aria-hidden="true" /></a
			>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
