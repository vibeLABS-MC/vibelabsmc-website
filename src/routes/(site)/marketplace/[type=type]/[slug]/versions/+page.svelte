<script lang="ts">
	import { Check, Download, PackageOpen } from '@lucide/svelte';
	import { compact, fileSize, shortDate } from '#lib/format.ts';
	import { compatibilityMatrix } from '#lib/marketplace/matrix.ts';
	import { LOADER_NAMES, projectPath, type Loader } from '#lib/marketplace/taxonomy.ts';
	import { compareVersions, summariseVersions } from '#lib/marketplace/versions.ts';

	let { data } = $props();
	let channel = $state('');
	let gameVersion = $state('');
	let loader = $state('');
	const base = $derived(projectPath(data.project.type, data.project.slug));
	const listed = $derived(data.versions.filter((v) => v.status === 'listed'));
	const offered = $derived(
		[...new Set(data.versions.flatMap((v) => v.gameVersions))].sort(compareVersions)
	);
	const shown = $derived(
		data.versions.filter(
			(v) =>
				(!channel || v.channel === channel) &&
				(!gameVersion || v.gameVersions.includes(gameVersion)) &&
				(!loader || v.loaders.includes(loader))
		)
	);
	const matrix = $derived(compatibilityMatrix(listed, data.info.loaders));
	const name = (l: string) => (l === 'any' ? 'Works' : (LOADER_NAMES[l as Loader] ?? l));
</script>

{#if data.versions.length}
	{#if matrix.rows.length > 1 || data.info.loaders.length > 1}
		<section class="card panel matrix-panel">
			<h2>Compatibility at a glance</h2>
			<div class="table-wrap">
				<table class="matrix">
					<thead
						><tr
							><th scope="col">Minecraft</th>{#each matrix.columns as c (c)}<th scope="col"
									>{name(c)}</th
								>{/each}</tr
						></thead
					>
					<tbody>
						{#each matrix.rows as row, r (row)}
							<tr>
								<th scope="row">{row}</th>
								{#each matrix.cells[r]! as cell, c (c)}<td
										>{#if cell}<span class="yes"><Check aria-label="Supported" /></span>{:else}<span
												class="no"
												aria-label="Not supported">–</span
											>{/if}</td
									>{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<div class="vfilters">
		<select class="select" bind:value={channel} aria-label="Channel">
			<option value="">All channels</option><option value="release">Release</option><option
				value="beta">Beta</option
			><option value="alpha">Alpha</option>
		</select>
		<select class="select" bind:value={gameVersion} aria-label="Minecraft version">
			<option value="">All Minecraft versions</option>
			{#each offered as v (v)}<option value={v}>{v}</option>{/each}
		</select>
		{#if data.info.loaders.length}
			<select class="select" bind:value={loader} aria-label="Loader">
				<option value="">All loaders</option>
				{#each data.info.loaders as l (l)}<option value={l}>{LOADER_NAMES[l]}</option>{/each}
			</select>
		{/if}
		<span class="muted small">{shown.length} of {data.versions.length}</span>
	</div>

	<div class="card table-wrap">
		<table class="table">
			<thead
				><tr
					><th>Version</th><th>Minecraft</th>{#if data.info.loaders.length}<th>Loaders</th>{/if}<th
						>Published</th
					><th>Downloads</th><th><span class="sr-only">Download</span></th></tr
				></thead
			>
			<tbody>
				{#each shown as v (v.id)}
					{@const main = v.files.find((f) => f.primary) ?? v.files[0]}
					<tr>
						<td>
							<a class="vname" href="{base}/version/{v.id}"><strong>{v.name}</strong></a>
							<span class="row-gap tiny"
								><span class="badge {v.channel === 'release' ? 'ok' : 'warn'}">{v.channel}</span
								><span class="mono">{v.versionNumber}</span>{#if v.status === 'withheld'}<span
										class="badge error">withheld</span
									>{/if}</span
							>
						</td>
						<td>{summariseVersions(v.gameVersions, data.knownVersions)}</td>
						{#if data.info.loaders.length}<td
								>{v.loaders.map((l) => LOADER_NAMES[l as Loader] ?? l).join(', ')}</td
							>{/if}
						<td>{shortDate(v.publishedAt)}</td>
						<td>{compact(v.downloads)}</td>
						<td>
							{#if main && main.scanStatus === 'clean'}
								<a
									class="btn secondary sm"
									href="/download/{main.id}/{encodeURIComponent(main.filename)}"
									data-sveltekit-reload
									title="{main.filename} · {fileSize(main.size)}"
									><Download aria-hidden="true" /><span class="sr-only"
										>Download {main.filename}</span
									></a
								>
							{:else if main}<span class="badge warn" title="Being checked">checking</span>{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="card empty">
		<span class="empty-icon"><PackageOpen aria-hidden="true" /></span>
		<h3>No versions yet</h3>
		{#if data.role}<p>Upload the first one from the dashboard.</p>{/if}
	</div>
{/if}

<style>
	.matrix-panel {
		margin-bottom: 20px;
	}
	.matrix-panel h2 {
		margin-bottom: 12px;
	}
	.matrix {
		border-collapse: collapse;
		font-size: 14px;
		min-width: 100%;
	}
	.matrix th,
	.matrix td {
		padding: 6px 12px;
		text-align: center;
		border-bottom: 1px solid var(--line);
	}
	.matrix th[scope='row'] {
		text-align: left;
		font-weight: 500;
		font-family: var(--mono);
	}
	.matrix thead th {
		font-size: 12px;
		color: var(--fg-4);
		font-weight: 600;
	}
	.yes {
		display: inline-grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: var(--ok-bg);
		color: var(--ok-fg);
	}
	.yes :global(svg) {
		width: 14px;
		height: 14px;
	}
	.no {
		color: var(--fg-5);
	}
	.vfilters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}
	.vfilters .select {
		width: auto;
		padding-block: 8px;
		font-size: 14px;
	}
	.vname {
		display: block;
		margin-bottom: 4px;
	}
	.vname:hover strong {
		color: var(--accent-fg);
	}
</style>
