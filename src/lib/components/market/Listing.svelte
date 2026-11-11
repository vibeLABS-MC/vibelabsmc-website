<script lang="ts">
	import { goto } from '$app/navigation';
	import { LayoutGrid, List, PackageSearch, Search, SlidersHorizontal, X } from '@lucide/svelte';
	import ProjectCard from './ProjectCard.svelte';
	import Pager from './Pager.svelte';
	import SetupPicker from './SetupPicker.svelte';
	import {
		GROUP_NAMES,
		LOADER_NAMES,
		type CategoryGroup,
		type Loader,
		type ProjectTypeInfo
	} from '#lib/marketplace/taxonomy.ts';
	import {
		PAGE_SIZE,
		SORTS,
		SORT_NAMES,
		hasFilters,
		withChanges,
		type SearchQuery
	} from '#lib/marketplace/search.ts';
	import type { Setup } from '#lib/marketplace/setup.ts';
	import { majorOf } from '#lib/marketplace/versions.ts';

	interface Props {
		info: ProjectTypeInfo | null;
		query: SearchQuery;
		result: {
			hits: any[];
			total: number;
			facets: {
				categories: Record<string, number>;
				loaders: Record<string, number>;
				versions: Record<string, number>;
			};
		};
		categories: { slug: string; name: string; group: CategoryGroup }[];
		versions: string[];
		setup: Setup;
	}
	let { info, query, result, categories, versions, setup }: Props = $props();

	let filtersOpen = $state(false);
	let allVersions = $state(false);
	const pages = $derived(Math.max(1, Math.ceil(result.total / PAGE_SIZE)));
	const groups = $derived(
		(['categories', 'features', 'resolution', 'performance'] as CategoryGroup[])
			.map((g) => ({ group: g, items: categories.filter((c) => c.group === g) }))
			.filter((g) => g.items.length)
	);
	const categoryNames = $derived(Object.fromEntries(categories.map((c) => [c.slug, c.name])));
	const shownVersions = $derived(
		allVersions ? versions : versions.filter((v, i) => i < 12 || query.versions.includes(v))
	);
	const loaders = $derived(info?.loaders ?? []);
	const majors = $derived([...new Set(versions.map(majorOf))].slice(0, 8));

	function submit(event: Event) {
		const form = (event.currentTarget as HTMLElement).closest('form') as HTMLFormElement;
		const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
		for (const [k, v] of [...params]) if (!v) params.delete(k);
		goto(`?${params}`);
	}
</script>

