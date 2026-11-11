<script lang="ts">
	import { Flag, Inbox, ShieldQuestion } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';

	let { data } = $props();
	const c = $derived(data.counts);
	const todo = $derived([
		{ href: '/admin/queue', icon: Inbox, n: c.queue, label: 'projects waiting for review' },
		{
			href: '/admin/files',
			icon: ShieldQuestion,
			n: c.flagged,
			label: 'files the scanner couldn’t clear'
		},
		{ href: '/admin/reports', icon: Flag, n: c.openReports, label: 'open reports' }
	]);
</script>

<Seo title="Moderation" description="Staff overview." />

<section class="todo">
	{#each todo as t (t.href)}
		<a class="card t {t.n ? 'hot' : ''}" href={t.href}
			><t.icon aria-hidden="true" /><strong>{t.n}</strong><span>{t.label}</span></a
		>
	{/each}
</section>

<section class="card panel">
	<h2>The site</h2>
	<dl class="nums">
		<div>
			<dt>Users</dt>
			<dd>{c.totalUsers.toLocaleString('en-GB')}</dd>
		</div>
		<div>
			<dt>Projects</dt>
			<dd>{c.totalProjects.toLocaleString('en-GB')}</dd>
		</div>
		<div>
			<dt>Public projects</dt>
			<dd>{c.approved.toLocaleString('en-GB')}</dd>
		</div>
		<div>
			<dt>Active in the last day</dt>
			<dd>{c.liveSessions.toLocaleString('en-GB')}</dd>
		</div>
	</dl>
</section>

<style>
	.todo {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	.t {
		display: grid;
		gap: 4px;
		padding: 20px;
		color: var(--fg-3);
	}
	.t :global(svg) {
		width: 22px;
		height: 22px;
		color: var(--fg-4);
	}
	.t strong {
		font-size: 34px;
		line-height: 42px;
		font-weight: 600;
		color: var(--fg);
	}
	.t.hot strong,
	.t.hot :global(svg) {
		color: var(--accent-fg);
	}
	.nums {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
		margin: 16px 0 0;
	}
	.nums dt {
		color: var(--fg-4);
		font-size: 14px;
	}
	.nums dd {
		margin: 0;
		font-size: 24px;
		font-weight: 600;
	}
	@media (max-width: 720px) {
		.todo,
		.nums {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
