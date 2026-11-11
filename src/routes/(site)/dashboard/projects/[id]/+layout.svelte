<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { ArrowLeft, CircleAlert, CircleCheck, ExternalLink, Send, Undo2 } from '@lucide/svelte';
	import ProjectIcon from '#lib/components/market/ProjectIcon.svelte';
	import StatusBadge from '#lib/components/market/StatusBadge.svelte';
	import { projectPath, typeInfo } from '#lib/marketplace/taxonomy.ts';

	let { data, children } = $props();
	const base = $derived(`/dashboard/projects/${data.project.id}`);
	const tabs = $derived([
		{ href: base, label: 'Details' },
		{ href: `${base}/description`, label: 'Description' },
		{ href: `${base}/gallery`, label: 'Gallery' },
		{ href: `${base}/versions`, label: 'Versions' },
		{ href: `${base}/team`, label: 'Team' },
		{ href: `${base}/analytics`, label: 'Analytics' },
		...(data.role === 'owner' ? [{ href: `${base}/settings`, label: 'Settings' }] : [])
	]);
	const active = (href: string) =>
		href === base
			? page.url.pathname === base
			: page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	const reviewForm = $derived(page.form && 'submitted' in page.form ? page.form : null);
</script>

<a class="back link small" href="/dashboard"><ArrowLeft aria-hidden="true" />Dashboard</a>

<header class="ehead">
	<ProjectIcon name={data.project.name} iconKey={data.project.iconKey} size={72} />
	<div class="etitle">
		<p class="eyebrow">{typeInfo(data.project.type).singular}</p>
		<h1>{data.project.name} <StatusBadge status={data.project.status} /></h1>
		<a class="link small" href={projectPath(data.project.type, data.project.slug)}
			>View public page<ExternalLink aria-hidden="true" /></a
		>
	</div>
	<div class="eactions">
		{#if data.project.status === 'draft' || data.project.status === 'rejected'}
			<form method="POST" action="{base}?/submit" use:enhance>
				<button class="btn primary" disabled={data.missing.length > 0}
					><Send aria-hidden="true" />Submit for review</button
				>
			</form>
		{:else if data.project.status === 'in_review'}
			<form method="POST" action="{base}?/withdraw" use:enhance>
				<button class="btn secondary"><Undo2 aria-hidden="true" />Withdraw to edit</button>
			</form>
		{/if}
	</div>
</header>

{#if page.url.searchParams.get('created')}
	<p class="alert ok spaced">
		<CircleCheck aria-hidden="true" />Project created. Add an icon, a description, screenshots and a
		first version, then submit it for review.
	</p>
{/if}
{#if data.project.moderationMessage && data.project.status !== 'approved'}
	<p class="alert {data.project.status === 'in_review' ? '' : 'error'} spaced">
		<CircleAlert aria-hidden="true" /><span
			><strong>From the moderators:</strong> {data.project.moderationMessage}</span
		>
	</p>
{/if}
{#if data.project.status === 'in_review'}
	<p class="alert spaced">
		<CircleAlert aria-hidden="true" />A moderator is reviewing this project. Withdraw it to make
		changes.
	</p>
{:else if data.missing.length}
	<p class="alert warn spaced">
		<CircleAlert aria-hidden="true" /><span
			>Before you can submit, add {data.missing.join(', ')}.</span
		>
	</p>
{/if}
{#if reviewForm}<p class="alert ok spaced">
		<CircleCheck aria-hidden="true" />Submitted. You’ll get a notification when a moderator decides.
	</p>{/if}

<nav class="tabs" aria-label="Edit project">
	{#each tabs as tab (tab.href)}<a
			href={tab.href}
			aria-current={active(tab.href) ? 'page' : undefined}>{tab.label}</a
		>{/each}
</nav>

<div class="ebody">{@render children()}</div>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 16px;
	}
	.back :global(svg) {
		width: 16px;
		height: 16px;
	}
	.ehead {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}
	.etitle {
		flex: 1;
		min-width: 0;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 28px;
		line-height: 36px;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 2px 0;
	}
	.etitle .link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.etitle .link :global(svg) {
		width: 14px;
		height: 14px;
	}
	.spaced {
		margin-bottom: 16px;
	}
	.ebody {
		margin-top: 24px;
		display: grid;
		gap: 24px;
	}
</style>
