<script lang="ts">
	import { CalendarClock, CircleCheck, Download, Heart, Star } from '@lucide/svelte';
	import ProjectIcon from './ProjectIcon.svelte';
	import { compact, timeAgo } from '#lib/format.ts';
	import {
		LOADER_NAMES,
		projectPath,
		typeInfo,
		type Loader,
		type ProjectType
	} from '#lib/marketplace/taxonomy.ts';
	import { fits, type Setup } from '#lib/marketplace/setup.ts';
	import { newestVersion } from '#lib/marketplace/versions.ts';

	interface Card {
		slug: string;
		type: ProjectType;
		name: string;
		summary: string;
		iconKey: string | null;
		bannerKey: string | null;
		categories: string[];
		loaders: string[];
		gameVersions: string[];
		downloads: number;
		follows: number;
		ratingSum: number;
		ratingCount: number;
		updatedAt: Date | string;
		author: { username: string | null; displayName: string } | null;
	}

	let {
		project,
		view = 'grid',
		setup = { version: null, loader: null },
		categoryNames = {},
		showType = false
	}: {
		project: Card;
		view?: 'grid' | 'list';
		setup?: Setup;
		categoryNames?: Record<string, string>;
		showType?: boolean;
	} = $props();

	const info = $derived(typeInfo(project.type));
	const href = $derived(projectPath(project.type, project.slug));
	const rating = $derived(project.ratingCount ? project.ratingSum / project.ratingCount : 0);
	const fit = $derived(fits(setup, project, info.loaders.length > 0));
	const newest = $derived(newestVersion(project.gameVersions));
	const tags = $derived(project.categories.slice(0, 3).map((c) => categoryNames[c] ?? c));
</script>

