<script lang="ts">
	import {
		ArrowLeft,
		Copy,
		Download,
		FileArchive,
		ShieldCheck,
		ShieldQuestion
	} from '@lucide/svelte';
	import { compact, fileSize, shortDate } from '#lib/format.ts';
	import { LOADER_NAMES, projectPath, typeInfo, type Loader } from '#lib/marketplace/taxonomy.ts';
	import { summariseVersions } from '#lib/marketplace/versions.ts';

	let { data } = $props();
	const v = $derived(data.version);
	const base = $derived(projectPath(data.project.type, data.project.slug));
	const copy = (text: string) => navigator.clipboard.writeText(text);
	const KIND = {
		required: 'Required',
		optional: 'Optional',
		incompatible: 'Incompatible',
		embedded: 'Included'
	} as Record<string, string>;
</script>

<a class="back link small" href="{base}/versions"><ArrowLeft aria-hidden="true" />All versions</a>

<section class="card panel">
	<header class="vhead">
		<div>
			<h2>{v.name}</h2>
			<p class="row-gap small muted">
				<span class="badge {v.channel === 'release' ? 'ok' : 'warn'}">{v.channel}</span><span
					class="mono">{v.versionNumber}</span
				>· {shortDate(v.publishedAt)} · {compact(v.downloads)} downloads
			</p>
		</div>
	</header>
	<dl class="facts">
		<dt>Minecraft</dt>
		<dd>{summariseVersions(v.gameVersions, data.knownVersions)}</dd>
		{#if v.loaders.length}<dt>Loaders</dt>
			<dd>{v.loaders.map((l) => LOADER_NAMES[l as Loader] ?? l).join(', ')}</dd>{/if}
	</dl>
</section>

<section class="card panel">
	<h2>Files</h2>
	<ul class="vfiles">
		{#each v.files as file (file.id)}
			<li>
				<FileArchive aria-hidden="true" />
				<div class="fmeta">
					<strong
						>{file.filename}{#if file.primary}
							<span class="badge accent">main</span>{/if}</strong
					>
					<span class="muted tiny"
						>{fileSize(file.size)} ·
						{#if file.scanStatus === 'clean'}<span class="scan ok"
								><ShieldCheck aria-hidden="true" />Virus-scanned</span
							>{:else}<span class="scan warn"
								><ShieldQuestion aria-hidden="true" />Being checked</span
							>{/if}
					</span>
					<button
						type="button"
						class="hash mono tiny"
						title="Copy SHA-512"
						onclick={() => copy(file.sha512)}
						>sha512 {file.sha512.slice(0, 16)}…<Copy aria-hidden="true" /></button
					>
				</div>
				{#if file.scanStatus === 'clean'}<a
						class="btn primary sm"
						href="/download/{file.id}/{encodeURIComponent(file.filename)}"
						data-sveltekit-reload><Download aria-hidden="true" />Download</a
					>{/if}
			</li>
		{/each}
	</ul>
</section>

{#if v.dependencies.length}
	<section class="card panel">
		<h2>Dependencies</h2>
		<ul class="deps">
			{#each v.dependencies as dep (dep.projectId)}
				<li>
					<a class="link" href={projectPath(dep.type as never, dep.slug)}>{dep.name}</a><span
						class="badge {dep.kind === 'incompatible'
							? 'error'
							: dep.kind === 'required'
								? 'accent'
								: ''}">{KIND[dep.kind]}</span
					><span class="muted tiny">{typeInfo(dep.type as never).singular}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<section class="card panel">
	<h2>Changelog</h2>
	{#if v.changelog.trim()}<div class="prose">{@html data.changelogHtml}</div>{:else}<p
			class="muted small"
		>
			No changelog for this version.
		</p>{/if}
</section>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 12px;
	}
	.back :global(svg) {
		width: 16px;
		height: 16px;
	}
	.panel h2 {
		margin-bottom: 12px;
	}
	.vhead h2 {
		font-size: 22px;
		margin-bottom: 6px;
	}
	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px 24px;
		margin: 16px 0 0;
		font-size: 14px;
	}
	.facts dt {
		color: var(--fg-4);
	}
	.facts dd {
		margin: 0;
	}
	.vfiles,
	.deps {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.vfiles li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.vfiles li > :global(svg) {
		width: 24px;
		height: 24px;
		color: var(--fg-4);
		flex: none;
	}
	.fmeta {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 2px;
	}
	.fmeta strong {
		overflow-wrap: anywhere;
	}
	.scan {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-weight: 600;
	}
	.scan :global(svg) {
		width: 13px;
		height: 13px;
	}
	.scan.ok {
		color: var(--ok-fg);
	}
	.scan.warn {
		color: var(--warn-fg);
	}
	.hash {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--fg-4);
		cursor: pointer;
	}
	.hash :global(svg) {
		width: 12px;
		height: 12px;
	}
	.deps li {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.panel + .panel {
		margin-top: 16px;
	}
</style>
