<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, CircleAlert, CircleCheck, ExternalLink, X } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ProjectCard from '#lib/components/market/ProjectCard.svelte';

	let { data, form } = $props();
	const c = $derived(data.collection);
</script>

<Seo title={c.name} description="Edit a collection." />

<a class="back link small" href="/dashboard/collections"
	><ArrowLeft aria-hidden="true" />Collections</a
>
{#if form?.message}<p class="alert error spaced" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}
{#if form && 'saved' in form}<p class="alert ok spaced" role="status">
		<CircleCheck aria-hidden="true" />Saved.
	</p>{/if}

<form
	method="POST"
	action="?/update"
	class="card panel"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	<header class="with-link">
		<h2>{c.name}</h2>
		{#if c.visibility !== 'private'}<a class="link small" href="/collections/{c.id}"
				>Public page<ExternalLink aria-hidden="true" /></a
			>{/if}
	</header>
	<div class="form-grid">
		<div class="form-grid two">
			<div class="field">
				<label for="name">Name</label><input
					class="input"
					id="name"
					name="name"
					required
					maxlength="64"
					value={c.name}
				/>
			</div>
			<div class="field">
				<label for="visibility">Who can see it</label>
				<select class="select" id="visibility" name="visibility" value={c.visibility}
					><option value="public">Public</option><option value="unlisted">Unlisted</option><option
						value="private">Private</option
					></select
				>
			</div>
		</div>
		<div class="field">
			<label for="description">Description</label><input
				class="input"
				id="description"
				name="description"
				maxlength="500"
				value={c.description}
			/>
		</div>
	</div>
	<footer>
		<button
			class="btn ghost"
			formaction="?/delete"
			onclick={(e) => {
				if (!confirm('Delete this collection? The projects stay on the marketplace.'))
					e.preventDefault();
			}}>Delete collection</button
		>
		<button class="btn primary">Save</button>
	</footer>
</form>

{#if data.projects.length}
	<div class="grid">
		{#each data.projects as project (project.id)}
			<div class="item">
				<ProjectCard {project} showType />
				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="project" value={project.id} /><button
						class="btn secondary sm remove"
						aria-label="Remove {project.name}"><X aria-hidden="true" /></button
					>
				</form>
			</div>
		{/each}
	</div>
{:else}
	<p class="card panel muted small spaced-top">
		Nothing saved yet. Use the bookmark button on any project page.
	</p>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 16px;
	}
	.back :global(svg),
	.with-link :global(svg) {
		width: 14px;
		height: 14px;
	}
	.with-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.with-link .link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.spaced {
		margin-bottom: 16px;
	}
	.spaced-top {
		margin-top: 24px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 16px;
		margin-top: 24px;
	}
	.item {
		position: relative;
	}
	.item form {
		position: absolute;
		top: 8px;
		right: 8px;
		z-index: 2;
	}
	.remove {
		background: rgb(12 14 18 / 0.6);
		color: #fff;
		box-shadow: none;
	}
</style>
