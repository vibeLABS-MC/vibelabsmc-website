<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, Copy, Laptop, ShieldCheck, ShieldAlert } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import SudoNote from '#lib/components/SudoNote.svelte';
	import { timeAgo } from '#lib/format.ts';

	let { data, form } = $props();
	const codes = $derived(form && 'codes' in form ? (form.codes as string[]) : null);
	let copied = $state(false);

	async function copyCodes() {
		if (!codes) return;
		await navigator.clipboard.writeText(codes.join('\n'));
		copied = true;
	}
	function downloadCodes() {
		if (!codes) return;
		const blob = new Blob(
			[`vibeLABS recovery codes\nEach code works once.\n\n${codes.join('\n')}\n`],
			{ type: 'text/plain' }
		);
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'vibelabs-recovery-codes.txt';
		link.click();
		URL.revokeObjectURL(link.href);
	}
</script>

<Seo title="Security settings" description="Two-factor sign-in and signed-in devices." />

{#if data.required}
	<p class="alert warn spaced">
		<ShieldAlert aria-hidden="true" />Moderators and admins need two-factor sign-in turned on before
		they can open the moderation area.
	</p>
{/if}
{#if !data.sudo && !codes}<div class="spaced"><SudoNote href="/settings/security" /></div>{/if}
{#if form?.message}
	<p class="alert error spaced" role="alert"><CircleAlert aria-hidden="true" />{form.message}</p>
{/if}

<section class="card panel">
	<header class="with-badge">
		<div>
			<h2>Two-factor sign-in</h2>
			<p>
				After your password or GitHub/Discord, also ask for a code from an authenticator app
				(1Password, Google Authenticator, Authy, Microsoft Authenticator…).
			</p>
		</div>
		<span class="badge {data.twoFactor.enabled ? 'ok' : ''}"
			>{data.twoFactor.enabled ? 'On' : 'Off'}</span
		>
	</header>

	{#if codes}
		<div class="codes-box">
			<p class="alert ok">
				<CircleCheck aria-hidden="true" />Save these recovery codes somewhere safe. Each works once
				if you lose your phone. They won’t be shown again.
			</p>
			<ol class="codes">
				{#each codes as code (code)}<li class="mono">{code}</li>{/each}
			</ol>
			<div class="row-gap">
				<button type="button" class="btn secondary sm" onclick={copyCodes}
					><Copy aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button
				>
				<button type="button" class="btn secondary sm" onclick={downloadCodes}>Download .txt</button
				>
				<a class="btn primary sm" href="/settings/security">I’ve saved them</a>
			</div>
		</div>
	{:else if data.setup}
		<div class="setup">
			<div class="qr" aria-label="QR code for your authenticator app">{@html data.setup.qr}</div>
			<div class="setup-steps">
				<ol>
					<li>Scan the code with your authenticator app.</li>
					<li>
						Can’t scan? Enter this key instead: <code class="code-chip"
							>{data.setup.secret.match(/.{1,4}/g)?.join(' ')}</code
						>
					</li>
					<li>Type the 6-digit code the app shows.</li>
				</ol>
				<form method="POST" action="?/confirm" class="inline-form" use:enhance>
					<input
						class="input code"
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="7"
						placeholder="000000"
						required
						aria-label="6-digit code"
					/>
					<button class="btn primary">Turn on</button>
				</form>
				<form method="POST" action="?/cancelSetup" use:enhance>
					<button class="btn ghost sm">Cancel</button>
				</form>
			</div>
		</div>
	{:else if data.twoFactor.enabled}
		<p class="muted small">{data.twoFactor.remaining} of 10 recovery codes left.</p>
		<div class="row-gap top">
			<form method="POST" action="?/regenerate" use:enhance>
				<button class="btn secondary" disabled={!data.sudo}>New recovery codes</button>
			</form>
			<form method="POST" action="?/disable" use:enhance>
				<button class="btn ghost" disabled={!data.sudo}>Turn off</button>
			</form>
		</div>
	{:else}
		<form method="POST" action="?/begin" use:enhance>
			<button class="btn primary" disabled={!data.sudo}
				><ShieldCheck aria-hidden="true" />Set up two-factor</button
			>
		</form>
	{/if}
</section>

<section class="card panel">
	<header class="with-badge">
		<div>
			<h2>Where you’re signed in</h2>
			<p>Sessions end after a week without use, or after 30 days.</p>
		</div>
		{#if data.devices.length > 1}
			<form method="POST" action="?/revokeOthers" use:enhance>
				<button class="btn secondary sm">Sign out everywhere else</button>
			</form>
		{/if}
	</header>
	<ul class="devices">
		{#each data.devices as device (device.id)}
			<li>
				<span class="device-icon"><Laptop aria-hidden="true" /></span>
				<div class="device-text">
					<strong
						>{device.device}{#if device.current}
							<span class="badge ok">This device</span>{/if}</strong
					>
					<span class="muted small"
						>Active {timeAgo(device.lastSeenAt)} · signed in {timeAgo(device.createdAt)}</span
					>
				</div>
				{#if !device.current}
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="id" value={device.id} />
						<button class="btn ghost sm">Sign out</button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
</section>

<section class="card panel">
	<header>
		<h2>Recent security activity</h2>
		<p>The last 15 sign-ins and changes on your account.</p>
	</header>
	{#if data.activity.length}
		<ul class="activity">
			{#each data.activity as item, i (i)}
				<li>
					<span>{item.label}{item.method ? ` with ${item.method}` : ''}</span><span
						class="muted small">{timeAgo(item.at)}</span
					>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted small">Nothing yet.</p>
	{/if}
</section>

<style>
	.spaced {
		margin-bottom: 16px;
	}
	.with-badge {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}
	.top {
		margin-top: 12px;
	}
	.setup {
		display: flex;
		gap: 32px;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.qr {
		width: 184px;
		padding: 12px;
		border-radius: 12px;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
		color: #000;
	}
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	.setup-steps {
		flex: 1;
		min-width: 260px;
		display: grid;
		gap: 16px;
		align-content: start;
	}
	.setup-steps ol {
		padding-left: 20px;
		display: grid;
		gap: 8px;
		color: var(--fg-2);
	}
	.inline-form {
		display: flex;
		gap: 12px;
		max-width: 320px;
	}
	.codes-box {
		display: grid;
		gap: 16px;
	}
	.codes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px 24px;
		padding: 16px 16px 16px 40px;
		border-radius: 12px;
		background: var(--bg-subtle);
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: 15px;
	}
	.devices,
	.activity {
		list-style: none;
		padding: 0;
	}
	.devices li {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 0;
		border-top: 1px solid var(--line);
	}
	.devices li:first-child {
		border-top: 0;
		padding-top: 0;
	}
	.device-icon {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--fg-3);
	}
	.device-icon :global(svg) {
		width: 20px;
		height: 20px;
	}
	.device-text {
		flex: 1;
		display: grid;
	}
	.activity li {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 0;
		border-top: 1px solid var(--line);
		font-size: 14px;
	}
	.activity li:first-child {
		border-top: 0;
	}
</style>
