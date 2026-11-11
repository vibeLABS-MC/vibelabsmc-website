<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, KeyRound, MailX } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';
	import PasswordField from '#lib/components/auth/PasswordField.svelte';

	let { data, form } = $props();
	const token = $derived(form && 'token' in form ? form.token : data.token);
</script>

<Seo title="Choose a new password" description="Choose a new password for your vibeLABS account." />

{#if data.valid || (form && 'token' in form)}
	<AuthCard
		title="Choose a new password"
		subtitle="Every other device will be signed out."
		icon={KeyRound}
	>
		<form method="POST" class="form-grid" use:enhance>
			{#if form?.message}
				<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
			{/if}
			<input type="hidden" name="token" value={token} />
			<PasswordField
				id="password"
				label="New password"
				autocomplete="new-password"
				hint="At least 12 characters. A few random words work well."
			/>
			<button class="btn primary lg block">Save new password</button>
		</form>
	</AuthCard>
{:else}
	<AuthCard
		title="This link doesn’t work"
		subtitle={form?.message ?? 'It may have expired (links last 30 minutes) or already been used.'}
		icon={MailX}
	>
		<a class="btn primary lg block" href="/forgot-password">Send a new link</a>
	</AuthCard>
{/if}