<div class="listing">
	<form
		class="filters card {filtersOpen ? 'open' : ''}"
		method="GET"
		aria-label="Filters"
		onchange={submit}
	>
		<input type="hidden" name="q" value={query.q} />
		<input type="hidden" name="sort" value={query.sort === 'relevance' ? '' : query.sort} />
		<input type="hidden" name="view" value={query.view === 'list' ? 'list' : ''} />
		<div class="filters-head">
			<strong>Filters</strong>
			{#if hasFilters({ ...query, q: '' })}<a
					class="link small"
					href={withChanges(query, {
						versions: [],
						loaders: [],
						categories: [],
						openSource: false
					})}>Clear all</a
				>{/if}
			<button
				type="button"
				class="btn ghost close-filters"
				aria-label="Close filters"
				onclick={() => (filtersOpen = false)}><X aria-hidden="true" /></button
			>
		</div>

		{#if loaders.length}
			<fieldset>
				<legend>Loader</legend>
				{#each loaders as loader (loader)}
					<label class="check"
						><input
							type="checkbox"
							name="l"
							value={loader}
							checked={query.loaders.includes(loader)}
						/><span>{LOADER_NAMES[loader as Loader]}</span><span class="count"
							>{result.facets.loaders[loader] ?? 0}</span
						></label
					>
				{/each}
			</fieldset>
		{/if}

		<fieldset>
			<legend>Minecraft version</legend>
			<div class="majors">
				{#each majors as major (major)}
					<a
						class="chip"
						href={withChanges(query, { versions: versions.filter((v) => majorOf(v) === major) })}
						>{major}.x</a
					>
				{/each}
			</div>
			<div class="scroll">
				{#each shownVersions as version (version)}
					<label class="check"
						><input
							type="checkbox"
							name="v"
							value={version}
							checked={query.versions.includes(version)}
						/><span>{version}</span><span class="count">{result.facets.versions[version] ?? 0}</span
						></label
					>
				{/each}
			</div>
			{#if versions.length > 12}<button
					type="button"
					class="link small more"
					onclick={() => (allVersions = !allVersions)}
					>{allVersions ? 'Fewer versions' : `All ${versions.length} versions`}</button
				>{/if}
		</fieldset>

		{#each groups as { group, items } (group)}
			<fieldset>
				<legend>{GROUP_NAMES[group]}</legend>
				{#each items as item (item.slug)}
					<label class="check"
						><input
							type="checkbox"
							name="c"
							value={item.slug}
							checked={query.categories.includes(item.slug)}
						/><span>{item.name}</span><span class="count"
							>{result.facets.categories[item.slug] ?? 0}</span
						></label
					>
				{/each}
			</fieldset>
		{/each}

		<fieldset>
			<legend>Licence</legend>
			<label class="check"
				><input type="checkbox" name="oss" value="1" checked={query.openSource} /><span
					>Open source only</span
				></label
			>
		</fieldset>
		<noscript><button class="btn primary block">Apply filters</button></noscript>
	</form>

	<div class="results">
		<form class="searchbar" method="GET" role="search">
			<Search aria-hidden="true" />
			<input
				class="input"
				type="search"
				name="q"
				value={query.q}
				placeholder={info ? `Search ${info.name.toLowerCase()}…` : 'Search everything…'}
				aria-label="Search"
				maxlength="100"
			/>
			{#each query.loaders as l (l)}<input type="hidden" name="l" value={l} />{/each}
			{#each query.versions as v (v)}<input type="hidden" name="v" value={v} />{/each}
			{#each query.categories as c (c)}<input type="hidden" name="c" value={c} />{/each}
			{#if query.openSource}<input type="hidden" name="oss" value="1" />{/if}
			<kbd class="kbd">/</kbd>
		</form>

		<div class="toolbar">
			<button
				type="button"
				class="btn secondary filters-button"
				onclick={() => (filtersOpen = true)}><SlidersHorizontal aria-hidden="true" />Filters</button
			>
			<p class="count-line">
				<strong>{result.total.toLocaleString('en-GB')}</strong>
				{result.total === 1 ? 'project' : 'projects'}{query.q ? ` for “${query.q}”` : ''}
			</p>
			<div class="tools">
				<SetupPicker {setup} {versions} loaders={loaders as Loader[]} />
				<form method="GET" class="sort">
					{#each [...new URLSearchParams(withChanges(query, {}).slice(1))].filter(([k]) => k !== 'sort') as [k, v], i (i)}<input
							type="hidden"
							name={k}
							value={v}
						/>{/each}
					<label class="sr-only" for="sort">Sort by</label>
					<select class="select" id="sort" name="sort" onchange={submit}>
						{#each SORTS as sort (sort)}<option value={sort} selected={query.sort === sort}
								>{SORT_NAMES[sort]}</option
							>{/each}
					</select>
					<noscript><button class="btn secondary">Sort</button></noscript>
				</form>
				<div class="views" role="group" aria-label="Layout">
					<a
						class="btn ghost {query.view === 'grid' ? 'active' : ''}"
						href={withChanges(query, { view: 'grid', page: query.page })}
						aria-label="Grid"
						aria-current={query.view === 'grid' ? 'true' : undefined}
						><LayoutGrid aria-hidden="true" /></a
					>
					<a
						class="btn ghost {query.view === 'list' ? 'active' : ''}"
						href={withChanges(query, { view: 'list', page: query.page })}
						aria-label="List"
						aria-current={query.view === 'list' ? 'true' : undefined}><List aria-hidden="true" /></a
					>
				</div>
			</div>
		</div>

		{#if hasFilters(query)}
			<div class="active-filters">
				{#each query.loaders as l (l)}<a
						class="chip on"
						href={withChanges(query, { loaders: query.loaders.filter((x) => x !== l) })}
						>{LOADER_NAMES[l as Loader] ?? l}<X aria-hidden="true" /></a
					>{/each}
				{#each query.versions as v (v)}<a
						class="chip on"
						href={withChanges(query, { versions: query.versions.filter((x) => x !== v) })}
						>{v}<X aria-hidden="true" /></a
					>{/each}
				{#each query.categories as c (c)}<a
						class="chip on"
						href={withChanges(query, { categories: query.categories.filter((x) => x !== c) })}
						>{categoryNames[c] ?? c}<X aria-hidden="true" /></a
					>{/each}
				{#if query.openSource}<a class="chip on" href={withChanges(query, { openSource: false })}
						>Open source<X aria-hidden="true" /></a
					>{/if}
				{#if query.q}<a class="chip on" href={withChanges(query, { q: '' })}
						>“{query.q}”<X aria-hidden="true" /></a
					>{/if}
			</div>
		{/if}

		{#if result.hits.length}
			<div class="grid {query.view}">
				{#each result.hits as project (project.id)}
					<ProjectCard {project} view={query.view} {setup} {categoryNames} showType={!info} />
				{/each}
			</div>
			<Pager page={query.page} {pages} href={(p) => withChanges(query, { page: p })} />
		{:else}
			<div class="card empty">
				<span class="empty-icon"><PackageSearch aria-hidden="true" /></span>
				<h3>
					{hasFilters(query)
						? 'Nothing matches those filters'
						: `No ${info ? info.name.toLowerCase() : 'projects'} yet`}
				</h3>
				<p>
					{hasFilters(query)
						? 'Try fewer filters, another version, or a different word.'
						: 'Be the first: publish yours from your dashboard.'}
				</p>
				{#if hasFilters(query)}<a class="btn secondary" href="?">Clear filters</a>{:else}<a
						class="btn primary"
						href="/dashboard/projects/new">Publish a project</a
					>{/if}
			</div>
		{/if}
	</div>
</div>

<svelte:window
	onkeydown={(e) => {
		const target = e.target as HTMLElement;
		if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
			e.preventDefault();
			document.querySelector<HTMLInputElement>('.searchbar input')?.focus();
		}
	}}
/>

<style>
	.listing {
		display: grid;
		grid-template-columns: 272px minmax(0, 1fr);
		gap: 32px;
		align-items: start;
	}
	.filters {
		position: sticky;
		top: 96px;
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		padding: 16px;
		display: grid;
		gap: 4px;
	}
	.filters-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 4px 8px;
	}
	.close-filters {
		display: none;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 12px 4px;
		border-top: 1px solid var(--line);
		display: grid;
		gap: 2px;
	}
	legend {
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--fg-4);
		padding: 0 0 6px;
		float: left;
		width: 100%;
	}
	.check {
		padding: 5px 4px;
		border-radius: 6px;
		align-items: center;
	}
	.check input {
		margin: 0;
	}
	.check:hover {
		background: var(--bg-subtle);
	}
	.check span:first-of-type {
		flex: 1;
	}
	.count {
		font-size: 12px;
		color: var(--fg-5);
		font-variant-numeric: tabular-nums;
	}
	.scroll {
		max-height: 240px;
		overflow-y: auto;
		display: grid;
		gap: 2px;
	}
	.majors {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 6px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
		color: var(--fg-2);
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
	.chip:hover {
		background: var(--bg-subtle);
	}
	.chip.on {
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.chip :global(svg) {
		width: 14px;
		height: 14px;
	}
	.more {
		justify-self: start;
		border: 0;
		background: none;
		padding: 6px 4px 0;
		cursor: pointer;
	}
	.searchbar {
		position: relative;
		display: flex;
		align-items: center;
	}
	.searchbar :global(svg) {
		position: absolute;
		left: 14px;
		width: 20px;
		height: 20px;
		color: var(--fg-4);
		pointer-events: none;
	}
	.searchbar .input {
		padding: 12px 48px 12px 44px;
		font-size: 16px;
	}
	.searchbar .kbd {
		position: absolute;
		right: 12px;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 20px 0 16px;
		flex-wrap: wrap;
	}
	.filters-button {
		display: none;
	}
	.count-line {
		color: var(--fg-3);
		font-size: 14px;
	}
	.count-line strong {
		color: var(--fg);
	}
	.tools {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
		flex-wrap: wrap;
	}
	.sort .select {
		padding-block: 8px;
		font-size: 14px;
		width: auto;
	}
	.views {
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.active-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 16px;
	}
	.grid {
		display: grid;
		gap: 20px;
	}
	.grid.grid {
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	}
	.grid.list {
		grid-template-columns: 1fr;
		gap: 12px;
	}
	@media (max-width: 1024px) {
		.listing {
			grid-template-columns: 1fr;
		}
		.filters {
			display: none;
		}
		.filters.open {
			display: grid;
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 45;
			width: min(340px, 90vw);
			max-height: none;
			border-radius: 0;
			box-shadow: var(--shadow-xl);
		}
		.close-filters,
		.filters-button {
			display: inline-flex;
		}
	}
</style>
