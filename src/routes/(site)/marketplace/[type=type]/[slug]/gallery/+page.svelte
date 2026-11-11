<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { ChevronLeft, ChevronRight, ImageOff, X } from '@lucide/svelte';

	let { data } = $props();
	let index = $state<number | null>(null);
	const open = $derived(index !== null);
	const current = $derived(index !== null ? data.gallery[index] : null);
	const step = (by: number) => {
		if (index === null) return;
		index = (index + by + data.gallery.length) % data.gallery.length;
	};
</script>

{#if data.gallery.length}
	<div class="gallery">
		{#each data.gallery as shot, i (shot.id)}
			<figure class="card">
				<button
					type="button"
					class="open"
					onclick={() => (index = i)}
					aria-label="View {shot.title || `screenshot ${i + 1}`} full size"
				>
					<img
						src="/media/{shot.imageKey}.thumb.webp"
						alt={shot.title}
						width="800"
						height="450"
						loading="lazy"
					/>
				</button>
				{#if shot.title || shot.description}
					<figcaption>
						<strong>{shot.title}</strong>{#if shot.description}<span>{shot.description}</span>{/if}
					</figcaption>
				{/if}
			</figure>
		{/each}
	</div>

	<Dialog.Root {open} onOpenChange={(o) => !o && (index = null)}>
		<Dialog.Portal>
			<Dialog.Overlay class="dialog-overlay" />
			<Dialog.Content
				class="dialog lightbox"
				onkeydown={(e) =>
					e.key === 'ArrowRight' ? step(1) : e.key === 'ArrowLeft' ? step(-1) : null}
			>
				<Dialog.Title class="sr-only">{current?.title || 'Screenshot'}</Dialog.Title>
				{#if current}<img
						src="/media/{current.imageKey}.webp"
						alt={current.title}
						width={current.width}
						height={current.height}
					/>{/if}
				<div class="lb-bar">
					<button type="button" class="btn ghost" aria-label="Previous" onclick={() => step(-1)}
						><ChevronLeft aria-hidden="true" /></button
					>
					<p>
						{current?.title}{#if current?.description}
							· {current.description}{/if}
						<span class="tiny">({(index ?? 0) + 1} of {data.gallery.length})</span>
					</p>
					<button type="button" class="btn ghost" aria-label="Next" onclick={() => step(1)}
						><ChevronRight aria-hidden="true" /></button
					>
					<Dialog.Close class="btn ghost" aria-label="Close"><X aria-hidden="true" /></Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{:else}
	<div class="card empty">
		<span class="empty-icon"><ImageOff aria-hidden="true" /></span>
		<h3>No screenshots yet</h3>
		{#if data.role}<p>
				Add some in the dashboard: they also make the project’s card stand out.
			</p>{/if}
	</div>
{/if}

<style>
	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 16px;
	}
	figure {
		overflow: hidden;
	}
	.open {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: zoom-in;
		aspect-ratio: 16 / 9;
		overflow: hidden;
	}
	.open img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: scale 0.3s;
	}
	.open:hover img {
		scale: 1.04;
	}
	figcaption {
		display: grid;
		gap: 2px;
		padding: 12px 14px;
		font-size: 14px;
	}
	figcaption span {
		color: var(--fg-3);
	}
</style>
