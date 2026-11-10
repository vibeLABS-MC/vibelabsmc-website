<script lang="ts">
	import BrandIcon from './BrandIcon.svelte';
	import Hint from './Hint.svelte';
	import Logo from './Logo.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { NAV } from '#lib/nav.ts';
	import { docsUrl, SITE } from '#lib/site.ts';
</script>

<header class="site-header">
	<div class="container bar">
		<a class="home" href="/" aria-label="{SITE.name} home"><Logo height={30} /></a>
		<nav class="links" aria-label="Main">
			{#each NAV as link (link.href)}<a href={link.href}>{link.label}</a>{/each}
		</nav>
		<div class="actions">
			<Hint label="Docs source on GitHub">
				{#snippet children(props)}
					<a {...props} class="btn ghost" href={SITE.docsRepo} aria-label="vibeLABS docs on GitHub">
						<BrandIcon name="github" />
					</a>
				{/snippet}
			</Hint>
			<ThemeToggle />
			<a class="btn primary wide-only" href={docsUrl()}>Read the docs</a>
			<MobileMenu links={NAV} />
		</div>
	</div>
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: saturate(1.4) blur(12px);
		border-bottom: 1px solid var(--line);
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 32px;
		height: 72px;
	}
	.home {
		color: var(--fg);
		display: flex;
		border-radius: 6px;
	}
	.links {
		display: flex;
		gap: 4px;
	}
	.links a {
		padding: 8px 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 15px;
		color: var(--fg-3);
		transition:
			color 0.15s,
			background 0.15s;
	}
	.links a:hover {
		color: var(--fg);
		background: var(--bg-subtle);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
	}
	.wide-only {
		margin-left: 8px;
	}
	.actions :global(.menu-button) {
		display: none;
	}
	@media (max-width: 860px) {
		.links,
		.wide-only {
			display: none;
		}
		.actions :global(.menu-button) {
			display: inline-flex;
		}
		.bar {
			height: 64px;
		}
	}
</style>
