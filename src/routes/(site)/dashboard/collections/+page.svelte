<script lang="ts">
	import { enhance } from '$app/forms';
	import { Bookmark, CircleAlert, Globe, Link2, Lock } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { timeAgo } from '#lib/format.ts';

	let { data, form } = $props();
	const VIS = {
		public: { icon: Globe, label: 'Public' },
		unlisted: { icon: Link2, label: 'Unlisted' },
		private: { icon: Lock, label: 'Private' }
	} as const;
</script>

<Seo title="Collections" description="Your collections of projects." />

<header class="page-head">
	<div>
		<h1>Collections</h1>
		<p>Save projects into lists: public, shared by link, or just for you.</p>
	</div>
</header>

{#if form?.message}<p class="alert error spaced" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

<form method="POST" action="?/create" class="card panel" use:enhance>
	<header>
		<h2>{data.adding ? `New collection with ${data.adding.name}` : 'New collection'}</h2>
	</header>
	{#if data.adding}<input type="hidden" name="add" value={data.adding.id} />{/if}
	<div class="form-grid">
		<div class="form-grid two">
			<div class="field">
				<label for="name">Name</label><input
					class="input"
					id="name"
					name="name"
					required
					maxlength="64"
					placeholder="My survival setup"
				/>
			</div>
			<div class="field">
				<label for="visibility">Who can see it</label>
				<select class="select" id="visibility" name="visibility"
					><option value="public">Public: on your profile</option><option value="unlisted"
						>Unlisted: anyone with the link</option
					><option value="private">Private: only you</option></select
				>
			</div>
		</div>
		<div class="field">
			<label for="description">Description (optional)</label><input
				class="input"
				id="description"
				name="description"
				maxlength="500"
			/>
		</div>
	</div>
	<footer><button class="btn primary">Create collection</button></footer>
</form>

{#if data.collections.length}
	<ul class="list">
		{#each data.collections as c (c.id)}
			{@const v = VIS[c.visibility]}
			<li class="card">
				<a href="/dashboard/collections/{c.id}">
					<span class="icon"><Bookmark aria-hidden="true" /></span>
					<span class="text"
						><strong>{c.name}</strong><span class="muted small"
							>{c.size}
							{c.size === 1 ? 'project' : 'projects'} · updated {timeAgo(c.updatedAt)}</span
						></span
					>
					<span class="badge"><v.icon aria-hidden="true" />{v.label}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.spaced {
		margin-bottom: 16px;
	}
	.list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
		margin-top: 24px;
	}
	.list a {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 18px;
	}
	.list a:hover strong {
		color: var(--accent-fg);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--accent-bg);
		color: var(--accent-fg);
	}
	.icon :global(svg) {
		width: 20px;
		height: 20px;
	}
	.text {
		flex: 1;
		display: grid;
	}
</style>
