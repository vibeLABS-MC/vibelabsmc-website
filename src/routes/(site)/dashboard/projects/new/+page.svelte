<script lang="ts">
	import { enhance } from '$app/forms';
	import { Blocks, CircleAlert, Database, Image, Sparkles } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { PROJECT_TYPES, slugify } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	let type = $state('');
	let name = $state('');
	let slug = $state('');
	let touched = $state(false);
	$effect(() => {
		type = form?.type ?? data.type;
		name = form?.name ?? '';
		slug = form?.slug ?? '';
	});
	const auto = $derived(slugify(name));
	const icons = { shader: Sparkles, resourcepack: Image, mod: Blocks, datapack: Database } as const;
	const path = $derived(PROJECT_TYPES.find((t) => t.id === type)?.path ?? 'shaders');
</script>

<Seo title="New project" description="Publish a shader pack, texture pack, mod or data pack." />

<header class="page-head">
	<div>
		<h1>New project</h1>
		<p>Start with the basics. You can add the icon, description, screenshots and files next.</p>
	</div>
</header>

<form
	method="POST"
	class="card panel"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	{#if form?.message}<p class="alert error spaced" role="alert">
			<CircleAlert aria-hidden="true" />{form.message}
		</p>{/if}
	<fieldset class="types">
		<legend class="label">What are you publishing?</legend>
		{#each PROJECT_TYPES as t (t.id)}
			{@const Icon = icons[t.id]}
			<label class="type-option {type === t.id ? 'on' : ''}">
				<input type="radio" name="type" value={t.id} bind:group={type} class="sr-only" />
				<span class="ticon type-{t.id}"><Icon aria-hidden="true" /></span>
				<strong>{t.singular}</strong>
				<span class="muted small">{t.blurb}</span>
			</label>
		{/each}
	</fieldset>
	<div class="form-grid">
		<div class="field">
			<label for="name">Name</label>
			<input
				class="input"
				id="name"
				name="name"
				required
				minlength="2"
				maxlength="64"
				bind:value={name}
				placeholder="Glow Shaders"
			/>
		</div>
		<div class="field">
			<label for="slug">Address</label>
			<div class="input-group">
				<span class="prefix">/marketplace/{path}/</span>
				<input
					class="input"
					id="slug"
					name="slug"
					maxlength="48"
					pattern="[a-z0-9]+(-[a-z0-9]+)*"
					value={touched ? slug : auto}
					oninput={(e) => {
						touched = true;
						slug = e.currentTarget.value;
					}}
					placeholder="glow-shaders"
				/>
			</div>
			<p class="field-hint">Lowercase letters, numbers and dashes. You can change it later.</p>
		</div>
		<div class="field">
			<label for="summary">Summary</label>
			<input
				class="input"
				id="summary"
				name="summary"
				maxlength="160"
				value={form?.summary ?? ''}
				placeholder="One line on what makes it special"
			/>
			<p class="field-hint">Shown on cards and in search. Up to 160 characters.</p>
		</div>
	</div>
	<footer>
		<a class="btn ghost" href="/dashboard">Cancel</a>
		<button class="btn primary">Create project</button>
	</footer>
</form>

<style>
	.spaced {
		margin-bottom: 16px;
	}
	.types {
		border: 0;
		padding: 0;
		margin: 0 0 24px;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}
	.types legend {
		margin-bottom: 10px;
	}
	.type-option {
		display: grid;
		gap: 6px;
		padding: 16px;
		border-radius: 12px;
		cursor: pointer;
		box-shadow: inset 0 0 0 1px var(--line-strong);
		transition: box-shadow 0.15s;
	}
	.type-option:hover {
		background: var(--bg-subtle);
	}
	.type-option.on {
		box-shadow:
			inset 0 0 0 2px var(--accent),
			0 0 0 4px var(--accent-bg);
	}
	.type-option:has(:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.ticon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		color: #fff;
		margin-bottom: 4px;
	}
	.ticon :global(svg) {
		width: 20px;
		height: 20px;
	}
	.type-shader {
		background: linear-gradient(135deg, #f79009, #444ce7);
	}
	.type-resourcepack {
		background: linear-gradient(135deg, #17b26a, #0e7090);
	}
	.type-mod {
		background: linear-gradient(135deg, #ee46bc, #444ce7);
	}
	.type-datapack {
		background: linear-gradient(135deg, #f04438, #f79009);
	}
	@media (max-width: 860px) {
		.types {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
