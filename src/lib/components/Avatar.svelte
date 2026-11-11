<script lang="ts">
	import { initials, toneOf } from '#lib/format.ts';

	let {
		name,
		imageKey = null,
		size = 32
	}: { name: string; imageKey?: string | null; size?: 20 | 24 | 32 | 40 | 64 | 96 } = $props();
</script>

<span class="avatar size-{size} tone-{toneOf(name)}" aria-hidden="true">
	{#if imageKey}
		<img src="/media/{imageKey}.webp" alt="" width={size} height={size} loading="lazy" />
	{:else}
		{initials(name)}
	{/if}
</span>
