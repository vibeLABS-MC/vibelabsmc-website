<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, LockKeyhole } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';
	import PasswordField from '#lib/components/auth/PasswordField.svelte';
	import BrandIcon from '#lib/components/BrandIcon.svelte';

	let { data, form } = $props();
	const names = { github: 'GitHub', discord: 'Discord' } as const;
	const message = $derived(form?.message ?? data.error);
</script>

<Seo title="Confirm it’s you" description="Confirm your identity before a sensitive change." />

<AuthCard
	title="Confirm it’s you"
	subtitle="This change needs a fresh check. It lasts 10 minutes."
	icon={LockKeyhole}
>
	{#if message}
		<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{message}</p>
	{/if}

	{#if data.totp}
		<form
			method="POST"
			action="?/code&next={encodeURIComponent(data.next)}"
			class="form-grid"
			use:enhance
		>
			<div class="field">
				<label for="code">Code from your authenticator app</label>
				<input
					class="input code"
					id="code"
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					required
					maxlength="14"
					placeholder="000000"
				/>
			</div>
			<button class="btn primary lg block">Confirm</button>
		</form>
	{/if}

	{#if data.password}
		{#if data.totp}<p class="divider">or</p>{/if}
		<form
			method="POST"
			action="?/password&next={encodeURIComponent(data.next)}"
			class="form-grid"
			use:enhance
		>
			<PasswordField id="password" />
			<button class="btn {data.totp ? 'secondary' : 'primary'} lg block"
				>Confirm with password</button
			>
		</form>
	{/if}

	{#if data.providers.length}
		{#if data.totp || data.password}<p class="divider">or</p>{/if}
		<div class="form-grid">
			{#each data.providers as provider (provider)}
				<a
					class="btn secondary lg block"
					href="/auth/{provider}?mode=confirm&next={encodeURIComponent(data.next)}"
					data-sveltekit-reload><BrandIcon name={provider} />Confirm with {names[provider]}</a
				>
			{/each}
		</div>
	{/if}

	{#snippet footer()}
		<a class="link" href={data.next}>Cancel</a>
	{/snippet}
</AuthCard>
