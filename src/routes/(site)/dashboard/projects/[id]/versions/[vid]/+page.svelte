<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import MarkdownEditor from '#lib/components/MarkdownEditor.svelte';
	import GameVersionPicker from '#lib/components/market/GameVersionPicker.svelte';
	import { LOADER_NAMES, typeInfo } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	const info = $derived(typeInfo(data.project.type));
	let gameVersions = $state<string[]>([]);
	let channel = $state('release');
	$effect(() => {
		gameVersions = [...data.version.gameVersions];
		channel = data.version.channel;
	});
</script>

<Seo title="Edit {data.version.name}" description="Edit a version." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

<form
	method="POST"
	class="card panel"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	<header>
		<h2>Edit {data.version.name}</h2>
		<p>
			Version <span class="mono">{data.version.versionNumber}</span>. Files can’t be replaced:
			publish a new version instead.
		</p>
	</header>
	<div class="form-grid">
		<div class="form-grid two">
			<div class="field">
				<label for="name">Name</label><input
					class="input"
					id="name"
					name="name"
					maxlength="64"
					value={data.version.name}
				/>
			</div>
			<div class="field">
				<label for="channel">Channel</label>
				<select class="select" id="channel" name="channel" bind:value={channel}
					><option value="release">Release</option><option value="beta">Beta</option><option
						value="alpha">Alpha</option
					></select
				>
			</div>
		</div>
		<div class="field">
			<span class="label">Minecraft versions</span><GameVersionPicker
				versions={data.gameVersions}
				bind:selected={gameVersions}
			/>
		</div>
		{#if info.loaders.length}
			<div class="field">
				<span class="label">Loaders</span>
				<div class="row-gap">
					{#each info.loaders as l (l)}<label class="check"
							><input
								type="checkbox"
								name="loaders"
								value={l}
								checked={data.version.loaders.includes(l)}
							/>{LOADER_NAMES[l]}</label
						>{/each}
				</div>
			</div>
		{/if}
		<div class="field">
			<span class="label">Changelog</span><MarkdownEditor
				name="changelog"
				rows={10}
				maxlength={20000}
				value={data.version.changelog}
			/>
		</div>
	</div>
	<footer>
		<a class="btn ghost" href="/dashboard/projects/{data.project.id}/versions">Cancel</a>
		<button class="btn primary">Save version</button>
	</footer>
</form>