<article class="pcard {view}">
	{#if view === 'grid'}
		<a class="banner type-{project.type}" {href} tabindex="-1" aria-hidden="true">
			{#if project.bannerKey}<img
					src="/media/{project.bannerKey}.thumb.webp"
					alt=""
					loading="lazy"
					width="800"
					height="450"
				/>{/if}
			{#if showType}<span class="type-chip">{info.singular}</span>{/if}
			{#if fit === 'yes'}<span class="fit"
					><CircleCheck aria-hidden="true" />Works with your setup</span
				>{/if}
		</a>
	{/if}
	<div class="body">
		<div class="head">
			<a class="icon-link" {href} tabindex="-1" aria-hidden="true"
				><ProjectIcon
					name={project.name}
					iconKey={project.iconKey}
					size={view === 'grid' ? 56 : 72}
				/></a
			>
			<div class="title">
				<h3><a {href}>{project.name}</a></h3>
				{#if project.author}
					<p class="by">
						by {#if project.author.username}<a href="/user/{project.author.username}"
								>{project.author.displayName}</a
							>{:else}{project.author.displayName}{/if}
					</p>
				{/if}
			</div>
		</div>
		<p class="summary">{project.summary}</p>
		<div class="chips">
			{#each project.loaders as loader (loader)}<span class="badge accent"
					>{LOADER_NAMES[loader as Loader] ?? loader}</span
				>{/each}
			{#if newest}<span class="badge">{newest}{project.gameVersions.length > 1 ? '+' : ''}</span
				>{/if}
			{#each tags as tag (tag)}<span class="badge">{tag}</span>{/each}
			{#if view === 'list' && fit === 'yes'}<span class="badge ok"
					><CircleCheck aria-hidden="true" />Fits your setup</span
				>{/if}
		</div>
		<footer class="meta">
			<span title="{project.downloads.toLocaleString('en-GB')} downloads"
				><Download aria-hidden="true" />{compact(project.downloads)}</span
			>
			<span title="{project.follows.toLocaleString('en-GB')} followers"
				><Heart aria-hidden="true" />{compact(project.follows)}</span
			>
			{#if project.ratingCount}
				<span title="{rating.toFixed(1)} from {project.ratingCount} reviews"
					><Star class="star" aria-hidden="true" />{rating.toFixed(1)}<span class="muted"
						>({compact(project.ratingCount)})</span
					></span
				>
			{/if}
			<span class="updated" title="Last updated"
				><CalendarClock aria-hidden="true" />{timeAgo(project.updatedAt)}</span
			>
		</footer>
	</div>
</article>

<style>
	.pcard {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--bg-raised);
		border-radius: 16px;
		box-shadow:
			inset 0 0 0 1px var(--line),
			var(--shadow-xs);
		overflow: hidden;
		transition:
			box-shadow 0.2s,
			translate 0.2s;
	}
	.pcard:hover {
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			var(--shadow-lg);
		translate: 0 -2px;
	}
	.banner {
		position: relative;
		display: block;
		aspect-ratio: 16 / 7;
		overflow: hidden;
		background: var(--brand-gradient);
	}
	.banner.type-shader {
		background:
			radial-gradient(60% 90% at 15% 100%, rgb(247 144 9 / 0.55), transparent 70%),
			radial-gradient(55% 80% at 85% 0%, rgb(97 114 243 / 0.75), transparent 70%), #0b1030;
	}
	.banner.type-resourcepack {
		background:
			radial-gradient(60% 90% at 0% 0%, rgb(23 178 106 / 0.6), transparent 70%),
			radial-gradient(60% 90% at 100% 100%, rgb(14 147 132 / 0.6), transparent 70%), #06231c;
	}
	.banner.type-mod {
		background:
			radial-gradient(60% 90% at 100% 0%, rgb(238 70 188 / 0.5), transparent 70%),
			radial-gradient(60% 90% at 0% 100%, rgb(97 114 243 / 0.6), transparent 70%), #1a0d2e;
	}
	.banner.type-datapack {
		background:
			radial-gradient(60% 90% at 0% 100%, rgb(240 68 56 / 0.5), transparent 70%),
			radial-gradient(60% 90% at 100% 0%, rgb(253 176 34 / 0.45), transparent 70%), #2a0f0a;
	}
	.banner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: scale 0.4s;
	}
	.pcard:hover .banner img {
		scale: 1.04;
	}
	.type-chip,
	.fit {
		position: absolute;
		top: 10px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 9px;
		border-radius: 999px;
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
		color: #fff;
		background: rgb(12 14 18 / 0.55);
		backdrop-filter: blur(8px);
	}
	.type-chip {
		left: 10px;
	}
	.fit {
		right: 10px;
		background: rgb(6 118 71 / 0.85);
	}
	.fit :global(svg) {
		width: 14px;
		height: 14px;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 0 18px 16px;
		flex: 1;
	}
	.head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}
	/* Only the icon reaches up into the banner; the title stays on the card. */
	.icon-link {
		position: relative;
		z-index: 1;
		display: flex;
		flex: none;
		margin-top: -26px;
		border-radius: 14px;
		box-shadow: 0 0 0 3px var(--bg-raised);
	}
	.title {
		min-width: 0;
		padding-top: 10px;
	}
	h3 {
		font-size: 17px;
		line-height: 24px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.by {
		font-size: 13px;
		line-height: 18px;
		color: var(--fg-4);
	}
	.by a {
		position: relative;
		z-index: 1;
		color: var(--fg-3);
		font-weight: 500;
	}
	.by a:hover {
		color: var(--accent-fg);
	}
	.summary {
		color: var(--fg-3);
		font-size: 14px;
		line-height: 20px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 40px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 12px;
		margin-top: auto;
		padding-top: 12px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		line-height: 18px;
		color: var(--fg-3);
		font-weight: 500;
	}
	.meta span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}
	.meta :global(svg) {
		width: 15px;
		height: 15px;
		color: var(--fg-4);
	}
	.meta :global(.star) {
		color: var(--star);
		fill: var(--star);
	}
	.updated {
		margin-left: auto;
	}

	/* List view: one row per project */
	.pcard.list {
		flex-direction: row;
	}
	.list .body {
		padding: 16px 20px;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-areas: 'head head' 'summary summary' 'chips meta';
		gap: 10px 16px;
	}
	.list .head {
		grid-area: head;
		align-items: center;
	}
	.list .icon-link {
		margin-top: 0;
		box-shadow: none;
	}
	.list .title {
		padding-top: 0;
	}
	.list .summary {
		grid-area: summary;
		min-height: 0;
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}
	.list .chips {
		grid-area: chips;
	}
	.list .meta {
		grid-area: meta;
		border-top: 0;
		padding-top: 0;
		justify-content: flex-end;
	}
	.list .updated {
		margin-left: 0;
	}
	@media (max-width: 720px) {
		.list .body {
			grid-template-areas: 'head head' 'summary summary' 'chips chips' 'meta meta';
		}
		.list .meta {
			justify-content: flex-start;
		}
	}
</style>
