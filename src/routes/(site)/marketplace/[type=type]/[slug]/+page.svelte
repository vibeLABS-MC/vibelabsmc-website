<script lang="ts">
	import { FileText } from '@lucide/svelte';
	import { projectPath } from '#lib/marketplace/taxonomy.ts';

	let { data } = $props();
	const galleryHref = $derived(`${projectPath(data.project.type, data.project.slug)}/gallery`);
	const featured = $derived(data.gallery.slice(0, 3));
</script>

{#if featured.length}
	<div class="strip">
		{#each featured as shot (shot.id)}
			<a href={galleryHref} class="shot" aria-label={shot.title || 'Open the gallery'}>
				<img
					src="/media/{shot.imageKey}.thumb.webp"
					alt={shot.title}
					width="800"
					height="450"
					loading="lazy"
				/>
			</a>
		{/each}
	</div>
{/if}

{#if data.project.description.trim()}
	<article class="prose card panel">{@html data.descriptionHtml}</article>
{:else}
	<div class="card empty">
		<span class="empty-icon"><FileText aria-hidden="true" /></span>
		<h3>No description yet</h3>
		{#if data.role}<p>
				Write one in the dashboard: what the project does, how to install it, and what it needs.
			</p>{/if}
	</div>
{/if}

<style>
	.strip {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 20px;
	}
	.shot {
		display: block;
		border-radius: 12px;
		overflow: hidden;
		aspect-ratio: 16 / 9;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: scale 0.3s;
	}
	.shot:hover img {
		scale: 1.04;
	}
	article {
		padding: 28px 32px;
	}
	@media (max-width: 640px) {
		.strip {
			grid-template-columns: 1fr 1fr;
		}
		article {
			padding: 20px;
		}
	}
</style>
