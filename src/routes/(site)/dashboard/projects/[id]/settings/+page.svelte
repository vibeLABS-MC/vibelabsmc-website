<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';

	let { data, form } = $props();
	let confirmText = $state('');
</script>

<Seo title="Settings for {data.project.name}" description="Project settings." />

<section class="card panel danger-zone">
	<header>
		<h2>Delete this project</h2>
		<p>
			Deletes the project with every version, file, screenshot, review and download count. Followers
			and collections lose it. This can’t be undone.
		</p>
	</header>
	{#if form?.message}<p class="alert error spaced" role="alert">
			<CircleAlert aria-hidden="true" />{form.message}{#if form && 'sudo' in form}&nbsp;<a
					class="link"
					href={String(form.sudo)}>Confirm it’s you</a
				>{/if}
		</p>{/if}
	<form method="POST" action="?/delete" class="form-grid narrow" use:enhance>
		<div class="field">
			<label for="confirm">Type <strong class="mono">{data.project.slug}</strong> to confirm</label>
			<input
				class="input"
				id="confirm"
				name="confirm"
				autocomplete="off"
				bind:value={confirmText}
			/>
		</div>
		<div>
			<button class="btn danger" disabled={confirmText !== data.project.slug}>Delete project</button
			>
		</div>
	</form>
</section>

<style>
	.narrow {
		max-width: 420px;
	}
	.spaced {
		margin-bottom: 16px;
	}
</style>
