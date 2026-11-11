<script lang="ts">
	import { CircleAlert, CircleCheck, ExternalLink, Inbox } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import DecisionForm from '#lib/components/admin/DecisionForm.svelte';
	import ProjectIcon from '#lib/components/market/ProjectIcon.svelte';
	import { timeAgo } from '#lib/format.ts';
	import { licenseInfo, projectPath, typeInfo } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
</script>

<Seo title="Review queue" description="Projects waiting for a moderator." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}
{#if form && 'decided' in form}<p class="alert ok" role="status">
		<CircleCheck aria-hidden="true" />Done: {form.decided}. The team has been notified.
	</p>{/if}

{#if data.queue.length}
	{#each data.queue as p (p.id)}
		<article class="card panel item">
			<header>
				<ProjectIcon name={p.name} iconKey={p.iconKey} size={56} />
				<div>
					<h2>{p.name} <span class="badge">{typeInfo(p.type).singular}</span></h2>
					<p class="muted small">
						by {p.owner?.displayName ?? 'unknown'} · submitted {p.submittedAt
							? timeAgo(p.submittedAt)
							: '—'} · {licenseInfo(p.license)?.name ?? 'no licence'}
					</p>
				</div>
				<a
					class="btn secondary sm"
					href={projectPath(p.type, p.slug)}
					target="_blank"
					rel="noopener">Open page<ExternalLink aria-hidden="true" /></a
				>
			</header>
			<p class="summary"><strong>{p.summary}</strong></p>
			<p class="desc">{p.description}</p>
			<p class="row-gap tiny">
				{#each p.files as f, i (i)}<span class="badge {f.scan === 'clean' ? 'ok' : 'warn'}"
						>{f.name} · {f.scan}</span
					>{/each}
			</p>
			<DecisionForm projectId={p.id} decisions={['approve', 'changes', 'reject']} />
		</article>
	{/each}
{:else}
	<div class="card empty">
		<span class="empty-icon"><Inbox aria-hidden="true" /></span>
		<h3>The queue is empty</h3>
		<p>New submissions appear here, oldest first.</p>
	</div>
{/if}

<style>
	.item {
		display: grid;
		gap: 12px;
	}
	.item header {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.item header > div {
		flex: 1;
	}
	.item h2 {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.item header .btn :global(svg) {
		width: 14px;
		height: 14px;
	}
	.desc {
		color: var(--fg-3);
		font-size: 14px;
	}
</style>
