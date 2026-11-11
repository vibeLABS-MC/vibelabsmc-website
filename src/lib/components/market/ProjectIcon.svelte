<script lang="ts">
	import { initials, toneOf } from '#lib/format.ts';

	let {
		name,
		iconKey,
		size = 56
	}: { name: string; iconKey: string | null; size?: 32 | 40 | 56 | 72 | 96 } = $props();
</script>

<span class="picon picon-{size} tone-{toneOf(name)}" aria-hidden="true">
	{#if iconKey}
		<img src="/media/{iconKey}.webp" alt="" width={size} height={size} loading="lazy" />
	{:else}
		{initials(name)}
	{/if}
</span>

<style>
	.picon {
		display: inline-grid;
		place-items: center;
		flex: none;
		overflow: hidden;
		border-radius: 14px;
		color: #fff;
		font-weight: 700;
		background: var(--indigo-600);
		box-shadow:
			inset 0 0 0 1px rgb(10 13 18 / 0.08),
			var(--shadow-xs);
	}
	.picon img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		image-rendering: auto;
	}
	.picon-32 {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		font-size: 12px;
	}
	.picon-40 {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		font-size: 14px;
	}
	.picon-56 {
		width: 56px;
		height: 56px;
		font-size: 18px;
	}
	.picon-72 {
		width: 72px;
		height: 72px;
		border-radius: 16px;
		font-size: 24px;
	}
	.picon-96 {
		width: 96px;
		height: 96px;
		border-radius: 20px;
		font-size: 32px;
	}
	.tone-0 {
		background: linear-gradient(135deg, #155eef, #2d31a6);
	}
	.tone-1 {
		background: linear-gradient(135deg, #6172f3, #3538cd);
	}
	.tone-2 {
		background: linear-gradient(135deg, #15b79e, #0e7090);
	}
	.tone-3 {
		background: linear-gradient(135deg, #ee46bc, #9e165f);
	}
	.tone-4 {
		background: linear-gradient(135deg, #fb6514, #b93815);
	}
	.tone-5 {
		background: linear-gradient(135deg, #9b8afb, #5925dc);
	}
</style>
