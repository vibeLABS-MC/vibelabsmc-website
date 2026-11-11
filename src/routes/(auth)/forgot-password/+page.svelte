<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, CircleAlert, KeyRound, MailCheck } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';

	let { data, form } = $props();
</script>

<Seo title="Reset your password" description="Get a link to choose a new vibeLABS password." />

{#if form && 'sent' in form}
	<AuthCard
		title="Check your email"
		subtitle="If an account uses {form.sent}, we sent it a link to choose a new password."
		icon={MailCheck}
	>
		<p class="muted small center">The link works once, for 30 minutes.</p>
		<a class="btn secondary lg block" href="/login"
			><ArrowLeft aria-hidden="true" />Back to sign in</a
		>
	</AuthCard>
{:else}
	<AuthCard
		title="Forgot your password?"
		subtitle="Enter the email on your account and we’ll send you a reset link."
		icon={KeyRound}
	>
		{#if data.emailEnabled}
			<form method="POST" class="form-grid" use:enhance>
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
					/>
				</div>
				<button class="btn primary lg block">Send reset link</button>
			</form>
		{:else}
			<p class="alert warn">Password resets need email, which isn’t set up yet.</p>
		{/if}
		{#snippet footer()}
			<a class="link" href="/login">Back to sign in</a>
		{/snippet}
	</AuthCard>
{/if}

<style>
	.center {
		text-align: center;
	}
</style>
