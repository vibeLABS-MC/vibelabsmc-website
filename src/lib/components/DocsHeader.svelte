<script lang="ts">
	import { Menu, X } from '@lucide/svelte';
	import type { NavGroup } from '#lib/docs/summary.ts';
	import { SITE } from '#lib/site.ts';
	import BrandIcon from './BrandIcon.svelte';
	import SearchButton from './SearchButton.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		nav,
		current,
		menuOpen = $bindable(false)
	}: { nav: NavGroup[]; current: string | undefined; menuOpen?: boolean } = $props();

	const links = $derived([
		{ label: 'Docs', href: '/docs', active: current !== 'reference' && current !== 'standards' },
		...nav
			.filter((g) => g.id === 'reference' || g.id === 'standards')
			.map((g) => ({ label: g.title, href: `/docs/${g.pages[0].slug}`, active: current === g.id }))
	]);
</script>

<header class="bar">
	<button
		type="button"
		class="btn ghost menu"
		onclick={() => (menuOpen = !menuOpen)}
		aria-expanded={menuOpen}
		aria-controls="docs-nav"
		aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
	>
		{#if menuOpen}<X size={20} aria-hidden="true" />{:else}<Menu
				size={20}
				aria-hidden="true"
			/>{/if}
	</button>
	<a class="home" href="/" aria-label="{SITE.name} home"><span class="logo"></span></a>
	<nav class="links" aria-label="Main">
		{#each links as link (link.href)}
			<a href={link.href} class:on={link.active} aria-current={link.active ? 'page' : undefined}
				>{link.label}</a
			>
		{/each}
	</nav>
	<div class="find"><SearchButton /></div>
	<div class="tools">
		<ThemeToggle />
		<a class="btn ghost" href={SITE.repo} aria-label="vibeLABS docs on GitHub"
			><BrandIcon name="github" /></a
		>
		{#if SITE.discord}
			<a class="btn secondary" href={SITE.discord}><BrandIcon name="discord" size={18} />Discord</a>
		{/if}
	</div>
</header>

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: 20;
		height: 68px;
		display: flex;
		align-items: center;
		gap: 28px;
		padding: 0 24px;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--line);
	}
	.home {
		color: var(--fg);
	}
	.home .logo {
		height: 34px;
	}
	.links {
		display: flex;
		gap: 4px;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg-3);
	}
	.links a {
		padding: 6px 10px;
		border-radius: 6px;
	}
	.links a:hover {
		color: var(--fg);
	}
	.links a.on {
		color: var(--fg);
		background: var(--bg-muted);
	}
	.find {
		flex: 1;
		max-width: 420px;
		margin-left: auto;
	}
	.tools {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.menu {
		display: none;
	}
	@media (max-width: 960px) {
		.menu {
			display: inline-flex;
			margin-right: -12px;
		}
		.links {
			display: none;
		}
	}
	@media (max-width: 640px) {
		.bar {
			gap: 12px;
			padding: 0 12px;
		}
		.find {
			max-width: none;
		}
		.home .logo {
			height: 28px;
		}
	}
</style>
