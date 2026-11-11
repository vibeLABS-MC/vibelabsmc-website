<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, Sparkles } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';

	let { data, form } = $props();
</script>

<Seo
	title="Choose your username"
	description="Pick the name people see on your projects and reviews."
/>

<AuthCard
	title="Choose your username"
	subtitle="It’s how people find your projects, reviews and collections."
	icon={Sparkles}
>
	<form method="POST" class="form-grid" use:enhance>
		{#if form?.message}
			<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
		{/if}
		<div class="field">
			<label for="username">Username</label>
			<div class="input-group">
				<span class="prefix">vibelabsmc.org/user/</span>
				<input
					class="input"
					id="username"
					name="username"
					required
					minlength="3"
					maxlength="24"
					pattern="[A-Za-z0-9_\-]+"
					autocomplete="username"
					value={form?.username ?? data.suggestion}
				/>
			</div>
			<p class="field-hint">
				3 to 24 letters, numbers, - or _. You can change it later in settings.
			</p>
		</div>
		<div class="field">
			<label for="displayName">Display name</label>
			<input
				class="input"
				id="displayName"
				name="displayName"
				maxlength="64"
				value={form?.displayName ?? data.displayName}
			/>
		</div>
		<button class="btn primary lg block">Continue</button>
	</form>
</AuthCard>
