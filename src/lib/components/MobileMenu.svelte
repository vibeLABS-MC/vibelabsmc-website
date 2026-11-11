<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Menu, X } from '@lucide/svelte';
	import Logo from './Logo.svelte';
	import type { NavLink } from '#lib/nav.ts';

	let { links, signedIn }: { links: NavLink[]; signedIn: boolean } = $props();
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
			{#if signedIn}
				<a class="btn secondary sheet-cta" href="/dashboard" onclick={() => (open = false)}
					>Dashboard</a
				>
			{:else}
				<div class="sheet-cta sheet-pair">
					<a class="btn secondary" href="/login" onclick={() => (open = false)}>Sign in</a>
					<a class="btn primary" href="/signup" onclick={() => (open = false)}>Create account</a>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
