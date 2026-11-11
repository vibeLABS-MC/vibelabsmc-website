<script lang="ts">
	import { enhance } from '$app/forms';
	import { RatingGroup } from 'bits-ui';
	import { CircleAlert, CornerDownRight, Flag, MessageSquareText, Star } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Stars from '#lib/components/market/Stars.svelte';
	import { timeAgo } from '#lib/format.ts';
	import { projectPath } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	const project = $derived(data.project);
	const base = $derived(projectPath(project.type, project.slug));
	const average = $derived(project.ratingCount ? project.ratingSum / project.ratingCount : 0);
	const max = $derived(Math.max(1, ...Object.values(data.histogram)));
	let rating = $state(0);
	let editing = $state(false);
	$effect(() => {
		rating = data.mine?.rating ?? 0;
	});
	const canWrite = $derived(data.signedIn && !data.role && project.status === 'approved');
	const message = $derived(form && 'message' in form ? form.message : null);
</script>

<div class="reviews">
	<section class="card panel summary">
		<div class="avg">
			<strong>{project.ratingCount ? average.toFixed(1) : '–'}</strong>
			<Stars value={average} />
			<span class="muted small"
				>{project.ratingCount} {project.ratingCount === 1 ? 'review' : 'reviews'}</span
			>
		</div>
		<ul class="bars">
			{#each [5, 4, 3, 2, 1] as n (n)}
				{@const value = data.histogram[n as 1]}
				<li>
					<span>{n}<Star aria-hidden="true" /></span>
					<meter min="0" {max} {value} aria-label="{value} reviews with {n} stars"></meter>
					<span class="muted">{value}</span>
				</li>
			{/each}
		</ul>
	</section>

	{#if message}<p class="alert error" role="alert">
			<CircleAlert aria-hidden="true" />{message}
		</p>{/if}

	{#if canWrite && (!data.mine || editing)}
		<form
			method="POST"
			action="?/save"
			class="card panel write"
			use:enhance={() =>
				async ({ update }) => {
					await update({ reset: false });
					editing = false;
				}}
		>
			<h2>{data.mine ? 'Edit your review' : 'Write a review'}</h2>
			<div class="field">
				<span class="label" id="rating-label">Your rating</span>
				<RatingGroup.Root class="rate" bind:value={rating} max={5} aria-labelledby="rating-label">
					{#snippet children({ items })}
						{#each items as item (item.index)}
							<RatingGroup.Item
								index={item.index}
								class="rate-star {item.state === 'active' ? 'on' : ''}"
								><Star aria-hidden="true" /></RatingGroup.Item
							>
						{/each}
					{/snippet}
				</RatingGroup.Root>
				<input type="hidden" name="rating" value={rating} />
			</div>
			<div class="field">
				<label for="body">Your review</label>
				<textarea
					class="textarea"
					id="body"
					name="body"
					minlength="10"
					maxlength="4000"
					required
					placeholder="What works well? What could be better? Which version and setup did you use?"
					>{data.mine?.body ?? ''}</textarea
				>
			</div>
			<div class="row-gap">
				<button class="btn primary" disabled={!rating}>Post review</button>{#if editing}<button
						type="button"
						class="btn ghost"
						onclick={() => (editing = false)}>Cancel</button
					>{/if}
			</div>
		</form>
	{:else if !data.signedIn}
		<p class="card panel muted small">
			<a class="link" href="/login?next={encodeURIComponent(`${base}/reviews`)}">Sign in</a> to write
			a review.
		</p>
	{/if}

	{#if data.reviews.length}
		<ul class="list">
			{#each data.reviews as { review, author } (review.id)}
				<li class="card panel item">
					<header>
						<Avatar name={author.displayName} imageKey={author.avatarKey} size={40} />
						<div>
							<strong
								>{#if author.username}<a href="/user/{author.username}">{author.displayName}</a
									>{:else}{author.displayName}{/if}</strong
							>
							<span class="row-gap tiny muted"
								><Stars value={review.rating} label={false} />{timeAgo(
									review.createdAt
								)}{review.updatedAt > review.createdAt ? ' · edited' : ''}</span
							>
						</div>
						{#if data.mine?.id === review.id}
							<div class="own">
								<button type="button" class="btn ghost sm" onclick={() => (editing = true)}
									>Edit</button
								>
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={review.id} /><button class="btn ghost sm"
										>Delete</button
									>
								</form>
							</div>
						{:else if data.signedIn}
							<form class="own" method="POST" action="{base}?/report" use:enhance>
								<input type="hidden" name="target" value="review" /><input
									type="hidden"
									name="id"
									value={review.id}
								/><input type="hidden" name="reason" value="inappropriate" />
								<button
									class="btn ghost sm"
									title="Report this review"
									aria-label="Report this review"><Flag aria-hidden="true" /></button
								>
							</form>
						{/if}
					</header>
					<p class="body">{review.body}</p>
					{#if review.ownerReply}
						<div class="reply">
							<CornerDownRight aria-hidden="true" />
							<div>
								<strong class="small">Reply from the team</strong>
								<p>{review.ownerReply}</p>
							</div>
						</div>
					{/if}
					{#if data.role}
						<form
							method="POST"
							action="?/reply"
							class="reply-form"
							use:enhance={() =>
								async ({ update }) =>
									update({ reset: false })}
						>
							<input type="hidden" name="id" value={review.id} />
							<input
								class="input"
								name="reply"
								maxlength="2000"
								value={review.ownerReply ?? ''}
								placeholder="Reply as the project team"
								aria-label="Reply"
							/>
							<button class="btn secondary sm"
								>{review.ownerReply ? 'Update reply' : 'Reply'}</button
							>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		<nav class="pager">
			{#if data.page > 1}<a class="btn secondary" href="?page={data.page - 1}">Newer</a>{:else}<span
				></span>{/if}
			{#if data.reviews.length === 10}<a class="btn secondary" href="?page={data.page + 1}">Older</a
				>{/if}
		</nav>
	{:else}
		<div class="card empty">
			<span class="empty-icon"><MessageSquareText aria-hidden="true" /></span>
			<h3>No reviews yet</h3>
			<p>Tried it? Tell others how it went.</p>
		</div>
	{/if}
</div>

<style>
	.reviews {
		display: grid;
		gap: 16px;
	}
	.summary {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: 32px;
		align-items: center;
	}
	.avg {
		display: grid;
		justify-items: center;
		gap: 6px;
	}
	.avg strong {
		font-size: 48px;
		line-height: 56px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.bars {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.bars li {
		display: grid;
		grid-template-columns: 36px 1fr 32px;
		align-items: center;
		gap: 10px;
		font-size: 14px;
	}
	.bars li > span:first-child {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-weight: 600;
	}
	.bars :global(svg) {
		width: 13px;
		height: 13px;
		color: var(--star);
		fill: var(--star);
	}
	meter {
		width: 100%;
		height: 8px;
		appearance: none;
		border-radius: 999px;
		background: var(--bg-muted);
		overflow: hidden;
	}
	meter::-webkit-meter-bar {
		background: var(--bg-muted);
		border: 0;
		border-radius: 999px;
		height: 8px;
	}
	meter::-webkit-meter-optimum-value,
	meter::-webkit-meter-suboptimum-value,
	meter::-webkit-meter-even-less-good-value {
		background: var(--star);
		border-radius: 999px;
	}
	meter::-moz-meter-bar {
		background: var(--star);
		border-radius: 999px;
	}
	.write {
		display: grid;
		gap: 16px;
	}
	.write :global(.rate) {
		display: flex;
		gap: 4px;
	}
	.write :global(.rate-star) {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		color: var(--line-strong);
		cursor: pointer;
	}
	.write :global(.rate-star svg) {
		width: 28px;
		height: 28px;
	}
	.write :global(.rate-star.on) {
		color: var(--star);
	}
	.write :global(.rate-star.on svg) {
		fill: var(--star);
	}
	.list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 12px;
	}
	.item header {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.item header > div:nth-child(2) {
		flex: 1;
		display: grid;
		gap: 2px;
	}
	.own {
		display: flex;
		gap: 4px;
	}
	.body {
		margin-top: 12px;
		color: var(--fg-2);
		white-space: pre-line;
	}
	.reply {
		display: flex;
		gap: 10px;
		margin-top: 12px;
		padding: 12px 14px;
		border-radius: 10px;
		background: var(--bg-subtle);
	}
	.reply > :global(svg) {
		width: 18px;
		height: 18px;
		color: var(--fg-4);
		flex: none;
	}
	.reply p {
		color: var(--fg-2);
		white-space: pre-line;
	}
	.reply-form {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	.reply-form .input {
		padding-block: 6px;
		font-size: 14px;
	}
	@media (max-width: 640px) {
		.summary {
			grid-template-columns: 1fr;
		}
	}
</style>
