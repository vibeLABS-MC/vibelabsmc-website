<script lang="ts">
	import { enhance } from '$app/forms';
	import { BellOff, CheckCheck } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { timeAgo } from '#lib/format.ts';
	import { describeNotification } from '#lib/notifications.ts';

	let { data } = $props();
	const unread = $derived(data.items.some((n) => !n.readAt));
</script>

<Seo title="Notifications" description="Your vibeLABS notifications." />

<main id="main" class="container page narrow">
	<header class="page-head">
		<div>
			<h1>Notifications</h1>
			<p>New versions, moderation decisions, replies and invitations.</p>
		</div>
		{#if unread}<form method="POST" action="?/readAll" use:enhance>
				<button class="btn secondary"><CheckCheck aria-hidden="true" />Mark all as read</button>
			</form>{/if}
	</header>

	{#if data.items.length}
		<ul class="card list">
			{#each data.items as n (n.id)}
				{@const view = describeNotification(n.kind, n.data)}
				<li class={n.readAt ? '' : 'unread'}>
					<span class="dot {view.tone}" aria-hidden="true"></span>
					<div class="text">
						{#if view.href}<a href={view.href}>{view.text}</a>{:else}<span>{view.text}</span>{/if}
						{#if view.detail}<p class="detail">“{view.detail}”</p>{/if}
						<span class="muted tiny">{timeAgo(n.createdAt)}</span>
					</div>
				</li>
			{/each}
		</ul>
		{#if data.more}<p class="more">
				<a class="btn secondary" href="?before={data.more}">Older</a>
			</p>{/if}
	{:else}
		<div class="card empty">
			<span class="empty-icon"><BellOff aria-hidden="true" /></span>
			<h3>Nothing here yet</h3>
			<p>Follow projects to hear about their new versions.</p>
		</div>
	{/if}
</main>

<style>
	.narrow {
		max-width: 760px;
	}
	.list {
		list-style: none;
		padding: 0;
	}
	li {
		display: flex;
		gap: 14px;
		padding: 16px 20px;
		border-top: 1px solid var(--line);
	}
	li:first-child {
		border-top: 0;
	}
	li.unread {
		background: var(--accent-bg);
	}
	.dot {
		flex: none;
		width: 10px;
		height: 10px;
		margin-top: 7px;
		border-radius: 999px;
		background: var(--indigo-500);
	}
	.dot.ok {
		background: var(--ok-fg);
	}
	.dot.warn {
		background: var(--warn-fg);
	}
	.dot.error {
		background: var(--err-fg);
	}
	.text {
		display: grid;
		gap: 2px;
	}
	.text a {
		font-weight: 600;
	}
	.text a:hover {
		color: var(--accent-fg);
	}
	.unread .text a,
	.unread .text > span:first-child {
		font-weight: 700;
	}
	.detail {
		color: var(--fg-3);
		font-size: 14px;
	}
	.more {
		margin-top: 16px;
		text-align: center;
	}
</style>
