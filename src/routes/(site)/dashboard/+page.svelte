<script lang="ts">
	import { enhance } from '$app/forms';
	import { Download, Heart, PackagePlus, Rss, Star, UserPlus } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import ProjectIcon from '#lib/components/market/ProjectIcon.svelte';
	import StatusBadge from '#lib/components/market/StatusBadge.svelte';
	import { compact, timeAgo } from '#lib/format.ts';
	import { projectPath, typeInfo } from '#lib/marketplace/taxonomy.ts';

	let { data } = $props();
	const totals = $derived({
		downloads: data.projects.reduce((n, p) => n + p.downloads, 0),
		follows: data.projects.reduce((n, p) => n + p.follows, 0),
		reviews: data.projects.reduce((n, p) => n + p.ratingCount, 0)
	});
</script>

<Seo
	title="Dashboard"
	description="Your projects, invitations and updates from projects you follow."
/>

<header class="page-head">
	<div>
		<h1>Welcome back, {data.name}</h1>
		<p>Your projects and what’s new from the ones you follow.</p>
	</div>
	<a class="btn primary" href="/dashboard/projects/new"
		><PackagePlus aria-hidden="true" />New project</a
	>
</header>

{#if data.invites.length}
	<section class="card panel invites">
		<h2><UserPlus aria-hidden="true" />Team invitations</h2>
		{#each data.invites as invite (invite.id)}
			<div class="invite">
				<ProjectIcon name={invite.name} iconKey={invite.iconKey} size={40} />
				<span
					><strong>{invite.name}</strong><span class="muted small"
						>{typeInfo(invite.type).singular}</span
					></span
				>
				<form method="POST" action="?/invite" use:enhance class="row-gap">
					<input type="hidden" name="project" value={invite.id} />
					<button class="btn ghost sm" name="accept" value="0">Decline</button>
					<button class="btn primary sm" name="accept" value="1">Join the team</button>
				</form>
			</div>
		{/each}
	</section>
{/if}

<section class="stats">
	<div class="card stat">
		<span class="muted small">Projects</span><strong>{data.projects.length}</strong>
	</div>
	<div class="card stat">
		<span class="muted small"><Download aria-hidden="true" />Downloads</span><strong
			>{compact(totals.downloads)}</strong
		>
	</div>
	<div class="card stat">
		<span class="muted small"><Heart aria-hidden="true" />Followers</span><strong
			>{compact(totals.follows)}</strong
		>
	</div>
	<div class="card stat">
		<span class="muted small"><Star aria-hidden="true" />Reviews</span><strong
			>{compact(totals.reviews)}</strong
		>
	</div>
</section>

<section class="block">
	<h2>Your projects</h2>
	{#if data.projects.length}
		<div class="card table-wrap">
			<table class="table">
				<thead
					><tr
						><th>Project</th><th>Status</th><th>Downloads</th><th>Followers</th><th>Updated</th></tr
					></thead
				>
				<tbody>
					{#each data.projects as p (p.id)}
						<tr>
							<td>
								<a class="pname" href="/dashboard/projects/{p.id}">
									<ProjectIcon name={p.name} iconKey={p.iconKey} size={40} />
									<span
										><strong>{p.name}</strong><span class="tiny muted"
											>{typeInfo(p.type).singular} · {p.role === 'owner'
												? 'Owner'
												: 'Maintainer'}</span
										></span
									>
								</a>
							</td>
							<td><StatusBadge status={p.status} /></td>
							<td>{compact(p.downloads)}</td>
							<td>{compact(p.follows)}</td>
							<td>{timeAgo(p.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="card empty">
			<span class="empty-icon"><PackagePlus aria-hidden="true" /></span>
			<h3>Publish your first project</h3>
			<p>
				Shader packs, texture packs, mods and data packs. Moderators check new projects before they
				go public.
			</p>
			<a class="btn primary" href="/dashboard/projects/new">New project</a>
		</div>
	{/if}
</section>

<section class="block">
	<h2><Rss aria-hidden="true" />Updates from projects you follow</h2>
	{#if data.feed.length}
		<ul class="feed card">
			{#each data.feed as item (item.versionId)}
				<li>
					<ProjectIcon name={item.project.name} iconKey={item.project.iconKey} size={40} />
					<span class="feed-text">
						<a href="{projectPath(item.project.type, item.project.slug)}/version/{item.versionId}"
							><strong>{item.project.name}</strong> {item.versionName}</a
						>
						<span class="tiny muted"
							>{item.gameVersions.slice(0, 3).join(', ')}{item.gameVersions.length > 3 ? '…' : ''} · {timeAgo(
								item.publishedAt
							)}</span
						>
					</span>
					<span class="badge {item.channel === 'release' ? 'ok' : 'warn'}">{item.channel}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="card panel muted small">
			Follow projects on the <a class="link" href="/marketplace">marketplace</a> to see their new versions
			here.
		</p>
	{/if}
</section>

<style>
	.invites {
		margin-bottom: 24px;
		display: grid;
		gap: 12px;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 18px;
		line-height: 28px;
		font-weight: 600;
	}
	h2 :global(svg) {
		width: 20px;
		height: 20px;
		color: var(--fg-4);
	}
	.invite {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.invite > span {
		flex: 1;
		display: grid;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
		margin-bottom: 32px;
	}
	.stat {
		padding: 18px 20px;
		display: grid;
		gap: 6px;
	}
	.stat span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.stat :global(svg) {
		width: 15px;
		height: 15px;
	}
	.stat strong {
		font-size: 30px;
		line-height: 38px;
		font-weight: 600;
	}
	.block + .block {
		margin-top: 32px;
	}
	.block > h2 {
		margin-bottom: 12px;
	}
	.pname {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.pname > span {
		display: grid;
	}
	.pname:hover strong {
		color: var(--accent-fg);
	}
	.feed {
		list-style: none;
		padding: 4px 20px;
	}
	.feed li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
		border-top: 1px solid var(--line);
	}
	.feed li:first-child {
		border-top: 0;
	}
	.feed-text {
		flex: 1;
		display: grid;
	}
	.feed-text a:hover {
		color: var(--accent-fg);
	}
	@media (max-width: 720px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
