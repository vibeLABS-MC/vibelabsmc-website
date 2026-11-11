<script lang="ts">
	import {
		ArrowRight,
		Blocks,
		Database,
		Image,
		Search,
		ShieldCheck,
		Sparkles,
		Upload
	} from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ProjectCard from '#lib/components/market/ProjectCard.svelte';
	import { PROJECT_TYPES } from '#lib/marketplace/taxonomy.ts';

	let { data } = $props();
	const icons = { shader: Sparkles, resourcepack: Image, mod: Blocks, datapack: Database } as const;
	const shelves = $derived([
		{
			title: 'Most downloaded',
			note: 'What players install most',
			items: data.popular,
			href: '/marketplace/search?sort=downloads'
		},
		{
			title: 'Recently updated',
			note: 'Fresh versions this week',
			items: data.updated,
			href: '/marketplace/search?sort=updated'
		},
		{
			title: 'New arrivals',
			note: 'Just approved by moderators',
			items: data.fresh,
			href: '/marketplace/search?sort=newest'
		}
	]);
	const empty = $derived(data.popular.length === 0);
</script>

<Seo
	title="Marketplace"
	description="Free Minecraft shader packs, texture packs, mods and data packs. Every file is checked, virus-scanned and reviewed by moderators."
/>

<main id="main">
	<section class="hero">
		<div class="container">
			<p class="eyebrow">vibeLABS marketplace</p>
			<h1>Shaders, packs and mods, checked before you download them</h1>
			<p class="lede">
				Every upload is opened, checked for its type and virus-scanned. Every new project is
				approved by a moderator. Everything is free.
			</p>
			<form class="hero-search" method="GET" action="/marketplace/search" role="search">
				<Search aria-hidden="true" />
				<input
					class="input"
					type="search"
					name="q"
					placeholder="Search shader packs, texture packs, mods…"
					aria-label="Search the marketplace"
					maxlength="100"
				/>
				<button class="btn primary">Search</button>
			</form>
			<ul class="promises">
				<li><ShieldCheck aria-hidden="true" />Virus-scanned files</li>
				<li><Sparkles aria-hidden="true" />Moderator approved</li>
				<li><Upload aria-hidden="true" />Free to publish</li>
			</ul>
		</div>
	</section>

	<div class="container page">
		<section class="types" aria-label="Sections">
			{#each PROJECT_TYPES as type (type.id)}
				{@const Icon = icons[type.id]}
				<a class="type-tile card type-{type.id}" href="/marketplace/{type.path}">
					<span class="type-icon"><Icon aria-hidden="true" /></span>
					<span class="type-text">
						<strong>{type.name}</strong>
						<span>{type.blurb}</span>
					</span>
					<span class="type-count">{(data.counts[type.id] ?? 0).toLocaleString('en-GB')}</span>
					<ArrowRight class="type-arrow" aria-hidden="true" />
				</a>
			{/each}
		</section>

		{#if empty}
			<section class="card empty start">
				<span class="empty-icon"><Upload aria-hidden="true" /></span>
				<h3>The marketplace is open</h3>
				<p>
					No projects are approved yet. Publish the first shader pack, texture pack, mod or data
					pack.
				</p>
				<a class="btn primary" href="/dashboard/projects/new">Publish a project</a>
			</section>
		{:else}
			{#each shelves as shelf (shelf.title)}
				{#if shelf.items.length}
					<section class="shelf">
						<header>
							<div>
								<h2>{shelf.title}</h2>
								<p>{shelf.note}</p>
							</div>
							<a class="link small" href={shelf.href}>See all<ArrowRight aria-hidden="true" /></a>
						</header>
						<div class="shelf-grid">
							{#each shelf.items as project (project.id)}<ProjectCard
									{project}
									setup={data.setup}
									showType
								/>{/each}
						</div>
					</section>
				{/if}
			{/each}
		{/if}
	</div>
</main>

<style>
	.hero {
		padding: 72px 0 56px;
		text-align: center;
		background: radial-gradient(50% 60% at 50% 0%, var(--accent-bg), transparent 75%), var(--bg);
		border-bottom: 1px solid var(--line);
	}
	.hero h1 {
		max-width: 820px;
		margin: 12px auto 16px;
		font-size: 48px;
		line-height: 58px;
		letter-spacing: -0.025em;
		font-weight: 600;
		text-wrap: balance;
	}
	.lede {
		max-width: 640px;
		margin: 0 auto;
		color: var(--fg-3);
		font-size: 18px;
		line-height: 28px;
	}
	.hero-search {
		position: relative;
		display: flex;
		gap: 8px;
		max-width: 640px;
		margin: 32px auto 20px;
		padding: 6px;
		border-radius: 14px;
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			var(--shadow-lg);
	}
	.hero-search :global(svg) {
		position: absolute;
		left: 20px;
		top: 50%;
		translate: 0 -50%;
		width: 20px;
		height: 20px;
		color: var(--fg-4);
	}
	.hero-search .input {
		box-shadow: none;
		padding-left: 44px;
		background: transparent;
	}
	.promises {
		display: flex;
		justify-content: center;
		gap: 24px;
		list-style: none;
		padding: 0;
		color: var(--fg-3);
		font-size: 14px;
		font-weight: 500;
		flex-wrap: wrap;
	}
	.promises li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.promises :global(svg) {
		width: 16px;
		height: 16px;
		color: var(--ok-fg);
	}
	.types {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
		margin-bottom: 56px;
	}
	.type-tile {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas: 'icon count' 'text text';
		gap: 16px;
		padding: 20px;
		border-radius: 16px;
		transition:
			box-shadow 0.2s,
			translate 0.2s;
	}
	.type-tile:hover {
		translate: 0 -2px;
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			var(--shadow-lg);
	}
	.type-icon {
		grid-area: icon;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 12px;
		color: #fff;
	}
	.type-shader .type-icon {
		background: linear-gradient(135deg, #f79009, #444ce7);
	}
	.type-resourcepack .type-icon {
		background: linear-gradient(135deg, #17b26a, #0e7090);
	}
	.type-mod .type-icon {
		background: linear-gradient(135deg, #ee46bc, #444ce7);
	}
	.type-datapack .type-icon {
		background: linear-gradient(135deg, #f04438, #f79009);
	}
	.type-icon :global(svg) {
		width: 24px;
		height: 24px;
	}
	.type-count {
		grid-area: count;
		justify-self: end;
		font-size: 14px;
		font-weight: 600;
		color: var(--fg-4);
	}
	.type-text {
		grid-area: text;
		display: grid;
		gap: 4px;
	}
	.type-text strong {
		font-size: 17px;
	}
	.type-text span {
		font-size: 14px;
		line-height: 20px;
		color: var(--fg-3);
	}
	.type-tile :global(.type-arrow) {
		position: absolute;
		right: 20px;
		bottom: 20px;
		width: 18px;
		height: 18px;
		color: var(--fg-4);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.type-tile:hover :global(.type-arrow) {
		opacity: 1;
	}
	.shelf + .shelf {
		margin-top: 56px;
	}
	.shelf header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 20px;
	}
	.shelf h2 {
		font-size: 22px;
		line-height: 30px;
		font-weight: 600;
	}
	.shelf header p {
		color: var(--fg-3);
		font-size: 14px;
	}
	.shelf .link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.shelf .link :global(svg) {
		width: 16px;
		height: 16px;
	}
	.shelf-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
	}
	.start {
		margin-top: 8px;
	}
	@media (max-width: 1024px) {
		.types {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.shelf-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 640px) {
		.hero h1 {
			font-size: 34px;
			line-height: 42px;
		}
		.types,
		.shelf-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
