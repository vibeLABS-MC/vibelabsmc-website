<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, Flag } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { timeAgo } from '#lib/format.ts';
	import { projectPath } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	const REASONS: Record<string, string> = {
		malware: 'Malware or harmful code',
		stolen: 'Stolen or reuploaded',
		inappropriate: 'Inappropriate',
		spam: 'Spam or misleading',
		broken: 'Doesn’t work',
		harassment: 'Harassment or hate',
		other: 'Other'
	};
	const find = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id);
</script>

<Seo title="Reports" description="Reports from users." />

<div class="row-gap">
	<a class="btn {data.status === 'open' ? 'secondary active' : 'ghost'} sm" href="?">Open</a>
	<a class="btn {data.status !== 'open' ? 'secondary active' : 'ghost'} sm" href="?status=closed"
		>Resolved</a
	>
</div>
{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

{#if data.reports.length}
	{#each data.reports as { report, reporter } (report.id)}
		<article class="card panel rep">
			<header>
				<span class="badge {report.reason === 'malware' ? 'error' : 'warn'}"
					>{REASONS[report.reason] ?? report.reason}</span
				>
				<span class="badge">{report.targetType}</span>
				<span class="muted small"
					>by {reporter?.displayName ?? 'deleted user'} · {timeAgo(report.createdAt)}</span
				>
			</header>
			<div class="target">
				{#if report.targetType === 'project'}
					{@const p = find(data.targets.projects, report.targetId)}
					{#if p}<a class="link" href={projectPath(p.type, p.slug)} target="_blank" rel="noopener"
							>{p.name}</a
						>{:else}<span class="muted">deleted project</span>{/if}
				{:else if report.targetType === 'version'}
					{@const v = find(data.targets.versions, report.targetId)}
					{#if v}<a
							class="link"
							href="{projectPath(v.type, v.slug)}/version/{v.id}"
							target="_blank"
							rel="noopener">{v.name}</a
						>{:else}<span class="muted">deleted version</span>{/if}
				{:else if report.targetType === 'review'}
					{@const r = find(data.targets.reviews, report.targetId)}
					{#if r}
						<blockquote>
							“{r.body}”
							<span class="tiny muted"
								>on <a class="link" href="{projectPath(r.type, r.slug)}/reviews">{r.name}</a
								>{r.status === 'hidden' ? ' · hidden' : ''}</span
							>
						</blockquote>
						<form method="POST" action="?/hideReview" use:enhance>
							<input type="hidden" name="review" value={r.id} /><button class="btn secondary sm"
								>{r.status === 'visible' ? 'Hide review' : 'Show review again'}</button
							>
						</form>
					{:else}<span class="muted">deleted review</span>{/if}
				{:else if report.targetType === 'user'}
					{@const u = find(data.targets.users, report.targetId)}
					{#if u}<a class="link" href="/admin/users?q={u.username ?? u.id}">{u.displayName}</a>{/if}
				{:else}
					<span class="mono tiny">{report.targetId}</span>
				{/if}
			</div>
			{#if report.body}<p class="body">{report.body}</p>{/if}
			{#if report.status === 'open'}
				<form method="POST" action="?/close" class="close" use:enhance>
					<input type="hidden" name="id" value={report.id} />
					<input
						class="input"
						name="resolution"
						maxlength="1000"
						required
						placeholder="What you did (the reporter sees this if resolved)"
						aria-label="Resolution"
					/>
					<button class="btn secondary sm" name="status" value="dismissed">Dismiss</button>
					<button class="btn primary sm" name="status" value="resolved">Resolved</button>
				</form>
			{:else}
				<p class="muted small">{report.status}: {report.resolution}</p>
			{/if}
		</article>
	{/each}
{:else}
	<div class="card empty">
		<span class="empty-icon"><Flag aria-hidden="true" /></span>
		<h3>No {data.status === 'open' ? 'open ' : ''}reports</h3>
	</div>
{/if}

<style>
	.rep {
		display: grid;
		gap: 10px;
	}
	.rep header {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.target {
		display: grid;
		gap: 8px;
		justify-items: start;
	}
	blockquote {
		margin: 0;
		padding-left: 12px;
		border-left: 3px solid var(--line-strong);
		color: var(--fg-2);
	}
	.body {
		color: var(--fg-2);
		white-space: pre-line;
		font-size: 14px;
	}
	.close {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.close .input {
		flex: 1;
		min-width: 240px;
		padding: 6px 10px;
		font-size: 14px;
	}
</style>
