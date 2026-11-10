<script lang="ts">
	import { Tabs } from 'bits-ui';
	import { ArrowRight } from '@lucide/svelte';
	import { PATHS } from '#lib/landing.ts';
</script>

<div class="paths">
	<Tabs.Root value={PATHS[0].id}>
		<Tabs.List class="segmented" aria-label="Choose a path">
			{#each PATHS as path (path.id)}
				<Tabs.Trigger value={path.id} class="segment">{path.label}</Tabs.Trigger>
			{/each}
		</Tabs.List>
		{#each PATHS as path (path.id)}
			<Tabs.Content value={path.id} class="panel">
				<p class="intro">{path.intro}</p>
				<ol class="steps">
					{#each path.steps as step, i (step.href)}
						<li>
							<a class="step" href={step.href}>
								<span class="num" aria-hidden="true">{i + 1}</span>
								<span class="title">{step.title}</span>
								<span class="text">{step.text}</span>
								<span class="go">Read the guide<ArrowRight aria-hidden="true" /></span>
							</a>
						</li>
					{/each}
				</ol>
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>

<style>
	.paths :global(.segmented) {
		display: inline-flex;
		gap: 4px;
		padding: 4px;
		border-radius: 10px;
		/* In dark mode the track sits below the page and the chosen tab above it. */
		background: light-dark(var(--bg-muted), var(--bg));
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.paths :global(.segment) {
		border: 0;
		background: none;
		padding: 8px 14px;
		border-radius: 7px;
		font-weight: 600;
		font-size: 14px;
		line-height: 20px;
		color: var(--fg-4);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s,
			box-shadow 0.15s;
	}
	.paths :global(.segment:hover) {
		color: var(--fg-2);
	}
	.paths :global(.segment[data-state='active']) {
		background: light-dark(#ffffff, #22262f);
		color: var(--fg);
		box-shadow:
			0 0 0 1px var(--line),
			var(--shadow-sm);
	}
	.paths :global(.panel) {
		margin-top: 24px;
	}
	.intro {
		color: var(--fg-3);
		font-size: 16px;
		margin-bottom: 20px;
	}
	.steps {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.step {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 24px;
		border-radius: 12px;
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line),
			var(--shadow-xs);
		transition:
			box-shadow 0.2s,
			transform 0.2s;
	}
	.step:hover {
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			var(--shadow-lg);
		transform: translateY(-2px);
	}
	.num {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		margin-bottom: 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.title {
		font-size: 18px;
		line-height: 28px;
		font-weight: 600;
		color: var(--fg);
	}
	.text {
		color: var(--fg-3);
		flex: 1;
	}
	.go {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 12px;
		font-weight: 600;
		font-size: 14px;
		color: var(--accent-fg);
	}
	.go :global(svg) {
		width: 16px;
		height: 16px;
		transition: transform 0.2s;
	}
	.step:hover .go :global(svg) {
		transform: translateX(3px);
	}
	@media (max-width: 860px) {
		.steps {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.step,
		.go :global(svg) {
			transition: none;
		}
		.step:hover {
			transform: none;
		}
	}
</style>
