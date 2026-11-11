<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, ShieldCheck } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';

	let { form } = $props();
	let recovery = $state(false);
</script>

<Seo title="Two-factor check" description="Enter the code from your authenticator app." />

<AuthCard
	title="Two-factor check"
	subtitle={recovery
		? 'Enter one of the recovery codes you saved when you set up two-factor sign-in.'
		: 'Enter the 6-digit code from your authenticator app.'}
	icon={ShieldCheck}
>
	<form method="POST" action="?/verify" class="form-grid" use:enhance>
		{#if form?.message}
			<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
		{/if}
		<div class="field">
			<label for="code">{recovery ? 'Recovery code' : 'Authentication code'}</label>
			{#if recovery}
				<input
					class="input code"
					id="code"
					name="code"
					autocomplete="off"
					required
					maxlength="14"
					placeholder="xxxx-xxxx-xx"
				/>
			{:else}
				<input
					class="input code"
					id="code"
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					pattern="[0-9 ]*"
					required
					maxlength="7"
					placeholder="000000"
				/>
			{/if}
		</div>
		<button class="btn primary lg block">Continue</button>
	</form>
	<button type="button" class="btn ghost block small" onclick={() => (recovery = !recovery)}>
		{recovery ? 'Use the authenticator app instead' : 'Lost your phone? Use a recovery code'}
	</button>

	{#snippet footer()}
		<form method="POST" action="?/cancel">
			<button class="btn ghost small">Cancel and sign out</button>
		</form>
	{/snippet}
</AuthCard>
