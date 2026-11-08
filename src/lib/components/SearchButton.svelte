<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { openSearch } from './search.svelte';

	let { large = false, label = 'Search docs…' }: { large?: boolean; label?: string } = $props();
</script>

<button
	type="button"
	class="find"
	class:large
	onclick={() => openSearch()}
	aria-keyshortcuts="Control+K"
>
	<Search size={large ? 22 : 18} aria-hidden="true" />
	<span class="label">{label}</span>
	<kbd class="kbd">Ctrl K</kbd>
</button>

<style>
	.find {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: 40px;
		padding: 0 8px 0 12px;
		border: 0;
		border-radius: 8px;
		background: var(--bg-subtle);
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--fg-4);
		font-size: 14px;
		cursor: pointer;
		text-align: left;
	}
	.find:hover {
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
	.find :global(svg) {
		color: var(--fg-5);
	}
	.label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.large {
		height: 60px;
		gap: 12px;
		padding: 0 12px 0 18px;
		border-radius: 14px;
		background: #fff;
		color: #717680;
		font-size: 16px;
		box-shadow:
			0 0 0 6px rgb(255 255 255 / 0.08),
			0 24px 48px -12px rgb(0 0 0 / 0.5);
	}
	.large:hover {
		box-shadow:
			0 0 0 6px rgb(255 255 255 / 0.14),
			0 24px 48px -12px rgb(0 0 0 / 0.5);
	}
	.large .kbd {
		background: #fafafa;
		box-shadow: inset 0 0 0 1px #e9eaeb;
		color: #717680;
	}
	@media (max-width: 640px) {
		.kbd {
			display: none;
		}
	}
</style>
