<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, Upload } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ProjectIcon from '#lib/components/market/ProjectIcon.svelte';
	import {
		GROUP_NAMES,
		LICENSES,
		typeInfo,
		type CategoryGroup
	} from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	const p = $derived(data.project);
	const locked = $derived(p.status === 'in_review');
	let license = $state('');
	$effect(() => {
		license = p.license;
	});
	let preview = $state<string | null>(null);
	const groups = $derived(
		(['categories', 'features', 'resolution', 'performance'] as CategoryGroup[])
			.map((g) => ({ g, items: data.categories.filter((c) => c.group === g) }))
			.filter((x) => x.items.length)
	);
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<Seo title="Edit {p.name}" description="Project details." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}
{#if form && 'saved' in form}<p class="alert ok" role="status">
		<CircleCheck aria-hidden="true" />Saved.
	</p>{/if}

<section class="card panel">
	<header>
		<h2>Icon</h2>
		<p>Square, at least 256×256. Shown on cards, search results and the project page.</p>
	</header>
	<form
		method="POST"
		action="?/icon"
		enctype="multipart/form-data"
		class="icon-row"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				preview = null;
			}}
	>
		{#if preview}<span class="prev"><img src={preview} alt="" /></span>{:else}<ProjectIcon
				name={p.name}
				iconKey={p.iconKey}
				size={96}
			/>{/if}
		<label class="btn secondary"
			><Upload aria-hidden="true" />Choose image<input
				class="sr-only"
				type="file"
				name="icon"
				accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
				onchange={(e) => {
					const f = e.currentTarget.files?.[0];
					preview = f ? URL.createObjectURL(f) : null;
				}}
			/></label
		>
		<button class="btn primary" disabled={!preview}>Upload</button>
	</form>
</section>

<form method="POST" action="?/details" class="card panel" use:enhance={keep}>
	<header>
		<h2>Details</h2>
		<p>{typeInfo(p.type).singular} · how it appears across the marketplace.</p>
	</header>
	<fieldset class="form-grid" disabled={locked}>
		<div class="form-grid two">
			<div class="field">
				<label for="name">Name</label><input
					class="input"
					id="name"
					name="name"
					required
					maxlength="64"
					value={p.name}
				/>
			</div>
			<div class="field">
				<label for="slug">Address</label>
				<div class="input-group">
					<span class="prefix">/{typeInfo(p.type).path}/</span><input
						class="input"
						id="slug"
						name="slug"
						required
						maxlength="48"
						pattern="[a-z0-9]+(-[a-z0-9]+)*"
						value={p.slug}
					/>
				</div>
			</div>
		</div>
		<div class="field">
			<label for="summary">Summary</label><input
				class="input"
				id="summary"
				name="summary"
				maxlength="160"
				value={p.summary}
			/>
			<p class="field-hint">One line, up to 160 characters.</p>
		</div>

		<div class="field">
			<span class="label">Tags</span>
			<p class="field-hint">Up to 8. They decide which filters find your project.</p>
			{#each groups as { g, items } (g)}
				<p class="group">{GROUP_NAMES[g]}</p>
				<div class="tags">
					{#each items as c (c.slug)}
						<label class="tag"
							><input
								type="checkbox"
								name="categories"
								value={c.slug}
								checked={p.categories.includes(c.slug)}
							/><span>{c.name}</span></label
						>
					{/each}
				</div>
			{/each}
		</div>

		<div class="form-grid two">
			<div class="field">
				<label for="license">Licence</label>
				<select class="select" id="license" name="license" bind:value={license}>
					<option value="">Choose a licence</option>
					{#each LICENSES as l (l.id)}<option value={l.id}
							>{l.name}{l.open ? ' (open source)' : ''}</option
						>{/each}
				</select>
			</div>
			<div class="field">
				<label for="licenseUrl">Licence text link {license === 'custom' ? '' : '(optional)'}</label>
				<input
					class="input"
					id="licenseUrl"
					name="licenseUrl"
					type="url"
					value={p.licenseUrl ?? ''}
					placeholder="https://…"
					required={license === 'custom'}
				/>
			</div>
		</div>

		<div class="form-grid two">
			<div class="field">
				<label for="sourceUrl">Source code</label><input
					class="input"
					id="sourceUrl"
					name="sourceUrl"
					type="url"
					value={p.sourceUrl ?? ''}
					placeholder="https://github.com/…"
				/>
			</div>
			<div class="field">
				<label for="issuesUrl">Bug reports</label><input
					class="input"
					id="issuesUrl"
					name="issuesUrl"
					type="url"
					value={p.issuesUrl ?? ''}
					placeholder="https://…"
				/>
			</div>
			<div class="field">
				<label for="wikiUrl">Wiki or guide</label><input
					class="input"
					id="wikiUrl"
					name="wikiUrl"
					type="url"
					value={p.wikiUrl ?? ''}
					placeholder="https://…"
				/>
			</div>
			<div class="field">
				<label for="discordUrl">Discord invite</label><input
					class="input"
					id="discordUrl"
					name="discordUrl"
					type="url"
					value={p.discordUrl ?? ''}
					placeholder="https://discord.gg/…"
				/>
			</div>
		</div>
	</fieldset>
	<footer><button class="btn primary" disabled={locked}>Save details</button></footer>
</form>

<style>
	.icon-row {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.prev {
		width: 96px;
		height: 96px;
		border-radius: 20px;
		overflow: hidden;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.prev img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.group {
		font-size: 12px;
		font-weight: 600;
		color: var(--fg-4);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-top: 8px;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.tag {
		position: relative;
		cursor: pointer;
	}
	.tag input {
		position: absolute;
		opacity: 0;
		inset: 0;
		cursor: pointer;
	}
	.tag span {
		display: inline-block;
		padding: 5px 12px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 500;
		color: var(--fg-2);
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
	.tag input:checked + span {
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.tag input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>
