<script lang="ts">
	import BrandIcon from '../BrandIcon.svelte';

	let {
		providers,
		next,
		verb = 'Continue'
	}: { providers: ('github' | 'discord')[]; next: string; verb?: string } = $props();

	const names = { github: 'GitHub', discord: 'Discord' } as const;
</script>

{#if providers.length}
	<div class="providers">
		{#each providers as provider (provider)}
			<a
				class="btn secondary lg block provider {provider}"
				href="/auth/{provider}?next={encodeURIComponent(next)}"
				data-sveltekit-reload
			>
				<BrandIcon name={provider} />
				{verb} with {names[provider]}
			</a>
		{/each}
	</div>
{/if}

<style>
	.providers {
		display: grid;
		gap: 12px;
	}
	.provider.discord :global(svg) {
		color: #5865f2;
	}
</style>
