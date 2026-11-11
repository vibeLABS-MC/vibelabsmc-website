<script lang="ts">
	import { majorOf } from '#lib/marketplace/versions.ts';

	let { versions, selected = $bindable([]) }: { versions: string[]; selected?: string[] } =
		$props();
	let filter = $state('');
	const shown = $derived(versions.filter((v) => !filter || v.includes(filter.trim())));
	const majors = $derived([...new Set(versions.map(majorOf))].slice(0, 10));
	const toggleMajor = (major: string) => {
		const group = versions.filter((v) => majorOf(v) === major);
		const all = group.every((v) => selected.includes(v));
		selected = all
			? selected.filter((v) => !group.includes(v))
			: [...new Set([...selected, ...group])];
	};
</script>

<div class="gvp">
	<div class="gvp-bar">
		<input
			class="input"
			type="search"
			placeholder="Filter, e.g. 1.20"
			bind:value={filter}
			aria-label="Filter Minecraft versions"
		/>
		<span class="muted small">{selected.length} chosen</span>
		{#if selected.length}<button type="button" class="btn ghost sm" onclick={() => (selected = [])}
				>Clear</button
			>{/if}
	</div>
	<div class="gvp-majors">
		{#each majors as major (major)}
			<button
				type="button"
				class="chip {versions.filter((v) => majorOf(v) === major).every((v) => selected.includes(v))
					? 'on'
					: ''}"
				onclick={() => toggleMajor(major)}>All {major}.x</button
			>
		{/each}
	</div>
	<div class="gvp-grid">
		{#each shown as v (v)}
			<label class="gvp-item {selected.includes(v) ? 'on' : ''}"
				><input type="checkbox" name="gameVersions" value={v} bind:group={selected} />{v}</label
			>
		{/each}
	</div>
</div>

<style>
	.gvp {
		display: grid;
		gap: 10px;
	}
	.gvp-bar {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.gvp-bar .input {
		max-width: 220px;
		padding: 6px 12px;
		font-size: 14px;
	}
	.gvp-majors {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip {
		padding: 3px 10px;
		border: 0;
		border-radius: 999px;
		background: none;
		font-size: 13px;
		font-weight: 500;
		color: var(--fg-2);
		box-shadow: inset 0 0 0 1px var(--line-strong);
		cursor: pointer;
	}
	.chip.on {
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.gvp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
		gap: 6px;
		max-height: 220px;
		overflow-y: auto;
		padding: 2px;
	}
	.gvp-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px;
		border-radius: 8px;
		font: 500 13px/18px var(--mono);
		box-shadow: inset 0 0 0 1px var(--line);
		cursor: pointer;
	}
	.gvp-item.on {
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
		color: var(--accent-fg);
	}
	.gvp-item input {
		margin: 0;
		accent-color: var(--indigo-600);
	}
</style>
