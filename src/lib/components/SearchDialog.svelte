<script lang="ts">
	import { goto } from '$app/navigation';
	import { CornerDownLeft, Search } from '@lucide/svelte';
	import { search, type SearchEntry } from '#lib/docs/search.ts';
	import { openSearch, searchState } from './search.svelte';

	let dialog: HTMLDialogElement;
	let input = $state<HTMLInputElement>();
	let entries = $state<SearchEntry[]>([]);
	let active = $state(0);
	let failed = $state(false);
	const results = $derived(search(entries, searchState.query));

	$effect(() => {
		if (searchState.open && !dialog.open) {
			dialog.showModal();
			input?.select();
			load();
		}
	});

	$effect(() => {
		void searchState.query;
		active = 0;
	});

	async function load() {
		if (entries.length > 0) return;
		try {
			entries = await (await fetch('/search.json')).json();
		} catch {
			failed = true;
		}
	}

	function close() {
		searchState.open = false;
		if (dialog.open) dialog.close();
	}

	function onWindowKey(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			if (searchState.open) close();
			else openSearch();
		}
	}

	function onInputKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active = (active + step + results.length) % Math.max(results.length, 1);
		} else if (event.key === 'Enter' && results[active]) {
			close();
			goto(results[active].href);
		}
	}
</script>

<svelte:window onkeydown={onWindowKey} />

<dialog
	bind:this={dialog}
	class="search"
	aria-label="Search the docs"
	onclose={() => (searchState.open = false)}
	onclick={(event) => event.target === dialog && close()}
>
	<div class="panel">
		<label class="field">
			<Search size={20} aria-hidden="true" />
			<span class="sr-only">Search the docs</span>
			<input
				bind:this={input}
				bind:value={searchState.query}
				onkeydown={onInputKey}
				type="search"
				placeholder="Search programs, uniforms, guides…"
				autocomplete="off"
				spellcheck="false"
				role="combobox"
				aria-expanded={results.length > 0}
				aria-controls="search-results"
				aria-activedescendant={results[active] ? `result-${active}` : undefined}
			/>
			<kbd class="kbd">Esc</kbd>
		</label>
		{#if failed}
			<p class="empty">Search could not load. Check your connection and try again.</p>
		{:else if searchState.query.trim() && results.length === 0}
			<p class="empty">No pages match “{searchState.query}”.</p>
		{:else if results.length > 0}
			<ul id="search-results" role="listbox" aria-label="Results">
				{#each results as result, i (result.href)}
					<li id="result-{i}" role="option" aria-selected={i === active}>
						<a href={result.href} onclick={close} onmousemove={() => (active = i)}>
							<span class="where">{result.section}</span>
							<span class="title">{result.title}</span>
							<span class="snippet">{result.snippet}</span>
							{#if i === active}<CornerDownLeft size={16} aria-hidden="true" />{/if}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">Type to search every page and heading.</p>
		{/if}
	</div>
</dialog>

<style>
	.search {
		width: min(640px, calc(100vw - 32px));
		max-height: min(560px, calc(100vh - 96px));
		margin: 12vh auto auto;
		padding: 0;
		border: 0;
		border-radius: 16px;
		background: var(--bg-raised);
		color: var(--fg);
		box-shadow:
			0 0 0 1px var(--line),
			0 24px 48px -12px rgb(10 13 18 / 0.35);
		overflow: hidden;
	}
	.search::backdrop {
		background: rgb(12 14 18 / 0.5);
		backdrop-filter: blur(4px);
	}
	.panel {
		display: flex;
		flex-direction: column;
		max-height: inherit;
	}
	.field {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 16px;
		height: 60px;
		border-bottom: 1px solid var(--line);
		color: var(--fg-4);
	}
	input {
		flex: 1;
		border: 0;
		outline: 0;
		background: none;
		color: var(--fg);
		font: 400 17px/24px var(--sans);
	}
	input::-webkit-search-cancel-button {
		display: none;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 8px;
		overflow-y: auto;
	}
	a {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 12px;
		align-items: center;
		padding: 10px 12px;
		border-radius: 10px;
	}
	[aria-selected='true'] a {
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.where {
		grid-column: 1;
		font-size: 12px;
		font-weight: 600;
		color: var(--fg-4);
	}
	.title {
		grid-column: 1;
		font-weight: 600;
	}
	.snippet {
		grid-column: 1;
		font-size: 14px;
		color: var(--fg-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	a :global(svg) {
		grid-column: 2;
		grid-row: 1 / span 3;
		color: var(--accent-fg);
	}
	.empty {
		padding: 28px 20px;
		text-align: center;
		color: var(--fg-3);
		font-size: 15px;
	}
</style>
