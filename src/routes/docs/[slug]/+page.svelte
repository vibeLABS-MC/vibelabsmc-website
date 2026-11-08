<script lang="ts">
	import type { PageProps } from './$types';
	import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock3, Pencil } from '@lucide/svelte';
	import BrandIcon from '#lib/components/BrandIcon.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import Toc from '#lib/components/Toc.svelte';
	import { longDate } from '#lib/docs/dates.ts';

	let { data }: PageProps = $props();
</script>

<Seo title={data.page.title} description={data.page.description} />

<div class="columns">
	<main id="main" class="article">
		<nav class="crumbs" aria-label="Breadcrumb">
			<a href="/docs">Docs</a><ChevronRight size={16} aria-hidden="true" />
			<span>{data.sectionTitle}</span><ChevronRight size={16} aria-hidden="true" />
			<span class="here" aria-current="page">{data.page.title}</span>
		</nav>
		<h1>{data.page.title}</h1>
		<p class="lede">{data.page.description}</p>
		<div class="meta">
			<span><Clock3 size={16} aria-hidden="true" />{data.minutes} min read</span>
			<span><Calendar size={16} aria-hidden="true" />Updated {longDate(data.page.updated)}</span>
			{#if data.page.loaders.length > 0}
				<span class="loaders">
					{#each data.page.loaders as loader (loader)}<span class="loader">{loader}</span>{/each}
				</span>
			{/if}
			<a class="edit" href={data.editUrl}><Pencil size={16} aria-hidden="true" />Edit this page</a>
		</div>

		<article class="prose">
			<!-- Rendered at build time from the page's Markdown, with raw HTML escaped. -->
			{@html data.html}
		</article>

		<nav class="pn" aria-label="Previous and next pages">
			{#if data.previous}
				<a href="/docs/{data.previous.slug}">
					<small><ArrowLeft size={16} aria-hidden="true" />Previous</small>
					<span>{data.previous.title}</span>
				</a>
			{:else}<span></span>{/if}
			{#if data.next}
				<a class="next" href="/docs/{data.next.slug}">
					<small>Next<ArrowRight size={16} aria-hidden="true" /></small>
					<span>{data.next.title}</span>
				</a>
			{/if}
		</nav>
		<p class="suggest">
			Something wrong or missing?
			<a href={data.editUrl}><BrandIcon name="github" size={16} />Suggest an edit on GitHub</a>
		</p>
	</main>
	<Toc headings={data.headings} />
</div>

<style>
	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 248px;
	}
	.article {
		padding: 40px 64px 0;
		max-width: 880px;
		width: 100%;
		justify-self: center;
	}
	.crumbs {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--fg-4);
	}
	.crumbs a:hover {
		color: var(--fg);
	}
	.crumbs :global(svg) {
		color: var(--fg-5);
	}
	.here {
		color: var(--accent-fg);
		font-weight: 600;
	}
	h1 {
		font-size: 40px;
		line-height: 48px;
		letter-spacing: -0.8px;
		font-weight: 600;
		margin: 16px 0 12px;
		text-wrap: balance;
	}
	.lede {
		font-size: 19px;
		line-height: 30px;
		color: var(--fg-3);
	}
	.meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px 16px;
		margin-top: 20px;
		padding-bottom: 28px;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
		color: var(--fg-4);
	}
	.meta > span,
	.edit {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.loaders {
		gap: 6px;
	}
	.loader {
		font-size: 12px;
		font-weight: 500;
		padding: 1px 8px;
		border-radius: 999px;
		box-shadow: inset 0 0 0 1px var(--line-strong);
		color: var(--fg-2);
	}
	.edit {
		margin-left: auto;
		font-weight: 600;
		color: var(--fg-3);
	}
	.edit:hover {
		color: var(--fg);
	}
	.pn {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-top: 56px;
	}
	.pn a {
		display: block;
		padding: 18px 20px;
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px var(--line);
		transition: box-shadow 0.15s;
	}
	.pn a:hover {
		box-shadow:
			inset 0 0 0 1px var(--accent-line),
			var(--shadow-lg);
	}
	.pn small {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--fg-4);
	}
	.pn span {
		display: block;
		font-weight: 600;
		margin-top: 4px;
	}
	.pn .next {
		text-align: right;
	}
	.pn .next small {
		justify-content: flex-end;
	}
	.suggest {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-top: 32px;
		padding-top: 24px;
		border-top: 1px solid var(--line);
		font-size: 14px;
		color: var(--fg-3);
	}
	.suggest a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		color: var(--fg-2);
	}
	@media (max-width: 1200px) {
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}
		.columns :global(.toc) {
			display: none;
		}
	}
	@media (max-width: 720px) {
		.article {
			padding: 28px 20px 0;
		}
		h1 {
			font-size: 32px;
			line-height: 40px;
		}
		.edit {
			margin-left: 0;
		}
		.pn {
			grid-template-columns: 1fr;
		}
	}
</style>
