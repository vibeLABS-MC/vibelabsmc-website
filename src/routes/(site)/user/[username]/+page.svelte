<script lang="ts">
	import { Bookmark, CalendarDays, Download, Package, ShieldCheck } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ProjectCard from '#lib/components/market/ProjectCard.svelte';
	import Stars from '#lib/components/market/Stars.svelte';
	import { compact, shortDate, timeAgo } from '#lib/format.ts';
	import { projectPath } from '#lib/marketplace/taxonomy.ts';

	let { data } = $props();
	const p = $derived(data.profile);
</script>

<Seo
	title="{p.displayName} (@{p.username})"
	description={p.bio || `${p.displayName}’s projects, collections and reviews on vibeLABS.`}
/>

<main id="main" class="container page">
	<header class="uhead card">
		<div class="cover" aria-hidden="true"></div>
		<div class="uinfo">
			<Avatar name={p.displayName} imageKey={p.avatarKey} size={96} />
			<div class="uname">
				<h1>
					{p.displayName}{#if p.role !== 'user'}
						<span class="badge accent"
							><ShieldCheck aria-hidden="true" />{p.role === 'admin' ? 'Admin' : 'Moderator'}</span
						>{/if}
				</h1>
				<p class="muted">@{p.username}</p>
			</div>
			<ul class="ustats">
				<li><Package aria-hidden="true" /><strong>{data.stats.projects}</strong> projects</li>
				<li>
					<Download aria-hidden="true" /><strong>{compact(data.stats.downloads)}</strong> downloads
				</li>
				<li><CalendarDays aria-hidden="true" />Joined {shortDate(p.createdAt)}</li>
			</ul>
		</div>
		{#if p.bio}<p class="bio">{p.bio}</p>{/if}
	</header>

	<section class="block">
		<h2>Projects</h2>
		{#if data.projects.length}
			<div class="grid">
				{#each data.projects as project (project.id)}<ProjectCard
						{project}
						setup={data.setup}
						showType
					/>{/each}
			</div>
		{:else}<p class="muted">No public projects yet.</p>{/if}
	</section>

	{#if data.collections.length}
		<section class="block">
			<h2>Collections</h2>
			<ul class="colls">
				{#each data.collections as c (c.id)}
					<li>
						<a class="card" href="/collections/{c.id}"
							><Bookmark aria-hidden="true" /><span
								><strong>{c.name}</strong><span class="muted small"
									>{c.size}
									{c.size === 1 ? 'project' : 'projects'}{c.description
										? ` · ${c.description}`
										: ''}</span
								></span
							></a
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.reviews.length}
		<section class="block">
			<h2>Recent reviews</h2>
			<ul class="revs">
				{#each data.reviews as r (r.id)}
					<li class="card panel">
						<p class="row-gap small">
							<a class="link" href="{projectPath(r.project.type, r.project.slug)}/reviews"
								>{r.project.name}</a
							><Stars value={r.rating} label={false} /><span class="muted tiny"
								>{timeAgo(r.createdAt)}</span
							>
						</p>
						<p class="rbody">{r.body}</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>

<style>
	.uhead {
		overflow: hidden;
		margin-bottom: 40px;
	}
	.cover {
		height: 120px;
		background: var(--brand-gradient);
	}
	.uinfo {
		display: flex;
		align-items: flex-end;
		gap: 20px;
		padding: 0 28px;
		margin-top: -40px;
		flex-wrap: wrap;
	}
	.uinfo :global(.avatar) {
		box-shadow: 0 0 0 4px var(--bg-raised);
	}
	.uname {
		flex: 1;
		min-width: 200px;
		padding-bottom: 4px;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 28px;
		line-height: 36px;
		font-weight: 600;
	}
	.ustats {
		list-style: none;
		padding: 0 0 8px;
		display: flex;
		gap: 20px;
		font-size: 14px;
		color: var(--fg-3);
		flex-wrap: wrap;
	}
	.ustats li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.ustats :global(svg) {
		width: 16px;
		height: 16px;
	}
	.ustats strong {
		color: var(--fg);
	}
	.bio {
		padding: 16px 28px 24px;
		color: var(--fg-2);
		white-space: pre-line;
	}
	.uinfo + .bio {
		margin-top: 0;
	}
	.uhead:not(:has(.bio)) {
		padding-bottom: 24px;
	}
	.block + .block {
		margin-top: 48px;
	}
	.block h2 {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 16px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 20px;
	}
	.colls,
	.revs {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.colls {
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}
	.colls a {
		display: flex;
		gap: 12px;
		padding: 16px;
	}
	.colls a > span {
		display: grid;
	}
	.colls :global(svg) {
		width: 20px;
		height: 20px;
		color: var(--accent-fg);
		flex: none;
	}
	.rbody {
		margin-top: 8px;
		color: var(--fg-2);
		white-space: pre-line;
	}
</style>
