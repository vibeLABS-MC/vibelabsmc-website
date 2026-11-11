<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		CircleAlert,
		FileArchive,
		Search,
		ShieldAlert,
		ShieldCheck,
		ShieldQuestion,
		Trash2,
		UploadCloud,
		X
	} from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import MarkdownEditor from '#lib/components/MarkdownEditor.svelte';
	import GameVersionPicker from '#lib/components/market/GameVersionPicker.svelte';
	import { fileSize } from '#lib/format.ts';
	import { LOADER_NAMES, typeInfo, type Loader } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
	interface Staged {
		id: string;
		filename: string;
		size: number;
		scanStatus: string;
		scanDetail: string | null;
		detected: { loaders?: string[] };
	}
	interface Uploading {
		key: string;
		filename: string;
		progress: number;
		phase: 'upload' | 'scan';
		error: string | null;
	}

	const info = $derived(typeInfo(data.project.type));
	let staged = $state<Staged[]>([]);
	$effect(() => {
		staged = data.staged;
	});
	let uploads = $state<Uploading[]>([]);
	let primary = $state('');
	let dragging = $state(false);
	let gameVersions = $state<string[]>([]);
	let loaders = $state<string[]>([]);
	let versionNumber = $state('');
	let channel = $state('release');
	let deps = $state<{ id: string; name: string; kind: string }[]>([]);
	let depQuery = $state('');
	let depResults = $state<{ id: string; name: string; type: string }[]>([]);
	let busy = $state(false);

	const detected = $derived(
		[...new Set(staged.flatMap((s) => s.detected.loaders ?? []))].filter((l) =>
			(info.loaders as string[]).includes(l)
		)
	);
	$effect(() => {
		if (!loaders.length && detected.length) loaders = [...detected];
	});
	$effect(() => {
		if (!primary && staged[0]) primary = staged[0].id;
	});

	function upload(file: File) {
		const key = `${file.name}-${file.size}-${Date.now()}`;
		uploads.push({ key, filename: file.name, progress: 0, phase: 'upload', error: null });
		const entry = () => uploads.find((u) => u.key === key)!;
		const xhr = new XMLHttpRequest();
		xhr.open('POST', `/api/projects/${data.project.id}/uploads`);
		xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
		xhr.setRequestHeader('content-type', 'application/octet-stream');
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) entry().progress = e.loaded / e.total;
			if (e.loaded === e.total) entry().phase = 'scan';
		};
		xhr.onload = () => {
			let body: Record<string, unknown> = {};
			try {
				body = JSON.parse(xhr.responseText);
			} catch {
				// not JSON
			}
			if (xhr.status === 200) {
				staged.push(body as unknown as Staged);
				uploads = uploads.filter((u) => u.key !== key);
			} else entry().error = (body.message as string) ?? `Upload failed (${xhr.status}).`;
		};
		xhr.onerror = () => (entry().error = 'The connection dropped. Try again.');
		xhr.send(file);
	}
	function pick(files: FileList | null | undefined) {
		for (const file of files ?? []) upload(file);
	}
	async function discard(id: string) {
		const response = await fetch(`/api/projects/${data.project.id}/uploads/${id}`, {
			method: 'DELETE'
		});
		if (response.ok) staged = staged.filter((s) => s.id !== id);
		if (primary === id) primary = staged[0]?.id ?? '';
	}
	let timer: ReturnType<typeof setTimeout>;
	function searchDeps() {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			if (depQuery.trim().length < 2) return (depResults = []);
			const response = await fetch(`/api/v1/search?q=${encodeURIComponent(depQuery)}`);
			depResults = response.ok
				? (await response.json()).hits
						.filter((h: { id: string }) => h.id !== data.project.id)
						.slice(0, 6)
				: [];
		}, 250);
	}
	const SCAN = {
		clean: ShieldCheck,
		review: ShieldQuestion,
		pending: ShieldQuestion,
		error: ShieldQuestion,
		infected: ShieldAlert
	} as const;
	const SCAN_TEXT: Record<string, string> = {
		clean: 'Virus-scanned, clean',
		review: 'Too big to scan automatically: a moderator will check it',
		pending: 'Scanner busy: it will be scanned shortly',
		error: 'Scan failed: it will be retried',
		infected: 'Malware found'
	};
</script>

<Seo
	title="New version of {data.project.name}"
	description="Upload files and publish a new version."
/>

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

<form
	method="POST"
	action="?/publish"
	class="stack"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
		};
	}}
