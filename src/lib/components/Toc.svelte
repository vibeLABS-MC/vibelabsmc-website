<script lang="ts">
	import { AlignLeft } from '@lucide/svelte';
	import type { Heading } from '#lib/docs/markdown.ts';
	import { SITE } from '#lib/site.ts';
	import BrandIcon from './BrandIcon.svelte';

	let { headings }: { headings: Heading[] } = $props();
	let active = $state<string>();

	// Highlights the section being read: the last heading that has scrolled past the top bar.
	$effect(() => {
		const targets = headings
			.map((h) => document.getElementById(h.id))
			.filter((el): el is HTMLElement => el !== null);
		const update = () => {
			const passed = targets.filter((el) => el.getBoundingClientRect().top < 120);
			active = (passed.at(-1) ?? targets[0])?.id;
		};
		update();
		addEventListener('scroll', update, { passive: true });
		return () => removeEventListener('scroll', update);
	});
</script>

<aside class="toc">
	{#if headings.length > 0}
		<h2><AlignLeft size={16} aria-hidden="true" />On this page</h2>
		<ul>
			{#each headings as heading (heading.id)}
				<li>
					<a href="#{heading.id}" class:on={heading.id === active}>{heading.text}</a>
				</li>
			{/each}
		</ul>
	{/if}
	{#if SITE.discord}
		<div class="ask">
			<p class="strong">Stuck?</p>
			<p>Ask in the vibeLABS Discord, where people who write shaders hang out.</p>
			<a href={SITE.discord}><BrandIcon name="discord" size={16} />Open Discord</a>
		</div>
	{/if}
</aside>

<style>
	.toc {
		position: sticky;
		top: 68px;
		align-self: start;
		padding: 40px 24px 0 8px;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 12px;
	}
	h2 :global(svg) {
		color: var(--fg-4);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--line);
	}
	a {
		display: block;
		font-size: 13.5px;
		line-height: 20px;
		padding: 5px 0 5px 14px;
		margin-left: -1px;
		color: var(--fg-4);
		border-left: 1px solid transparent;
	}
	a:hover {
		color: var(--fg);
	}
	a.on {
		color: var(--accent-fg);
		border-left-color: var(--accent);
		font-weight: 600;
	}
	.ask {
		margin-top: 28px;
		padding: 16px;
		border-radius: 12px;
		background: var(--bg-subtle);
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: 13.5px;
		line-height: 20px;
		color: var(--fg-3);
	}
	.ask .strong {
		color: var(--fg);
		font-weight: 600;
		margin-bottom: 4px;
	}
	.ask a {
		display: inline-flex;
		gap: 6px;
		align-items: center;
		margin-top: 10px;
		padding: 0;
		border: 0;
		font-weight: 600;
		color: var(--accent-fg);
	}
</style>
