<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { shortDate, timeAgo } from '#lib/format.ts';

	let { data } = $props();
	const filters = ['', 'moderation', 'admin', 'auth', 'project', 'version', 'upload', 'account'];
</script>

<Seo title="Audit log" description="Every staff action and security event." />

<div class="row-gap">
	{#each filters as f (f)}<a
			class="btn {data.action === f ? 'secondary active' : 'ghost'} sm"
			href={f ? `?action=${f}` : '?'}>{f || 'Everything'}</a
		>{/each}
</div>
<p class="muted small">
	Append-only: nothing in the app can change or delete these entries. IP addresses are stored only
	as keyed hashes.
</p>

<div class="card table-wrap">
	<table class="table">
		<thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
		<tbody>
			{#each data.entries as e (e.id)}
				<tr>
					<td title={shortDate(e.createdAt)}>{timeAgo(e.createdAt)}</td>
					<td
						>{#if e.actorUsername}<a class="link" href="/user/{e.actorUsername}">{e.actor}</a
							>{:else}{e.actor ?? 'system'}{/if}</td
					>
					<td><span class="mono tiny">{e.action}</span></td>
					<td class="tiny"
						>{e.targetType ?? ''} <span class="mono muted">{e.targetId ?? ''}</span></td
					>
					<td class="tiny muted details"
						>{Object.keys(e.details).length ? JSON.stringify(e.details) : ''}</td
					>
				</tr>
			{:else}
				<tr><td colspan="5" class="muted">Nothing logged.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
{#if data.older}<p>
		<a
			class="btn secondary"
			href="?{data.action ? `action=${data.action}&` : ''}before={data.older}">Older</a
		>
	</p>{/if}

<style>
	.details {
		max-width: 320px;
		overflow-wrap: anywhere;
	}
</style>
