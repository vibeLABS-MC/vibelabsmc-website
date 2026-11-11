<script lang="ts">
	import { page } from '$app/state';
	import { Bell } from '@lucide/svelte';
	import AccountMenu from './AccountMenu.svelte';
	import Hint from './Hint.svelte';
	import Logo from './Logo.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { NAV } from '#lib/nav.ts';
	import { SITE } from '#lib/site.ts';

	const user = $derived(page.data.user);
	const unread = $derived<number>(page.data.unread ?? 0);
	const here = $derived(page.url.pathname + page.url.search);
	const current = (href: string) =>
		href.startsWith('/') &&
		(page.url.pathname === href || page.url.pathname.startsWith(`${href}/`));
</script>

<header class="site-header">
	<div class="container bar">
		<a class="home" href="/" aria-label="{SITE.name} home"><Logo height={30} /></a>
		<nav class="links" aria-label="Main">
			{#each NAV as link (link.href)}<a
					href={link.href}
					aria-current={current(link.href) ? 'page' : undefined}>{link.label}</a
				>{/each}
		</nav>
		<div class="actions">
			<ThemeToggle />
			{#if user}
				<Hint label={unread ? `${unread} unread notifications` : 'Notifications'}>
					{#snippet children(props)}
						<a {...props} class="btn ghost bell" href="/notifications" aria-label="Notifications">
							<Bell aria-hidden="true" />
							{#if unread}<span class="dot">{unread > 9 ? '9+' : unread}</span>{/if}
						</a>
					{/snippet}
				</Hint>
				<AccountMenu {user} />
			{:else}
				<a class="btn secondary wide-only" href="/login?next={encodeURIComponent(here)}">Sign in</a>
				<a class="btn primary wide-only" href="/signup">Create account</a>
			{/if}
			<MobileMenu links={NAV} signedIn={!!user} />
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
	.links a:hover,
	.links a[aria-current='page'] {
		color: var(--fg);
		background: var(--bg-subtle);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}
	.bell {
		position: relative;
	}
	.dot {
		position: absolute;
		top: 2px;
		right: 0;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--indigo-600);
		color: #fff;
		font-size: 11px;
		line-height: 18px;
		font-weight: 700;
		text-align: center;
		box-shadow: 0 0 0 2px var(--bg);
	}
	.actions :global(.account-trigger) {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		border-radius: 999px;
		cursor: pointer;
	}
	.actions :global(.menu-button) {
		display: none;
	}
	@media (max-width: 960px) {
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