>
	<section class="card panel">
		<header>
			<h2>Files</h2>
			<p>
				{info.extensions.join(' or ')} files up to 100 MB. Each file is opened, checked as a {info.singular.toLowerCase()}
				and virus-scanned as it uploads.
			</p>
		</header>
		<label
			class="dropzone {dragging ? 'over' : ''}"
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={(e) => {
				e.preventDefault();
				dragging = false;
				pick(e.dataTransfer?.files);
			}}
		>
			<UploadCloud aria-hidden="true" />
			<strong>Drop files here, or click to choose</strong>
			<span class="muted small">{info.extensions.join(', ')} · up to 100 MB each</span>
			<input
				class="sr-only"
				type="file"
				multiple
				accept={info.extensions.join(',')}
				onchange={(e) => {
					pick(e.currentTarget.files);
					e.currentTarget.value = '';
				}}
			/>
		</label>

		{#if uploads.length || staged.length}
			<ul class="files">
				{#each uploads as u (u.key)}
					<li class={u.error ? 'failed' : ''}>
						<FileArchive aria-hidden="true" />
						<div class="fbody">
							<strong>{u.filename}</strong>
							{#if u.error}<span class="field-error">{u.error}</span>{:else}
								<progress max="1" value={u.phase === 'scan' ? undefined : u.progress}></progress>
								<span class="muted tiny"
									>{u.phase === 'scan'
										? 'Checking and virus-scanning…'
										: `Uploading ${Math.round(u.progress * 100)}%`}</span
								>
							{/if}
						</div>
						{#if u.error}<button
								type="button"
								class="btn ghost sm"
								aria-label="Dismiss"
								onclick={() => (uploads = uploads.filter((x) => x.key !== u.key))}
								><X aria-hidden="true" /></button
							>{/if}
					</li>
				{/each}
				{#each staged as s (s.id)}
					{@const Icon = SCAN[s.scanStatus as keyof typeof SCAN] ?? ShieldQuestion}
					<li>
						<input type="hidden" name="files" value={s.id} />
						<FileArchive aria-hidden="true" />
						<div class="fbody">
							<strong>{s.filename}</strong>
							<span class="row-gap tiny">
								<span
									class="badge {s.scanStatus === 'clean' ? 'ok' : 'warn'}"
									title={s.scanDetail ?? ''}
									><Icon aria-hidden="true" />{SCAN_TEXT[s.scanStatus]}</span
								>
								<span class="muted">{fileSize(s.size)}</span>
								{#each s.detected.loaders ?? [] as l (l)}<span class="badge accent"
										>{LOADER_NAMES[l as Loader] ?? l}</span
									>{/each}
							</span>
						</div>
						{#if staged.length > 1}<label class="check primary"
								><input type="radio" name="primary" value={s.id} bind:group={primary} />Main file</label
							>{:else}<input type="hidden" name="primary" value={s.id} />{/if}
						<button
							type="button"
							class="btn ghost sm"
							aria-label="Remove {s.filename}"
							onclick={() => discard(s.id)}><Trash2 aria-hidden="true" /></button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card panel">
		<header><h2>Version</h2></header>
		<div class="form-grid">
			<div class="form-grid two">
				<div class="field">
					<label for="versionNumber">Version number</label><input
						class="input mono"
						id="versionNumber"
						name="versionNumber"
						required
						maxlength="32"
						pattern="[\w.+\-]+"
						bind:value={versionNumber}
						placeholder="1.4.0"
					/>
				</div>
				<div class="field">
					<label for="name">Name</label><input
						class="input"
						id="name"
						name="name"
						maxlength="64"
						placeholder="{data.project.name} {versionNumber || '1.4.0'}"
					/>
				</div>
			</div>
			<div class="field">
				<span class="label">Channel</span>
				<div class="channels">
					{#each [['release', 'Release', 'Stable, recommended for everyone'], ['beta', 'Beta', 'Mostly works, may have bugs'], ['alpha', 'Alpha', 'Experimental']] as [value, label, note] (value)}
						<label class="channel {channel === value ? 'on' : ''}"
							><input
								class="sr-only"
								type="radio"
								name="channel"
								{value}
								bind:group={channel}
							/><strong>{label}</strong><span class="muted tiny">{note}</span></label
						>
					{/each}
				</div>
			</div>
			<div class="field">
				<span class="label">Minecraft versions</span>
				<GameVersionPicker versions={data.gameVersions} bind:selected={gameVersions} />
			</div>
			{#if info.loaders.length}
				<div class="field">
					<span class="label">Loaders</span>
					{#if detected.length}<p class="field-hint">
							Found in your files: {detected.map((l) => LOADER_NAMES[l as Loader]).join(', ')}.
						</p>{/if}
					<div class="row-gap">
						{#each info.loaders as l (l)}<label class="check loader"
								><input
									type="checkbox"
									name="loaders"
									value={l}
									bind:group={loaders}
								/>{LOADER_NAMES[l]}</label
							>{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="card panel">
		<header>
			<h2>Changelog</h2>
			<p>What changed in this version. Followers see it in their update feed.</p>
		</header>
		<MarkdownEditor
			name="changelog"
			rows={10}
			maxlength={20000}
			placeholder="- Brighter sunsets&#10;- Fixed flickering water on AMD"
		/>
	</section>

	<section class="card panel">
		<header>
			<h2>Dependencies</h2>
			<p>Projects this version needs, works with, or breaks with.</p>
		</header>
		{#each deps as dep, i (dep.id)}
			<div class="dep">
				<input type="hidden" name="dependency" value="{dep.id}:{dep.kind}" />
				<strong>{dep.name}</strong>
				<select class="select" bind:value={deps[i]!.kind} aria-label="Relationship">
					<option value="required">Required</option><option value="optional">Optional</option
					><option value="incompatible">Incompatible</option><option value="embedded"
						>Included in the file</option
					>
				</select>
				<button
					type="button"
					class="btn ghost sm"
					aria-label="Remove"
					onclick={() => (deps = deps.filter((d) => d.id !== dep.id))}
					><X aria-hidden="true" /></button
				>
			</div>
		{/each}
		<div class="dep-search">
			<Search aria-hidden="true" />
			<input
				class="input"
				type="search"
				placeholder="Search the marketplace to add a dependency"
				bind:value={depQuery}
				oninput={searchDeps}
				aria-label="Search for a dependency"
			/>
		</div>
		{#if depResults.length}
			<ul class="dep-results">
				{#each depResults as r (r.id)}
					<li>
						<button
							type="button"
							class="menu-item"
							onclick={() => {
								if (!deps.some((d) => d.id === r.id))
									deps.push({ id: r.id, name: r.name, kind: 'required' });
								depResults = [];
								depQuery = '';
							}}
							>{r.name}<span class="muted tiny">{typeInfo(r.type as never).singular}</span></button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<div class="publish">
		<a class="btn ghost" href="/dashboard/projects/{data.project.id}/versions">Cancel</a>
		<button
			class="btn primary lg"
			disabled={busy || !staged.length || uploads.some((u) => !u.error) || !gameVersions.length}
			>{busy ? 'Publishing…' : 'Publish version'}</button
		>
	</div>
</form>

<style>
	.dropzone {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 32px;
		border-radius: 12px;
		border: 2px dashed var(--line-strong);
		cursor: pointer;
		text-align: center;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.dropzone:hover,
	.dropzone.over {
		border-color: var(--accent);
		background: var(--accent-bg);
	}
	.dropzone > :global(svg) {
		width: 32px;
		height: 32px;
		color: var(--fg-4);
	}
	.files {
		list-style: none;
		padding: 0;
		margin-top: 16px;
		display: grid;
		gap: 8px;
	}
	.files li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.files li.failed {
		box-shadow: inset 0 0 0 1px var(--err-line);
		background: var(--err-bg);
	}
	.files li > :global(svg) {
		width: 24px;
		height: 24px;
		color: var(--fg-4);
		flex: none;
	}
	.fbody {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 4px;
	}
	.fbody strong {
		overflow-wrap: anywhere;
	}
	progress {
		width: 100%;
		height: 6px;
		accent-color: var(--indigo-600);
	}
	.check.primary {
		white-space: nowrap;
	}
	.channels {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	.channel {
		display: grid;
		gap: 2px;
		padding: 12px 14px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--line-strong);
		cursor: pointer;
	}
	.channel.on {
		box-shadow:
			inset 0 0 0 2px var(--accent),
			0 0 0 4px var(--accent-bg);
	}
	.check.loader {
		padding: 8px 14px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--line-strong);
		align-items: center;
	}
	.check.loader input {
		margin: 0;
	}
	.dep {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 0;
	}
	.dep strong {
		flex: 1;
	}
	.dep .select {
		width: auto;
		padding-block: 6px;
		font-size: 14px;
	}
	.dep-search {
		position: relative;
		margin-top: 8px;
	}
	.dep-search :global(svg) {
		position: absolute;
		left: 12px;
		top: 50%;
		translate: 0 -50%;
		width: 18px;
		height: 18px;
		color: var(--fg-4);
	}
	.dep-search .input {
		padding-left: 38px;
	}
	.dep-results {
		list-style: none;
		padding: 4px;
		margin-top: 4px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.dep-results .menu-item {
		justify-content: space-between;
	}
	.publish {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}
	@media (max-width: 640px) {
		.channels {
			grid-template-columns: 1fr;
		}
	}
</style>
