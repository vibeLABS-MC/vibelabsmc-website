<script lang="ts">
	import { CircleAlert, Search } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import DecisionForm from '#lib/components/admin/DecisionForm.svelte';
	import ProjectIcon from '#lib/components/market/ProjectIcon.svelte';
	import StatusBadge from '#lib/components/market/StatusBadge.svelte';
	import { compact, timeAgo } from '#lib/format.ts';
	import { projectPath, typeInfo } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	const LABEL: Record<string, string> = {
		approved: 'Public',
		in_review: 'In review',
		draft: 'Drafts',
		rejected: 'Rejected',
		withheld: 'Withheld'
	};
</script>

<Seo title="Projects" description="Every project, by status." />

<div class="bar">
	<div class="row-gap">
		{#each data.statuses as s (s)}<a
				class="btn {data.status === s ? 'secondary active' : 'ghost'} sm"
				href="?status={s}">{LABEL[s]}</a
			>{/each}
	</div>
	<form method="GET" class="search">
		<input type="hidden" name="status" value={data.status} /><Search aria-hidden="true" /><input
			class="input"
			name="q"
			value={data.q}
			placeholder="Search by name"
			aria-label="Search projects"
		/>
	</form>
</div>
{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

<div class="card table-wrap">
	<table class="table">
		<thead
			><tr><th>Project</th><th>Status</th><th>Downloads</th><th>Updated</th><th>Action</th></tr
			></thead
		>
		<tbody>
			{#each data.projects as p (p.id)}
				<tr>
					<td
						><a class="who" href={projectPath(p.type, p.slug)}
							><ProjectIcon name={p.name} iconKey={p.iconKey} size={32} /><span
								><strong>{p.name}</strong><span class="tiny muted">{typeInfo(p.type).singular}</span
								></span
							></a
						></td
					>
					<td
						><StatusBadge status={p.status} />{#if p.moderationMessage}<br /><span
								class="tiny muted">{p.moderationMessage}</span
							>{/if}</td
					>
					<td>{compact(p.downloads)}</td>
					<td>{timeAgo(p.updatedAt)}</td>
					<td class="act"><DecisionForm projectId={p.id} decisions={p.decisions} /></td>
				</tr>
			{:else}
				<tr><td colspan="5" class="muted">No projects here.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.search {
		position: relative;
	}
	.search :global(svg) {
		position: absolute;
		left: 10px;
		top: 50%;
		translate: 0 -50%;
		width: 16px;
		height: 16px;
		color: var(--fg-4);
	}
	.search .input {
		padding: 6px 10px 6px 32px;
		font-size: 14px;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.who > span {
		display: grid;
	}
	.act {
		min-width: 280px;
	}
</style>
