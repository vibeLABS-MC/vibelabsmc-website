<script lang="ts">
	import type { PageProps } from './$types';
	import { ArrowRight } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SECTION_ICONS } from '#lib/components/section-icons.ts';

	let { data }: PageProps = $props();
</script>

<Seo
	title="All docs"
	description="Every vibeLABS guide and reference page for Minecraft shaders, by section."
/>

<main id="main" class="index">
	<p class="eyebrow">Documentation</p>
	<h1>All docs</h1>
	<p class="lede">
		Guides for playing with shaderpacks and writing your own, plus the reference and standards.
	</p>
	{#each data.nav as group (group.id)}
		{@const Icon = SECTION_ICONS[group.id]}
		<section>
			<h2><span class="fi"><Icon size={20} aria-hidden="true" /></span>{group.title}</h2>
			<ul>
				{#each group.pages as item (item.slug)}
					<li>
						<a href="/docs/{item.slug}">
							<span class="title">{item.title}<ArrowRight size={16} aria-hidden="true" /></span>
							<span class="desc">{item.description}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</main>

<style>
	.index {
		padding: 40px 64px 0;
		max-width: 960px;
	}
	h1 {
		font-size: 40px;
		line-height: 48px;
		letter-spacing: -0.8px;
		font-weight: 600;
		margin: 8px 0 12px;
	}
	.lede {
		font-size: 19px;
		line-height: 30px;
		color: var(--fg-3);
	}
	section {
		margin-top: 48px;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 22px;
		line-height: 30px;
		font-weight: 600;
		margin-bottom: 16px;
	}
	.fi {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: var(--accent-bg);
		color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	ul {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	a {
		display: block;
		height: 100%;
		padding: 18px 20px;
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px var(--line);
		transition: box-shadow 0.15s;
	}
	a:hover {
		box-shadow:
			inset 0 0 0 1px var(--accent-line),
			var(--shadow-lg);
	}
	.title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 600;
	}
	.title :global(svg) {
		color: var(--fg-5);
	}
	.desc {
		display: block;
		margin-top: 4px;
		font-size: 14px;
		line-height: 20px;
		color: var(--fg-3);
	}
	@media (max-width: 720px) {
		.index {
			padding: 32px 20px 0;
		}
		ul {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
