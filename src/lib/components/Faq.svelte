<script lang="ts">
	import { Accordion } from 'bits-ui';
	import { ArrowUpRight, Plus } from '@lucide/svelte';
	import { FAQ } from '#lib/landing.ts';
</script>

<div class="faq">
	<Accordion.Root type="single">
		{#each FAQ as item (item.id)}
			<Accordion.Item value={item.id} class="item">
				<Accordion.Header level={3}>
					<Accordion.Trigger class="question">
						{item.question}
						<Plus class="toggle" aria-hidden="true" />
					</Accordion.Trigger>
				</Accordion.Header>
				<!-- Answers stay in the HTML when closed, so search engines still read them. bits-ui
				     would add an inline style (height variables for animation) that the CSP blocks, so
				     this element is rendered here, without it. -->
				<Accordion.Content forceMount>
					{#snippet child({ props, open })}
						{@const { style: _animationVars, ...attrs } = props}
						<div {...attrs} class="answer" hidden={!open}>
							<p>
								{item.answer}
								{#if item.link}
									<a href={item.link.href}>{item.link.label}<ArrowUpRight aria-hidden="true" /></a>
								{/if}
							</p>
						</div>
					{/snippet}
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</div>

<style>
	.faq :global(.item) {
		border-bottom: 1px solid var(--line);
	}
	.faq :global(.item:first-child) {
		border-top: 1px solid var(--line);
	}
	.faq :global(.question) {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 20px 0;
		border: 0;
		background: none;
		text-align: left;
		font-size: 18px;
		line-height: 28px;
		font-weight: 600;
		color: var(--fg);
		cursor: pointer;
	}
	.faq :global(.toggle) {
		flex: none;
		width: 24px;
		height: 24px;
		padding: 3px;
		border-radius: 999px;
		color: var(--fg-4);
		box-shadow: inset 0 0 0 1.5px var(--line-strong);
		transition: transform 0.2s;
	}
	.faq :global(.question[data-state='open'] .toggle) {
		transform: rotate(45deg);
		color: var(--accent);
	}
	.answer p {
		padding: 0 48px 24px 0;
		color: var(--fg-3);
	}
	.answer a {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-weight: 600;
		color: var(--accent-fg);
		white-space: nowrap;
	}
	.answer a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.answer :global(svg) {
		width: 16px;
		height: 16px;
	}
	@media (prefers-reduced-motion: reduce) {
		.faq :global(.toggle) {
			transition: none;
		}
	}
</style>
