<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { CircleAlert, Download, FileArchive, X } from '@lucide/svelte';
	import { fileSize } from '#lib/format.ts';
	import { bestVersion, type Setup } from '#lib/marketplace/setup.ts';
	import { LOADER_NAMES, type Loader } from '#lib/marketplace/taxonomy.ts';
	import { compareVersions } from '#lib/marketplace/versions.ts';

	interface FileInfo {
		id: string;
		filename: string;
		size: number;
		primary: boolean;
		scanStatus: string;
	}
	interface VersionInfo {
		id: string;
		versionNumber: string;
		name: string;
		channel: string;
		gameVersions: string[];
		loaders: string[];
		files: FileInfo[];
	}

	let {
		versions,
		loaders,
		setup,
		projectName,
		versionsHref
	}: {
		versions: VersionInfo[];
		loaders: Loader[];
		setup: Setup;
		projectName: string;
		versionsHref: string;
	} = $props();

	let open = $state(false);
	let gameVersion = $state('');
	let loader = $state('');
	$effect(() => {
		if (open) {
			gameVersion =
				setup.version && offered.includes(setup.version) ? setup.version : (offered[0] ?? '');
			loader =
				setup.loader && loaders.includes(setup.loader as Loader)
					? setup.loader
					: (loaders[0] ?? '');
		}
	});
	const offered = $derived(
		[...new Set(versions.flatMap((v) => v.gameVersions))].sort(compareVersions)
	);
	const chosen = $derived(
		bestVersion(
			versions,
			{ version: gameVersion || null, loader: loader || null },
			loaders.length > 0
		)
	);
	const downloadable = $derived(chosen?.files.filter((f) => f.scanStatus === 'clean') ?? []);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class="btn primary lg" disabled={!versions.length}
		><Download aria-hidden="true" />Download</Dialog.Trigger
	>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-overlay" />
		<Dialog.Content class="dialog">
			<Dialog.Title>Download {projectName}</Dialog.Title>
			<Dialog.Description class="dialog-desc"
				>Pick your game and we’ll find the right file.</Dialog.Description
			>
			<Dialog.Close class="btn ghost dialog-close" aria-label="Close"
				><X aria-hidden="true" /></Dialog.Close
			>
			<div class="dialog-body pickers">
				<div class="field">
					<label for="dl-version">Minecraft version</label>
					<select class="select" id="dl-version" bind:value={gameVersion}>
						{#each offered as v (v)}<option value={v}>{v}</option>{/each}
					</select>
				</div>
				{#if loaders.length}
					<div class="field">
						<label for="dl-loader">Loader</label>
						<select class="select" id="dl-loader" bind:value={loader}>
							{#each loaders as l (l)}<option value={l}>{LOADER_NAMES[l]}</option>{/each}
						</select>
					</div>
				{/if}
			</div>
			{#if chosen}
				<div class="match">
					<div class="match-head">
						<strong>{chosen.name}</strong>
						<span class="badge {chosen.channel === 'release' ? 'ok' : 'warn'}"
							>{chosen.channel}</span
						>
					</div>
					<p class="muted small">
						Version {chosen.versionNumber} · {chosen.gameVersions.length} Minecraft versions{chosen
							.loaders.length
							? ` · ${chosen.loaders.map((l) => LOADER_NAMES[l as Loader] ?? l).join(', ')}`
							: ''}
					</p>
					<ul class="files">
						{#each downloadable as file (file.id)}
							<li>
								<FileArchive aria-hidden="true" />
								<span class="fname"
									>{file.filename}<span class="muted tiny"
										>{fileSize(file.size)}{file.primary ? ' · main file' : ''}</span
									></span
								>
								<a
									class="btn {file.primary ? 'primary' : 'secondary'} sm"
									href="/download/{file.id}/{encodeURIComponent(file.filename)}"
									data-sveltekit-reload><Download aria-hidden="true" />Download</a
								>
							</li>
						{/each}
					</ul>
					{#if !downloadable.length}<p class="alert warn">
							<CircleAlert aria-hidden="true" />This version’s files are still being checked.
						</p>{/if}
				</div>
			{:else}
				<p class="alert warn match">
					<CircleAlert aria-hidden="true" />No version supports that combination yet.
				</p>
			{/if}
			<p class="all">
				<a class="link small" href={versionsHref} onclick={() => (open = false)}
					>See every version</a
				>
			</p>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
