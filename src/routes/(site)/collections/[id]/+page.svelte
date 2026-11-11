<script lang="ts">
	import { Bookmark, Pencil } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ProjectCard from '#lib/components/market/ProjectCard.svelte';
	import { timeAgo } from '#lib/format.ts';

	let { data } = $props();
	const c = $derived(data.collection);
</script>

<Seo
	title={c.name}
	description={c.description ||
		`A collection of ${data.projects.length} Minecraft projects on vibeLABS.`}
/>

<main id="main" class="container page">
	<header class="chead">
		<span class="cicon"><Bookmark aria-hidden="true" /></span>
		<div>
			<p class="eyebrow">Collection</p>
			<h1>{c.name}</h1>
			{#if c.description}<p class="muted">{c.description}</p>{/if}
			{#if data.owner}
				<p class="by">
					<Avatar name={data.owner.displayName} imageKey={data.owner.avatarKey} size={24} />
					by {#if data.owner.username}<a class="link" href="/user/{data.owner.username}"
							>{data.owner.displayName}</a
						>{:else}{data.owner.displayName}{/if}
					· {data.projects.length}
					{data.projects.length === 1 ? 'project' : 'projects'} · updated {timeAgo(c.updatedAt)}
				</p>
			{/if}
		</div>
		{#if data.mine}<a class="btn secondary" href="/dashboard/collections/{c.id}"
				><Pencil aria-hidden="true" />Edit</a
			>{/if}
	</header>

	{#if data.projects.length}
		<div class="grid">
			{#each data.projects as project (project.id)}<ProjectCard
					{project}
					setup={data.setup}
					showType
				/>{/each}
		</div>
	{:else}
		<p class="card panel muted">This collection is empty.</p>
	{/if}
</main>

<style>
	.chead {
		display: flex;
		align-items: flex-start;
		gap: 20px;
		margin-bottom: 32px;
	}
	.chead > div {
		flex: 1;
	}
	.cicon {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 16px;
		background: var(--accent-bg);
		color: var(--accent-fg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.cicon :global(svg) {
		width: 28px;
		height: 28px;
	}
	h1 {
		font-size: 32px;
		line-height: 40px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.by {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
		font-size: 14px;
		color: var(--fg-3);
		flex-wrap: wrap;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 20px;
	}
</style>
