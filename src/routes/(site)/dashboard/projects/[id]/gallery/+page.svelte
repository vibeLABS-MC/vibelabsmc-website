<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowDown, ArrowUp, CircleAlert, ImagePlus, Star, Trash2 } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';

	let { data, form } = $props();
	let preview = $state<string | null>(null);
	let uploading = $state(false);
</script>

<Seo title="Gallery of {data.project.name}" description="Project screenshots." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

<form
	method="POST"
	action="?/upload"
	enctype="multipart/form-data"
	class="card panel uploader"
	use:enhance={() => {
		uploading = true;
		return async ({ update }) => {
			await update();
			uploading = false;
			preview = null;
		};
	}}
>
	<header>
		<h2>Add a screenshot</h2>
		<p>
			PNG, JPEG or WebP up to 8 MB. The featured image becomes the banner on the project’s card. {data
				.gallery.length} of {data.max} used.
		</p>
	</header>
	<div class="drop">
		<label class="pick">
			{#if preview}<img src={preview} alt="" />{:else}<ImagePlus aria-hidden="true" /><span
					>Choose an image</span
				>{/if}
			<input
				class="sr-only"
				type="file"
				name="image"
				accept="image/png,image/jpeg,image/webp,image/avif"
				required
				onchange={(e) => {
					const f = e.currentTarget.files?.[0];
					preview = f ? URL.createObjectURL(f) : null;
				}}
			/>
		</label>
		<div class="field grow">
			<label for="title">Caption (optional)</label>
			<input
				class="input"
				id="title"
				name="title"
				maxlength="80"
				placeholder="Sunset over the ocean, 1.21.4, Ultra preset"
			/>
			<button class="btn primary" disabled={!preview || uploading}
				>{uploading ? 'Uploading…' : 'Add to gallery'}</button
			>
		</div>
	</div>
</form>

{#if data.gallery.length}
	<ul class="shots">
		{#each data.gallery as shot, i (shot.id)}
			<li class="card">
				<div class="thumb">
					<img
						src="/media/{shot.imageKey}.thumb.webp"
						alt={shot.title}
						width="800"
						height="450"
						loading="lazy"
					/>{#if shot.featured}<span class="feat"><Star aria-hidden="true" />Featured</span>{/if}
				</div>
				<form
					method="POST"
					action="?/update"
					class="meta"
					use:enhance={() =>
						async ({ update }) =>
							update({ reset: false })}
				>
					<input type="hidden" name="id" value={shot.id} />
					<input
						class="input"
						name="title"
						maxlength="80"
						value={shot.title}
						placeholder="Caption"
						aria-label="Caption"
					/>
					<textarea
						class="textarea"
						name="description"
						maxlength="500"
						rows="2"
						placeholder="Description (optional)"
						aria-label="Description">{shot.description}</textarea
					>
					<label class="check"
						><input type="checkbox" name="featured" checked={shot.featured} />Use as the card banner</label
					>
					<div class="row-gap">
						<button class="btn secondary sm">Save</button><span class="muted tiny"
							>{shot.width}×{shot.height}</span
						>
					</div>
				</form>
				<div class="tools">
					<form method="POST" action="?/move" use:enhance>
						<input type="hidden" name="id" value={shot.id} /><input
							type="hidden"
							name="direction"
							value="up"
						/><button class="btn ghost sm" disabled={i === 0} aria-label="Move earlier"
							><ArrowUp aria-hidden="true" /></button
						>
					</form>
					<form method="POST" action="?/move" use:enhance>
						<input type="hidden" name="id" value={shot.id} /><input
							type="hidden"
							name="direction"
							value="down"
						/><button
							class="btn ghost sm"
							disabled={i === data.gallery.length - 1}
							aria-label="Move later"><ArrowDown aria-hidden="true" /></button
						>
					</form>
					<form method="POST" action="?/remove" use:enhance>
						<input type="hidden" name="id" value={shot.id} /><button
							class="btn ghost sm"
							aria-label="Remove"><Trash2 aria-hidden="true" /></button
						>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.drop {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
	}
	.pick {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 8px;
		width: 280px;
		aspect-ratio: 16 / 9;
		border-radius: 12px;
		border: 2px dashed var(--line-strong);
		color: var(--fg-3);
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		overflow: hidden;
	}
	.pick:hover {
		border-color: var(--accent);
		color: var(--accent-fg);
	}
	.pick :global(svg) {
		width: 28px;
		height: 28px;
	}
	.pick img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.grow {
		flex: 1;
		min-width: 240px;
		align-content: start;
	}
	.grow .btn {
		justify-self: start;
		margin-top: 8px;
	}
	.shots {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 12px;
	}
	.shots li {
		display: grid;
		grid-template-columns: 240px 1fr auto;
		gap: 16px;
		padding: 12px;
		align-items: start;
	}
	.thumb {
		position: relative;
		border-radius: 10px;
		overflow: hidden;
		aspect-ratio: 16 / 9;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.feat {
		position: absolute;
		left: 8px;
		top: 8px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		color: #fff;
		background: rgb(12 14 18 / 0.6);
	}
	.feat :global(svg) {
		width: 12px;
		height: 12px;
	}
	.meta {
		display: grid;
		gap: 8px;
	}
	.meta .input,
	.meta .textarea {
		font-size: 14px;
		padding: 8px 12px;
		min-height: 0;
	}
	.tools {
		display: grid;
		gap: 2px;
	}
	@media (max-width: 720px) {
		.shots li {
			grid-template-columns: 1fr;
		}
		.tools {
			display: flex;
		}
	}
</style>
