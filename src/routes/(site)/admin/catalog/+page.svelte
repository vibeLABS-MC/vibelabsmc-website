<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, RefreshCw } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { GROUP_NAMES } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<Seo title="Catalog" description="Tags and Minecraft versions." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}
{#if form && 'synced' in form}<p class="alert ok" role="status">
		<CircleCheck aria-hidden="true" />{form.synced} new Minecraft versions added.
	</p>{/if}

<section class="card panel">
	<header class="with-action">
		<div>
			<h2>Minecraft versions</h2>
			<p>
				{data.versionCount} releases, synced from Mojang every 6 hours. Newest: {data.versions
					.slice(0, 6)
					.join(', ')}
			</p>
		</div>
		<form method="POST" action="?/sync" use:enhance>
			<button class="btn secondary"><RefreshCw aria-hidden="true" />Sync now</button>
		</form>
	</header>
</section>

<section class="card panel">
	<header>
		<h2>Tags</h2>
		<p>
			The filters on each marketplace section. Hidden tags stay on projects but disappear from
			filters and forms.
		</p>
	</header>
	<div class="row-gap types">
		{#each data.types as t (t.id)}<a
				class="btn {data.type === t.id ? 'secondary active' : 'ghost'} sm"
				href="?type={t.id}">{t.name}</a
			>{/each}
	</div>
	<div class="table-wrap">
		<table class="table">
			<thead><tr><th>Name</th><th>Group</th><th>Slug</th><th>Hidden</th><th></th></tr></thead>
			<tbody>
				{#each data.categories as c (c.slug)}
					<tr>
						<td colspan="5">
							<form method="POST" action="?/category" class="cat" use:enhance={keep}>
								<input type="hidden" name="type" value={data.type} /><input
									type="hidden"
									name="slug"
									value={c.slug}
								/>
								<input class="input" name="name" value={c.name} maxlength="40" aria-label="Name" />
								<select class="select" name="group" value={c.group} aria-label="Group"
									>{#each Object.entries(GROUP_NAMES) as [g, label] (g)}<option value={g}
											>{label}</option
										>{/each}</select
								>
								<span class="mono tiny muted">{c.slug}</span>
								<label class="check"
									><input type="checkbox" name="hidden" checked={c.hidden} />Hidden</label
								>
								<button class="btn secondary sm">Save</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<form method="POST" action="?/category" class="cat new" use:enhance>
		<input type="hidden" name="type" value={data.type} />
		<input
			class="input"
			name="name"
			maxlength="40"
			placeholder="New tag name"
			aria-label="New tag name"
			required
		/>
		<select class="select" name="group" aria-label="Group"
			>{#each Object.entries(GROUP_NAMES) as [g, label] (g)}<option value={g}>{label}</option
				>{/each}</select
		>
		<button class="btn primary sm">Add tag</button>
	</form>
</section>

<style>
	.with-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.types {
		margin-bottom: 12px;
	}
	.cat {
		display: grid;
		grid-template-columns: minmax(140px, 1fr) 150px 160px auto auto;
		gap: 10px;
		align-items: center;
	}
	.cat .input,
	.cat .select {
		padding: 6px 10px;
		font-size: 14px;
	}
	.cat.new {
		grid-template-columns: minmax(140px, 1fr) 150px auto;
		margin-top: 16px;
	}
	.table td {
		padding: 8px 12px;
	}
</style>
