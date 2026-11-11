<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();
	const links = [
		{ href: '/legal/terms', label: 'Terms of use' },
		{ href: '/legal/content-rules', label: 'Content rules' },
		{ href: '/legal/privacy', label: 'Privacy' }
	];
</script>

<main id="main" class="container page">
	<div class="side-layout">
		<nav class="side-nav" aria-label="Legal">
			{#each links as link (link.href)}<a
					href={link.href}
					aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a
				>{/each}
		</nav>
		<article class="prose card panel legal">{@render children()}</article>
	</div>
</main>

<style>
	.legal {
		padding: 40px 48px;
		max-width: 820px;
	}
	@media (max-width: 640px) {
		.legal {
			padding: 24px 20px;
		}
	}
</style>
