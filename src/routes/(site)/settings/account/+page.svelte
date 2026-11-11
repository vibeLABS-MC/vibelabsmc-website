<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, Download, Mail } from '@lucide/svelte';
	import BrandIcon from '#lib/components/BrandIcon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import SudoNote from '#lib/components/SudoNote.svelte';
	import PasswordField from '#lib/components/auth/PasswordField.svelte';

	let { data, form } = $props();
	const names = { github: 'GitHub', discord: 'Discord' } as const;
	const linked = $derived(new Map(data.methods.providers.map((p) => [p.provider, p.username])));
	const methodCount = $derived(data.methods.providers.length + (data.methods.password ? 1 : 0));
	let confirmText = $state('');
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<Seo title="Account settings" description="Email, password and sign-in methods." />

{#if data.notice}
	<p class="alert {data.notice.tone} spaced" role="status">
		{#if data.notice.tone === 'ok'}<CircleCheck aria-hidden="true" />{:else}<CircleAlert
				aria-hidden="true"
			/>{/if}{data.notice.text}
	</p>
{/if}
{#if !data.sudo}<div class="spaced"><SudoNote href="/settings/account" /></div>{/if}

<section class="card panel">
	<header>
		<h2>Email address</h2>
		<p>Used for password resets and security notices. Never shown publicly.</p>
	</header>
	{#if form?.section === 'email' && form.message}
		<p class="alert error spaced" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
	{:else if form?.section === 'email' && form.sent}
		<p class="alert ok spaced" role="status">
			<Mail aria-hidden="true" />We sent a confirmation link to {form.sent}. It lasts 30 minutes.
		</p>
	{/if}
	<div class="current">
		{#if data.email}
			<strong>{data.email}</strong>
			<span class="badge {data.emailVerified ? 'ok' : 'warn'}"
				>{data.emailVerified ? 'Confirmed' : 'Not confirmed'}</span
			>
		{:else}
			<span class="muted">No email address yet.</span>
		{/if}
	</div>
	{#if data.pendingEmail}<p class="field-hint">
			Waiting for you to confirm {data.pendingEmail}.
		</p>{/if}
	{#if data.emailEnabled}
		<form method="POST" action="?/email" class="inline-form" use:enhance={keep}>
			<input
				class="input"
				type="email"
				name="email"
				required
				maxlength="254"
				placeholder={data.email ? 'New email address' : 'you@example.com'}
				aria-label="Email address"
				disabled={!data.sudo}
			/>
			<button class="btn secondary" disabled={!data.sudo}
				>{data.email ? 'Change email' : 'Add email'}</button
			>
		</form>
	{/if}
</section>

<section class="card panel">
	<header>
		<h2>Password</h2>
		<p>
			{data.hasPassword
				? 'Change the password you sign in with.'
				: 'Add a password to sign in with your email as well.'} Saving signs out every other device.
		</p>
	</header>
	{#if form?.section === 'password' && form.message}
		<p class="alert error spaced" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
	{:else if form?.section === 'password' && form.saved}
		<p class="alert ok spaced" role="status">
			<CircleCheck aria-hidden="true" />Password saved. Other devices are signed out.
		</p>
	{/if}
	<form method="POST" action="?/password" class="form-grid narrow" use:enhance>
		<input
			type="text"
			name="username"
			autocomplete="username"
			value={data.username ?? ''}
			hidden
			readonly
		/>
		<PasswordField
			id="new-password"
			label="New password"
			autocomplete="new-password"
			hint="At least 12 characters. A few random words work well."
		/>
		<div>
			<button class="btn primary" disabled={!data.sudo || !data.emailVerified}
				>{data.hasPassword ? 'Change password' : 'Add password'}</button
			>
		</div>
		{#if !data.emailVerified}<p class="field-hint">Confirm an email address first.</p>{/if}
	</form>
</section>

<section class="card panel">
	<header>
		<h2>Sign-in methods</h2>
		<p>Connect GitHub or Discord to sign in with one click. You always keep at least one way in.</p>
	</header>
	{#if form?.section === 'methods' && form.message}
		<p class="alert error spaced" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
	{/if}
	<ul class="methods">
		{#each data.available as provider (provider)}
			<li>
				<span class="method-icon"><BrandIcon name={provider} /></span>
				<div class="method-text">
					<strong>{names[provider]}</strong>
					<span class="muted small"
						>{linked.has(provider) ? `Connected as ${linked.get(provider)}` : 'Not connected'}</span
					>
				</div>
				{#if linked.has(provider)}
					<form method="POST" action="?/unlink" use:enhance>
						<input type="hidden" name="provider" value={provider} />
						<button class="btn secondary sm" disabled={!data.sudo || methodCount <= 1}
							>Disconnect</button
						>
					</form>
				{:else}
					<a
						class="btn secondary sm"
						href="/auth/{provider}?mode=link&next=/settings/account"
						data-sveltekit-reload>Connect</a
					>
				{/if}
			</li>
		{/each}
		<li>
			<span class="method-icon"><Mail aria-hidden="true" /></span>
			<div class="method-text">
				<strong>Email and password</strong>
				<span class="muted small"
					>{data.methods.password ? 'On' : 'Off: add a confirmed email and a password above'}</span
				>
			</div>
		</li>
	</ul>
</section>

<section class="card panel">
	<header>
		<h2>Your data</h2>
		<p>Download everything vibeLABS stores about you, as one JSON file.</p>
	</header>
	<a class="btn secondary" href="/settings/account/export" download
		><Download aria-hidden="true" />Download my data</a
	>
</section>

<section class="card panel danger-zone">
	<header>
		<h2>Delete account</h2>
		<p>
			Deletes your account, every project you own (with all versions and files), your reviews,
			collections and follows. This can’t be undone.
		</p>
	</header>
	{#if form?.section === 'delete' && form.message}
		<p class="alert error spaced" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
	{/if}
	<form method="POST" action="?/delete" class="form-grid narrow" use:enhance>
		<div class="field">
			<label for="confirm">Type <strong>{data.username}</strong> to confirm</label>
			<input
				class="input"
				id="confirm"
				name="confirm"
				autocomplete="off"
				bind:value={confirmText}
				disabled={!data.sudo}
			/>
		</div>
		<div>
			<button class="btn danger" disabled={!data.sudo || confirmText !== data.username}
				>Delete my account</button
			>
		</div>
	</form>
</section>

<style>
	.spaced {
		margin-bottom: 16px;
	}
	.current {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}
	.inline-form {
		display: flex;
		gap: 12px;
		margin-top: 16px;
		max-width: 520px;
	}
	.narrow {
		max-width: 420px;
	}
	.methods {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0;
	}
	.methods li {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 0;
		border-top: 1px solid var(--line);
	}
	.methods li:first-child {
		border-top: 0;
		padding-top: 0;
	}
	.method-icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--fg-2);
	}
	.method-icon :global(svg) {
		width: 20px;
		height: 20px;
	}
	.method-text {
		flex: 1;
		display: grid;
	}
	@media (max-width: 640px) {
		.inline-form {
			flex-direction: column;
		}
	}
</style>
