<script lang="ts">
	import type { Component } from 'svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		icon: Icon,
		children,
		footer
	}: {
		title: string;
		subtitle?: string;
		icon?: Component<{ 'aria-hidden'?: 'true' }>;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<section class="auth-card">
	<header>
		{#if Icon}<span class="icon"><Icon aria-hidden="true" /></span>{/if}
		<h1>{title}</h1>
		{#if subtitle}<p>{subtitle}</p>{/if}
	</header>
	{@render children()}
	{#if footer}<footer>{@render footer()}</footer>{/if}
</section>

<style>
	.auth-card {
		width: min(400px, 100%);
		display: grid;
		gap: 24px;
	}
	header {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 8px;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin-bottom: 16px;
		border-radius: 10px;
		color: var(--fg-2);
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line),
			var(--shadow-xs);
	}
	.icon :global(svg) {
		width: 24px;
		height: 24px;
	}
	h1 {
		font-size: 30px;
		line-height: 38px;
		letter-spacing: -0.02em;
		font-weight: 600;
	}
	header p {
		color: var(--fg-3);
	}
	footer {
		text-align: center;
		font-size: 14px;
		line-height: 20px;
		color: var(--fg-3);
	}
	.auth-card :global(.divider) {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--fg-4);
	}
	.auth-card :global(.divider::before),
	.auth-card :global(.divider::after) {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--line);
	}
</style>
