<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Dialog, Popover } from 'bits-ui';
	import {
		BadgeCheck,
		Bookmark,
		BookOpen,
		Bug,
		CalendarClock,
		Check,
		Download,
		Flag,
		CodeXml,
		Heart,
		Link2,
		MessageCircle,
		Pencil,
		Plus,
		Scale,
		ShieldAlert,
		Star,
		X
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import DownloadDialog from '#lib/components/market/DownloadDialog.svelte';
	import ProjectIcon from '#lib/components/market/ProjectIcon.svelte';
	import { compact, shortDate, timeAgo } from '#lib/format.ts';
	import {
		licenseInfo,
		LOADER_NAMES,
		projectPath,
		type Loader
	} from '#lib/marketplace/taxonomy.ts';
	import { summariseVersions } from '#lib/marketplace/versions.ts';
	import { fits } from '#lib/marketplace/setup.ts';

	let { data, children } = $props();
	const project = $derived(data.project);
	const base = $derived(projectPath(project.type, project.slug));
	const rating = $derived(project.ratingCount ? project.ratingSum / project.ratingCount : 0);
	const owner = $derived(data.members.find((m) => m.role === 'owner'));
	const license = $derived(licenseInfo(project.license));
	const fit = $derived(fits(data.setup, project, data.info.loaders.length > 0));
	const tabs = $derived([
		{ href: base, label: 'Description' },
		{ href: `${base}/gallery`, label: 'Gallery', count: data.gallery.length },
		{ href: `${base}/versions`, label: 'Versions', count: data.versions.length },
		{ href: `${base}/changelog`, label: 'Changelog' },
		{ href: `${base}/reviews`, label: 'Reviews', count: project.ratingCount }
	]);
	const links = $derived(
		[
			{ href: project.sourceUrl, label: 'Source code', icon: CodeXml },
			{ href: project.issuesUrl, label: 'Report a bug', icon: Bug },
			{ href: project.wikiUrl, label: 'Wiki', icon: BookOpen },
			{ href: project.discordUrl, label: 'Discord', icon: MessageCircle }
		].filter((l) => l.href)
	);
	const STATUS: Record<string, { tone: string; text: string }> = {
		draft: { tone: 'warn', text: 'Draft: only your team and moderators can see this page.' },
		in_review: {
			tone: '',
			text: 'Waiting for a moderator. Only your team and moderators can see this page.'
		},
		rejected: { tone: 'error', text: 'Rejected by a moderator.' },
		withheld: {
			tone: 'error',
			text: 'Withheld by a moderator: hidden from everyone else until it’s fixed.'
		}
	};
	let copied = $state(false);
	async function share() {
		const url = new URL(base, page.url.origin).href;
		if (navigator.share) await navigator.share({ title: project.name, url }).catch(() => {});
		else {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
	let reportOpen = $state(false);
	const reported = $derived(page.form && 'reported' in page.form);
</script>

<Seo
	title={project.name}
	description={project.summary ||
		`${project.name}, a ${data.info.singular.toLowerCase()} on vibeLABS.`}
/>

<main id="main" class="container page project">
	{#if project.status !== 'approved'}
		<div class="alert {STATUS[project.status]?.tone} status" role="status">
			<ShieldAlert aria-hidden="true" />
			<div>
				<strong>{STATUS[project.status]?.text}</strong>
				{#if project.moderationMessage}<p>Moderator’s note: {project.moderationMessage}</p>{/if}
			</div>
			{#if data.role}<a class="btn secondary sm" href="/dashboard/projects/{project.id}"
					>Open in dashboard</a
				>{/if}
		</div>
	{/if}

	<header class="phead">
		<ProjectIcon name={project.name} iconKey={project.iconKey} size={96} />
		<div class="ptitle">
			<p class="eyebrow"><a href="/marketplace/{data.info.path}">{data.info.singular}</a></p>
			<h1>{project.name}</h1>
			<p class="summary">{project.summary}</p>
			<div class="pstats">
				<span
					><Download aria-hidden="true" /><strong>{compact(project.downloads)}</strong> downloads</span
				>
				<span
					><Heart aria-hidden="true" /><strong>{compact(project.follows)}</strong> followers</span
				>
				{#if project.ratingCount}<a href="{base}/reviews"
						><Star class="star" aria-hidden="true" /><strong>{rating.toFixed(1)}</strong>
						({project.ratingCount})</a
					>{/if}
				<span
					><CalendarClock aria-hidden="true" />Updated {timeAgo(
						project.latestVersionAt ?? project.updatedAt
					)}</span
				>
				{#if fit === 'yes'}<span class="badge ok"
						><BadgeCheck aria-hidden="true" />Works with your setup</span
					>{:else if fit === 'no'}<span class="badge warn">Not for your setup</span>{/if}
			</div>
		</div>
		<div class="pactions">
			<DownloadDialog
				versions={data.versions.filter((v) => v.status === 'listed')}
				loaders={data.info.loaders}
				setup={data.setup}
				projectName={project.name}
				versionsHref="{base}/versions"
			/>
			<div class="row-gap">
				{#if data.signedIn}
					<form method="POST" action="{base}?/follow" use:enhance>
						<input type="hidden" name="on" value={data.following ? '0' : '1'} />
						<button
							class="btn secondary {data.following ? 'active' : ''}"
							aria-pressed={data.following}
							><Heart aria-hidden="true" />{data.following ? 'Following' : 'Follow'}</button
						>
					</form>
					<Popover.Root>
						<Popover.Trigger class="btn secondary" aria-label="Save to a collection"
							><Bookmark aria-hidden="true" /></Popover.Trigger
						>
						<Popover.Portal>
							<Popover.Content class="popover collect-pop" align="end" sideOffset={8}>
								<p class="collect-title">Save to a collection</p>
								{#each data.collections as c (c.id)}
									<form method="POST" action="{base}?/collect" use:enhance>
										<input type="hidden" name="collection" value={c.id} />
										<input type="hidden" name="on" value={c.contains ? '0' : '1'} />
										<button class="menu-item"
											>{#if c.contains}<Check aria-hidden="true" />{:else}<Plus
													aria-hidden="true"
												/>{/if}{c.name}</button
										>
									</form>
								{:else}
									<p class="muted small">You have no collections yet.</p>
								{/each}
								<a class="btn secondary sm block" href="/dashboard/collections?add={project.id}"
									>New collection</a
								>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				{:else}
					<a class="btn secondary" href="/login?next={encodeURIComponent(base)}"
						><Heart aria-hidden="true" />Follow</a
					>
				{/if}
				<button type="button" class="btn secondary" aria-label="Share" onclick={share}
					>{#if copied}<Check aria-hidden="true" />{:else}<Link2 aria-hidden="true" />{/if}</button
				>
				{#if data.role}
					<a class="btn secondary" href="/dashboard/projects/{project.id}" aria-label="Edit project"
						><Pencil aria-hidden="true" /></a
					>
				{:else if data.signedIn}
					<Dialog.Root bind:open={reportOpen}>
						<Dialog.Trigger class="btn ghost" aria-label="Report"
							><Flag aria-hidden="true" /></Dialog.Trigger
						>
						<Dialog.Portal>
							<Dialog.Overlay class="dialog-overlay" />
							<Dialog.Content class="dialog">
								<Dialog.Title>Report {project.name}</Dialog.Title>
								<Dialog.Description class="dialog-desc"
									>Moderators read every report. Abuse of reports can get an account suspended.</Dialog.Description
								>
								<Dialog.Close class="btn ghost dialog-close" aria-label="Close"
									><X aria-hidden="true" /></Dialog.Close
								>
								{#if reported}
									<p class="alert ok dialog-body">Thanks: the report is with the moderators.</p>
								{:else}
									<form
										method="POST"
										action="{base}?/report"
										class="form-grid dialog-body"
										use:enhance
									>
										<input type="hidden" name="target" value="project" />
										<input type="hidden" name="id" value={project.id} />
										<div class="field">
											<label for="reason">Reason</label>
											<select class="select" id="reason" name="reason" required>
												<option value="malware">Malware or harmful code</option>
												<option value="stolen">Stolen or reuploaded work</option>
												<option value="inappropriate">Inappropriate content</option>
												<option value="spam">Spam or misleading</option>
												<option value="broken">Does not work as described</option>
												<option value="other">Something else</option>
											</select>
										</div>
										<div class="field">
											<label for="details">Details</label>
											<textarea
												class="textarea"
												id="details"
												name="body"
												maxlength="2000"
												placeholder="Links to the original, what you saw, which version…"
											></textarea>
										</div>
										<div class="dialog-actions">
											<button class="btn danger">Send report</button>
										</div>
									</form>
								{/if}
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>
				{/if}
			</div>
		</div>
	</header>

	<nav class="tabs" aria-label="Project">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				aria-current={page.url.pathname === tab.href ? 'page' : undefined}
				data-sveltekit-noscroll
				>{tab.label}{#if tab.count}<span class="badge">{tab.count}</span>{/if}</a
			>
		{/each}
	</nav>

	<div class="pbody">
		<div class="pmain">{@render children()}</div>
		<aside class="pside">
			<section class="card panel side-block">
				<h2>Compatibility</h2>
				<dl>
					<dt>Minecraft</dt>
					<dd>
						{summariseVersions(project.gameVersions, data.knownVersions) || 'No versions yet'}
					</dd>
					{#if data.info.loaders.length}
						<dt>Loaders</dt>
						<dd class="row-gap">
							{#each project.loaders as l (l)}<span class="badge accent"
									>{LOADER_NAMES[l as Loader] ?? l}</span
								>{:else}<span class="muted">None yet</span>{/each}
						</dd>
					{/if}
				</dl>
			</section>
			{#if project.categories.length}
				<section class="card panel side-block">
					<h2>Tags</h2>
					<div class="row-gap">
						{#each project.categories as c (c)}<a
								class="badge"
								href="/marketplace/{data.info.path}?c={c}">{data.categoryNames[c] ?? c}</a
							>{/each}
					</div>
				</section>
			{/if}
			{#if links.length}
				<section class="card panel side-block">
					<h2>Links</h2>
					<ul class="plinks">
						{#each links as link (link.label)}<li>
								<a href={link.href} rel="nofollow ugc noopener noreferrer" target="_blank"
									><link.icon aria-hidden="true" />{link.label}</a
								>
							</li>{/each}
					</ul>
				</section>
			{/if}
			<section class="card panel side-block">
				<h2>Creators</h2>
				<ul class="creators">
					{#each data.members as m (m.userId)}
						<li>
							<Avatar name={m.displayName} imageKey={m.avatarKey} size={32} />
							<span
								>{#if m.username}<a href="/user/{m.username}">{m.displayName}</a
									>{:else}{m.displayName}{/if}<span class="muted tiny"
									>{m.role === 'owner' ? 'Owner' : 'Maintainer'}</span
								></span
							>
						</li>
					{/each}
				</ul>
			</section>
			<section class="card panel side-block">
				<h2>Details</h2>
				<dl>
					<dt><Scale aria-hidden="true" />Licence</dt>
					<dd>
						{#if project.licenseUrl}<a
								class="link"
								href={project.licenseUrl}
								rel="nofollow noopener noreferrer"
								target="_blank">{license?.name ?? project.license}</a
							>{:else}{license?.name ?? (project.license || 'Not set')}{/if}
					</dd>
					{#if project.publishedAt}<dt>Published</dt>
						<dd>{shortDate(project.publishedAt)}</dd>{/if}
					<dt>Updated</dt>
					<dd>{shortDate(project.latestVersionAt ?? project.updatedAt)}</dd>
					<dt>Project ID</dt>
					<dd class="mono tiny">{project.id}</dd>
				</dl>
			</section>
			{#if owner}<p class="muted tiny side-note">
					Owned by {owner.displayName}. Not affiliated with Mojang or Microsoft.
				</p>{/if}
		</aside>
	</div>
</main>

<style>
	.status {
		margin-bottom: 24px;
		align-items: center;
	}
	.status div {
		flex: 1;
	}
	.phead {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 24px;
		align-items: start;
		margin-bottom: 24px;
	}
	.eyebrow a:hover {
		text-decoration: underline;
	}
	h1 {
		font-size: 36px;
		line-height: 44px;
		letter-spacing: -0.02em;
		font-weight: 600;
		margin: 2px 0 6px;
	}
	.summary {
		color: var(--fg-3);
		font-size: 17px;
		line-height: 26px;
		max-width: 680px;
	}
	.pstats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 18px;
		margin-top: 14px;
		font-size: 14px;
		color: var(--fg-3);
	}
	.pstats > span,
	.pstats > a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.pstats strong {
		color: var(--fg);
	}
	.pstats :global(svg) {
		width: 16px;
		height: 16px;
		color: var(--fg-4);
	}
	.pstats :global(.star) {
		color: var(--star);
		fill: var(--star);
	}
	.pactions {
		display: grid;
		gap: 10px;
		justify-items: end;
	}
	.pactions :global(.btn.primary.lg) {
		min-width: 200px;
	}
	.pbody {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: 32px;
		margin-top: 28px;
		align-items: start;
	}
	.pside {
		display: grid;
		gap: 16px;
	}
	.side-block {
		padding: 18px 20px;
	}
	.side-block h2 {
		font-size: 14px;
		line-height: 20px;
		margin-bottom: 12px;
		color: var(--fg);
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px 16px;
		margin: 0;
		font-size: 14px;
		line-height: 20px;
	}
	dt {
		color: var(--fg-4);
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	dt :global(svg) {
		width: 14px;
		height: 14px;
	}
	dd {
		margin: 0;
		color: var(--fg-2);
		text-align: right;
		overflow-wrap: anywhere;
	}
	dd.row-gap {
		justify-content: flex-end;
	}
	.plinks,
	.creators {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
		font-size: 14px;
	}
	.plinks a {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--fg-2);
		font-weight: 500;
	}
	.plinks a:hover {
		color: var(--accent-fg);
	}
	.plinks :global(svg) {
		width: 16px;
		height: 16px;
		color: var(--fg-4);
	}
	.creators li {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.creators li > span {
		display: grid;
	}
	.creators a {
		font-weight: 600;
	}
	.side-note {
		padding: 0 4px;
	}
	@media (max-width: 1024px) {
		.phead {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.pactions {
			grid-column: 1 / -1;
			justify-items: start;
		}
		.pbody {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 640px) {
		.phead {
			grid-template-columns: 1fr;
		}
		h1 {
			font-size: 28px;
			line-height: 36px;
		}
	}
</style>
