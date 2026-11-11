<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { compact, shortDate } from '#lib/format.ts';

	let { data } = $props();
	const W = 720;
	const H = 200;
	const max = $derived(Math.max(1, ...data.history.map((d) => d.count)));
	const total = $derived(data.history.reduce((n, d) => n + d.count, 0));
	const bar = $derived(W / data.history.length);
	const topVersion = $derived(Math.max(1, ...data.versions.map((v) => v.downloads)));
	let hover = $state<number | null>(null);
</script>

<Seo title="Analytics for {data.project.name}" description="Project downloads." />

<section class="card panel">
	<header class="chart-head">
		<div>
			<h2>Downloads</h2>
			<p>
				<strong>{total.toLocaleString('en-GB')}</strong> in the last {data.days} days · {data.project.downloads.toLocaleString(
					'en-GB'
				)} all time
			</p>
		</div>
		<div class="row-gap">
			<a class="btn {data.days === 30 ? 'secondary active' : 'ghost'} sm" href="?days=30">30 days</a
			>
			<a class="btn {data.days === 90 ? 'secondary active' : 'ghost'} sm" href="?days=90">90 days</a
			>
		</div>
	</header>
	<figure class="chart">
		<svg
			viewBox="0 0 {W} {H + 24}"
			role="img"
			aria-label="Downloads per day for the last {data.days} days"
		>
			{#each [0.25, 0.5, 0.75, 1] as f (f)}<line
					x1="0"
					x2={W}
					y1={H - H * f}
					y2={H - H * f}
					class="grid"
				/>{/each}
			{#each data.history as day, i (day.day)}
				{@const h = (day.count / max) * (H - 8)}
				<rect
					x={i * bar + 1}
					y={H - h}
					width={Math.max(1, bar - 2)}
					height={Math.max(h, day.count ? 2 : 0)}
					rx="2"
					class={hover === i ? 'bar on' : 'bar'}
					role="presentation"
					onmouseenter={() => (hover = i)}
					onmouseleave={() => (hover = null)}
				/>
			{/each}
			<text x="0" y={H + 18} class="axis">{shortDate(data.history[0]!.day)}</text>
			<text x={W} y={H + 18} class="axis end"
				>{shortDate(data.history[data.history.length - 1]!.day)}</text
			>
		</svg>
		<figcaption class="muted small">
			{#if hover !== null}{shortDate(data.history[hover]!.day)}:
				<strong>{data.history[hover]!.count}</strong> downloads{:else}Hover a bar for that day’s
				count. Peak: {max} in a day.{/if}
		</figcaption>
	</figure>
</section>

<section class="card panel">
	<header><h2>By version</h2></header>
	{#if data.versions.length}
		<ul class="versions">
			{#each data.versions as v (v.id)}
				<li>
					<span>{v.name}</span><meter min="0" max={topVersion} value={v.downloads}></meter><strong
						>{compact(v.downloads)}</strong
					>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted small">No versions yet.</p>
	{/if}
</section>

<style>
	.chart-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}
	.chart {
		margin: 8px 0 0;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.grid {
		stroke: var(--line);
		stroke-dasharray: 4 4;
	}
	.bar {
		fill: var(--indigo-500);
		opacity: 0.85;
	}
	.bar.on {
		fill: var(--indigo-700);
		opacity: 1;
	}
	.axis {
		fill: var(--fg-4);
		font-size: 12px;
	}
	.axis.end {
		text-anchor: end;
	}
	.versions {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.versions li {
		display: grid;
		grid-template-columns: minmax(120px, 220px) 1fr 60px;
		align-items: center;
		gap: 12px;
		font-size: 14px;
	}
	.versions strong {
		text-align: right;
	}
	meter {
		width: 100%;
		height: 8px;
		appearance: none;
		border-radius: 999px;
		background: var(--bg-muted);
	}
	meter::-webkit-meter-bar {
		background: var(--bg-muted);
		border: 0;
		border-radius: 999px;
		height: 8px;
	}
	meter::-webkit-meter-optimum-value {
		background: var(--indigo-500);
		border-radius: 999px;
	}
	meter::-moz-meter-bar {
		background: var(--indigo-500);
		border-radius: 999px;
	}
</style>
