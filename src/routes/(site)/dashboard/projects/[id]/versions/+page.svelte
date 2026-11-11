<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		PackagePlus,
		Pencil,
		ShieldAlert,
		ShieldCheck,
		ShieldQuestion,
		Trash2
	} from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { compact, shortDate } from '#lib/format.ts';
	import { LOADER_NAMES, type Loader } from '#lib/marketplace/taxonomy.ts';

	let { data } = $props();
	const base = $derived(`/dashboard/projects/${data.project.id}/versions`);
	const SCAN = {
		clean: { icon: ShieldCheck, tone: 'ok', text: 'Scanned clean' },
		review: { icon: ShieldQuestion, tone: 'warn', text: 'Waiting for a moderator' },
		pending: { icon: ShieldQuestion, tone: 'warn', text: 'Scan pending' },
		error: { icon: ShieldQuestion, tone: 'warn', text: 'Scan failed, retrying' },
		infected: { icon: ShieldAlert, tone: 'error', text: 'Removed' }
	} as const;
</script>

<Seo title="Versions of {data.project.name}" description="Project versions." />

<div class="head">
	<p class="muted">{data.versions.length} {data.versions.length === 1 ? 'version' : 'versions'}</p>
	<a class="btn primary" href="{base}/new"><PackagePlus aria-hidden="true" />New version</a>
</div>

{#if data.versions.length}
	<div class="card table-wrap">
		<table class="table">
			<thead
				><tr
					><th>Version</th><th>Minecraft</th><th>Files</th><th>Downloads</th><th>Published</th><th
					></th></tr
				></thead
			>
			<tbody>
				{#each data.versions as v (v.id)}
					<tr>
						<td>
							<strong>{v.name}</strong>
							<span class="row-gap tiny"
								><span class="badge {v.channel === 'release' ? 'ok' : 'warn'}">{v.channel}</span
								><span class="mono">{v.versionNumber}</span>{#if v.status === 'withheld'}<span
										class="badge error">withheld by moderators</span
									>{/if}</span
							>
						</td>
						<td class="small"
							>{v.gameVersions.slice(0, 4).join(', ')}{v.gameVersions.length > 4
								? ` +${v.gameVersions.length - 4}`
								: ''}{#if v.loaders.length}<br /><span class="muted"
									>{v.loaders.map((l) => LOADER_NAMES[l as Loader] ?? l).join(', ')}</span
								>{/if}</td
						>
						<td>
							{#each v.files as f (f.id)}
								{@const s = SCAN[f.scanStatus as keyof typeof SCAN]}
								<span class="file"
									><span class="badge {s.tone}" title={f.scanDetail ?? s.text}
										><s.icon aria-hidden="true" />{s.text}</span
									><span class="tiny muted">{f.filename}</span></span
								>
							{/each}
						</td>
						<td>{compact(v.downloads)}</td>
						<td>{shortDate(v.publishedAt)}</td>
						<td>
							<div class="row-gap">
								<a class="btn ghost sm" href="{base}/{v.id}" aria-label="Edit {v.name}"
									><Pencil aria-hidden="true" /></a
								>
								<form
									method="POST"
									action="?/delete"
									use:enhance={({ cancel }) => {
										if (!confirm(`Delete ${v.name}? Its files and download count go with it.`))
											cancel();
									}}
								>
									<input type="hidden" name="id" value={v.id} />
									<button class="btn ghost sm" aria-label="Delete {v.name}"
										><Trash2 aria-hidden="true" /></button
									>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="card empty">
		<span class="empty-icon"><PackagePlus aria-hidden="true" /></span>
		<h3>No versions yet</h3>
		<p>Upload your first file. It’s checked and virus-scanned as it uploads.</p>
		<a class="btn primary" href="{base}/new">New version</a>
	</div>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.file {
		display: grid;
		gap: 2px;
		margin-bottom: 4px;
	}
	td strong {
		display: block;
		margin-bottom: 4px;
	}
</style>
