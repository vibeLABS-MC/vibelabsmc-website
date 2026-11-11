<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';
	import PasswordField from '#lib/components/auth/PasswordField.svelte';
	import ProviderButtons from '#lib/components/auth/ProviderButtons.svelte';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<Seo
	title="Sign in"
	description="Sign in to vibeLABS with GitHub, Discord or your email address."
/>

<AuthCard title="Welcome back" subtitle="Sign in to your vibeLABS account.">
	{#if data.notice}
		<p class="alert ok" role="status"><CircleCheck aria-hidden="true" />{data.notice}</p>
	{/if}
	{#if data.error}
		<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{data.error}</p>
	{/if}

	<ProviderButtons providers={data.providers} next={data.next} />

	{#if data.emailEnabled}
		{#if data.providers.length}<p class="divider">or</p>{/if}
		<form
			method="POST"
			class="form-grid"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			{#if form?.message}
				<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
			{/if}
			<div class="field">
				<label for="email">Email</label>
				<input
					class="input"
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					maxlength="254"
					value={form?.email ?? ''}
					placeholder="you@example.com"
				/>
			</div>
			<PasswordField id="password" />
			<p class="forgot"><a class="link small" href="/forgot-password">Forgot password?</a></p>
			<button class="btn primary lg block" disabled={busy}
				>{busy ? 'Signing in…' : 'Sign in'}</button
			>
		</form>
	{/if}

	{#snippet footer()}
		Don’t have an account? <a class="link" href="/signup?next={encodeURIComponent(data.next)}"
			>Sign up</a
		>
	{/snippet}
</AuthCard>

<style>
	.forgot {
		margin-top: -8px;
		text-align: right;
	}
</style>
