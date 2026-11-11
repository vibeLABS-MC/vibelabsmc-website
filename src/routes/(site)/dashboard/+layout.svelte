<script lang="ts">
	import { page } from '$app/state';
	import { Bell, Bookmark, LayoutDashboard, Plus } from '@lucide/svelte';

	let { children } = $props();
	const links = [
		{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
		{ href: '/dashboard/collections', label: 'Collections', icon: Bookmark },
		{ href: '/notifications', label: 'Notifications', icon: Bell }
	];
	const inProject = $derived(
		page.url.pathname.startsWith('/dashboard/projects/') &&
			page.url.pathname !== '/dashboard/projects/new'
	);
</script>

<main id="main" class="container page">
	{#if inProject}
		{@render children()}
	{:else}
		<div class="side-layout">
			<nav class="side-nav" aria-label="Dashboard">
				{#each links as link (link.href)}
					<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}
						><link.icon aria-hidden="true" />{link.label}</a
					>
				{/each}
				<a
					href="/dashboard/projects/new"
					aria-current={page.url.pathname === '/dashboard/projects/new' ? 'page' : undefined}
					><Plus aria-hidden="true" />New project</a
				>
			</nav>
			<div>{@render children()}</div>
		</div>
	{/if}
</main>
