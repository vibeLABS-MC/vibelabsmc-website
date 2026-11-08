<script lang="ts">
	import type { Heading } from '#lib/docs/markdown.ts';
	import type { NavGroup } from '#lib/docs/summary.ts';
	import { SECTION_ICONS } from './section-icons';

	let {
		nav,
		current,
		headings = [],
		open = false
	}: {
		nav: NavGroup[];
		current: string | undefined;
		headings?: Heading[];
		open?: boolean;
	} = $props();
</script>

<nav id="docs-nav" class="side" class:open aria-label="Documentation">
	{#each nav as group (group.id)}
		{@const Icon = SECTION_ICONS[group.id]}
		<div class="group">
			<p class="label"><Icon size={15} aria-hidden="true" />{group.title}</p>
			<ul>
				{#each group.pages as item (item.slug)}
					{@const here = item.slug === current}
					<li>
						<a href="/docs/{item.slug}" class:on={here} aria-current={here ? 'page' : undefined}
							>{item.title}</a
						>
						{#if here && headings.length > 1}
							<ul class="sub">
								{#each headings as heading (heading.id)}
									<li><a href="#{heading.id}">{heading.text}</a></li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>

<style>
	.side {
		position: sticky;
		top: 68px;
		height: calc(100vh - 68px);
		overflow-y: auto;
		padding: 24px 16px 40px 24px;
		border-right: 1px solid var(--line);
		scrollbar-width: thin;
	}
	.group + .group {
		margin-top: 24px;
	}
	.label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: var(--fg-4);
		padding: 0 10px 8px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	a {
		display: block;
		font-size: 14px;
		line-height: 20px;
		color: var(--fg-3);
		padding: 7px 10px;
		border-radius: 6px;
		font-weight: 500;
	}
	a:hover {
		color: var(--fg);
		background: var(--bg-subtle);
	}
	a.on {
		color: var(--accent-fg);
		background: var(--accent-bg);
		font-weight: 600;
	}
	.sub {
		margin: 2px 0 4px 10px;
		padding-left: 10px;
		border-left: 1px solid var(--line);
	}
	.sub a {
		padding: 5px 10px;
		font-weight: 400;
		font-size: 13.5px;
	}
	@media (max-width: 960px) {
		.side {
			position: fixed;
			z-index: 15;
			inset: 68px 0 0 0;
			width: auto;
			height: auto;
			background: var(--bg);
			border-right: 0;
			display: none;
		}
		.side.open {
			display: block;
		}
	}
</style>
