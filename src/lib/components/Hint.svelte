<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	/**
	 * A short label that appears on hover or focus, for icon-only controls.
	 * The control itself still needs an aria-label; the hint is for sighted readers.
	 */
	let { label, children }: { label: string; children: Snippet<[Record<string, unknown>]> } =
		$props();
</script>

<Tooltip.Root delayDuration={250}>
	<Tooltip.Trigger>
		{#snippet child({ props })}{@render children(props)}{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content class="hint" sideOffset={8}>{label}</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
