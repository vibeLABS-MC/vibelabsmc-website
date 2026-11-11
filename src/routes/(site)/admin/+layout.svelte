<script lang="ts">
	import { page } from '$app/state';
	import {
		Flag,
		FolderKanban,
		Gauge,
		Inbox,
		ScrollText,
		ShieldQuestion,
		Tags,
		Users
	} from '@lucide/svelte';

	let { data, children } = $props();
	const links = $derived([
		{ href: '/admin', label: 'Overview', icon: Gauge },
		{ href: '/admin/queue', label: 'Review queue', icon: Inbox, count: data.counts.queue },
		{
			href: '/admin/files',
			label: 'Flagged files',
			icon: ShieldQuestion,
			count: data.counts.flagged
		},
		{ href: '/admin/reports', label: 'Reports', icon: Flag, count: data.counts.openReports },
		{ href: '/admin/projects', label: 'Projects', icon: FolderKanban },
		{ href: '/admin/users', label: 'Users', icon: Users },
		...(data.isAdmin ? [{ href: '/admin/catalog', label: 'Catalog', icon: Tags }] : []),
		{ href: '/admin/audit', label: 'Audit log', icon: ScrollText }
	]);
</script>

<main id="main" class="container page">
	<header class="page-head">
		<div>
			<p class="eyebrow">Staff</p>
			<h1>Moderation</h1>
		</div>
	</header>
	<div class="side-layout">
		<nav class="side-nav" aria-label="Moderation">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}
					><link.icon aria-hidden="true" />{link.label}{#if link.count}<span
							class="badge accent count">{link.count}</span
						>{/if}</a
				>
			{/each}
		</nav>
		<div class="stack">{@render children()}</div>
	</div>
</main>
