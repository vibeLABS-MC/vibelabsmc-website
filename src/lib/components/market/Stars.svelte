<script lang="ts">
	import { Star } from '@lucide/svelte';

	let { value, label = true }: { value: number; label?: boolean } = $props();
	const rounded = $derived(Math.round(value));
</script>

<span class="stars" role="img" aria-label="{value.toFixed(1)} out of 5 stars">
	{#each [1, 2, 3, 4, 5] as n (n)}<Star
			class={n <= rounded ? 'on' : ''}
			aria-hidden="true"
		/>{/each}
</span>{#if label}<span class="sr-only">{value.toFixed(1)} out of 5</span>{/if}
