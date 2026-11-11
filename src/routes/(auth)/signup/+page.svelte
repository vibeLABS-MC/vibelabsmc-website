<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, MailCheck } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';
	import PasswordField from '#lib/components/auth/PasswordField.svelte';
	import ProviderButtons from '#lib/components/auth/ProviderButtons.svelte';

	let { data, form } = $props();
	let busy = $state(false);
	const errors = $derived<Record<string, string>>(
		form && 'errors' in form ? (form.errors ?? {}) : {}
	);
	const values = $derived(form && 'username' in form ? form : { username: '', email: '' });
</script>

<Seo
	title="Create an account"
	description="Join vibeLABS to publish shaderpacks, texture packs, mods and data packs, follow projects and write reviews."
/>

{#if form && 'sent' in form && form.sent}
	<AuthCard
		title="Check your email"
		subtitle="We sent a confirmation link to {form.sent}."
		icon={MailCheck}
	>
		<p class="muted small center">
			Open the link within 30 minutes to finish creating your account. Nothing there? Check your
			spam folder, or sign up again to get a new link.
		</p>
		<a class="btn secondary lg block" href="/login">Back to sign in</a>
	</AuthCard>
{:else}
	<AuthCard title="Create an account" subtitle="Publish, follow and review Minecraft projects.">
		<ProviderButtons providers={data.providers} next={data.next} verb="Sign up" />

		{#if data.emailEnabled}
			{#if data.providers.length}<p class="divider">or with email</p>{/if}
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
				{#if form && 'message' in form && form.message}
					<p class="alert error" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
				{/if}
				<div class="field">
					<label for="username">Username</label>
					<input
						class="input"
						id="username"
						name="username"
						autocomplete="username"
						required
						minlength="3"
						maxlength="24"
						pattern="[A-Za-z0-9_\-]+"
						value={values.username}
						aria-invalid={errors.username ? 'true' : undefined}
					/>
					{#if errors.username}<p class="field-error">{errors.username}</p>
					{:else}<p class="field-hint">Your public name: vibelabsmc.org/user/name</p>{/if}
				</div>
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
						value={values.email}
						aria-invalid={errors.email ? 'true' : undefined}
					/>
					{#if errors.email}<p class="field-error">{errors.email}</p>{/if}
				</div>
				<PasswordField
					id="password"
					autocomplete="new-password"
					error={errors.password}
					hint="At least 12 characters. A few random words work well."
				/>
				<label class="check">
					<input type="checkbox" name="terms" required />
					<span
						>I agree to the <a class="link" href="/legal/terms" target="_blank">terms</a> and the
						<a class="link" href="/legal/content-rules" target="_blank">content rules</a>.</span
					>
				</label>
				{#if errors.terms}<p class="field-error">{errors.terms}</p>{/if}
				<button class="btn primary lg block" disabled={busy}
					>{busy ? 'Creating your account…' : 'Create account'}</button
				>
			</form>
		{:else}
			<p class="alert warn">
				{data.providers.length
					? 'Email sign-up isn’t available yet. Use GitHub or Discord.'
					: 'Creating accounts isn’t switched on yet on this server. Please check back soon.'}
			</p>
		{/if}

		{#snippet footer()}
			Already have an account? <a class="link" href="/login?next={encodeURIComponent(data.next)}"
				>Sign in</a
			>
		{/snippet}
	</AuthCard>
{/if}

<style>
	.center {
		text-align: center;
	}
</style>
