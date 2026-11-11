<script lang="ts">
	import { History } from '@lucide/svelte';
	import { shortDate, timeAgo } from '#lib/format.ts';
	import { projectPath } from '#lib/marketplace/taxonomy.ts';

	let { data } = $props();
	const base = $derived(projectPath(data.project.type, data.project.slug));
</script>

{#if data.entries.length}
	<ol class="timeline">
		{#each data.entries as entry (entry.id)}
			<li>
				<span class="dot {entry.channel}" aria-hidden="true"></span>
				<div class="card panel entry">
					<header>
						<a href="{base}/version/{entry.id}"><h2>{entry.name}</h2></a>
						<span class="badge {entry.channel === 'release' ? 'ok' : 'warn'}">{entry.channel}</span>
						<time
							class="muted small"
							datetime={new Date(entry.publishedAt).toISOString()}
							title={shortDate(entry.publishedAt)}>{timeAgo(entry.publishedAt)}</time
						>
					</header>
					{#if entry.html}<div class="prose">{@html entry.html}</div>{:else}<p class="muted small">
							No changelog for this version.
						</p>{/if}
				</div>
			</li>
		{/each}
	</ol>
{:else}
	<div class="card empty">
		<span class="empty-icon"><History aria-hidden="true" /></span>
		<h3>No releases yet</h3>
	</div>
{/if}

<style>
	.timeline {
		list-style: none;
		padding: 0 0 0 28px;
		position: relative;
		display: grid;
		gap: 16px;
	}
	.timeline::before {
		content: '';
		position: absolute;
		left: 7px;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background: var(--line);
	}
	li {
		position: relative;
	}
	.dot {
		position: absolute;
		left: -28px;
		top: 26px;
		width: 16px;
		height: 16px;
		border-radius: 999px;
		background: var(--ok-fg);
		box-shadow: 0 0 0 4px var(--bg);
	}
	.dot.beta,
	.dot.alpha {
		background: var(--warn-fg);
	}
	.entry header {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	.entry h2 {
		font-size: 17px;
	}
	.entry header a:hover h2 {
		color: var(--accent-fg);
	}
	time {
		margin-left: auto;
	}
	.prose {
		font-size: 15px;
		line-height: 24px;
	}
</style>
