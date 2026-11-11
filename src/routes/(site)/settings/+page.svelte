<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, Upload } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Seo from '#lib/components/Seo.svelte';

	let { data, form } = $props();
	let preview = $state<string | null>(null);

	function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const chosen = input.files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = chosen ? URL.createObjectURL(chosen) : null;
	}
</script>

<Seo title="Profile settings" description="Your public vibeLABS profile." />

<section class="card panel">
	<header>
		<h2>Profile picture</h2>
		<p>Shown next to your projects, reviews and comments. PNG, JPEG, WebP or GIF, up to 8 MB.</p>
	</header>
	{#if form?.section === 'avatar' && form.message}
		<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
	{/if}
	<div class="avatar-row">
		{#if preview}
			<span class="avatar size-96"><img src={preview} alt="" /></span>
		{:else}
			<Avatar name={data.profile.displayName} imageKey={data.profile.avatarKey} size={96} />
		{/if}
		<form
			method="POST"
			action="?/avatar"
			enctype="multipart/form-data"
			class="row-gap"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					preview = null;
				}}
		>
			<label class="btn secondary">
				<Upload aria-hidden="true" />Choose image
				<input
					class="sr-only"
					type="file"
					name="avatar"
					accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
					onchange={pick}
				/>
			</label>
			<button class="btn primary" disabled={!preview}>Upload</button>
		</form>
		{#if data.profile.avatarKey}
			<form method="POST" action="?/removeAvatar" use:enhance>
				<button class="btn ghost">Remove</button>
			</form>
		{/if}
	</div>
</section>

<form
	method="POST"
	action="?/profile"
	class="card panel"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	<header>
		<h2>Public profile</h2>
		<p>Anyone can see this on your profile page.</p>
	</header>
	{#if form?.section === 'profile' && form.message}
		<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
	{:else if form?.section === 'profile' && form.saved}
		<p class="alert ok" role="status"><CircleCheck aria-hidden="true" />Profile saved.</p>
	{/if}
	<div class="form-grid">
		<div class="form-grid two">
			<div class="field">
				<label for="displayName">Display name</label>
				<input
					class="input"
					id="displayName"
					name="displayName"
					required
					maxlength="64"
					value={data.profile.displayName}
				/>
			</div>
			<div class="field">
				<label for="username">Username</label>
				<div class="input-group">
					<span class="prefix">/user/</span>
					<input
						class="input"
						id="username"
						name="username"
						required
						minlength="3"
						maxlength="24"
						pattern="[A-Za-z0-9_\-]+"
						value={data.profile.username ?? ''}
					/>
				</div>
				<p class="field-hint">Changing it changes your profile address.</p>
			</div>
		</div>
		<div class="field">
			<label for="bio">Bio</label>
			<textarea
				class="textarea"
				id="bio"
				name="bio"
				maxlength="500"
				rows="4"
				placeholder="What do you make or play?">{data.profile.bio}</textarea
			>
			<p class="field-hint">Up to 500 characters. Plain text.</p>
		</div>
	</div>
	<footer>
		{#if data.profile.username}<a class="btn ghost" href="/user/{data.profile.username}"
				>View profile</a
			>{/if}
		<button class="btn primary">Save changes</button>
	</footer>
</form>

<style>
	.avatar-row {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
	}
	.avatar-row :global(.sr-only) {
		position: absolute;
	}
</style>
