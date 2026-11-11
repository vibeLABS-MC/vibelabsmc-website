<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, Download, ShieldCheck } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { fileSize, timeAgo } from '#lib/format.ts';
	import { projectPath } from '#lib/marketplace/taxonomy.ts';

	let { data, form } = $props();
</script>

<Seo title="Flagged files" description="Files waiting for a person." />

<p class="muted small">
	Files the virus scanner couldn’t clear on its own: too big to scan, or the scanner was down.
	Download one only into a sandbox or virtual machine, check it, then clear or remove it.
</p>
{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}

{#if data.files.length}
	<div class="card table-wrap">
		<table class="table">
			<thead><tr><th>File</th><th>Project</th><th>Status</th><th>Decision</th></tr></thead>
			<tbody>
				{#each data.files as row (row.file.id)}
					<tr>
						<td
							><strong>{row.file.filename}</strong><br /><span class="tiny muted"
								>{fileSize(row.file.size)} · {timeAgo(row.file.createdAt)} ·
								<span class="mono">{row.file.sha1.slice(0, 12)}</span></span
							></td
						>
						<td
							><a class="link" href={projectPath(row.project.type, row.project.slug)}
								>{row.project.name}</a
							><br /><span class="tiny muted">version {row.version.number}</span></td
						>
						<td
							><span class="badge warn">{row.file.scanStatus}</span><br /><span class="tiny muted"
								>{row.file.scanDetail ?? ''}</span
							></td
						>
						<td>
							<form method="POST" action="?/verdict" class="verdict" use:enhance>
								<input type="hidden" name="file" value={row.file.id} />
								<input
									class="input"
									name="note"
									maxlength="500"
									placeholder="Note (needed to remove)"
									aria-label="Note"
								/>
								<div class="row-gap">
									<a
										class="btn ghost sm"
										href="/download/{row.file.id}/{encodeURIComponent(row.file.filename)}"
										data-sveltekit-reload
										aria-label="Download for checking"><Download aria-hidden="true" /></a
									>
									<button class="btn secondary sm" name="verdict" value="clean"
										><ShieldCheck aria-hidden="true" />Clear</button
									>
									<button class="btn danger sm" name="verdict" value="infected">Remove</button>
								</div>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="card empty">
		<span class="empty-icon"><ShieldCheck aria-hidden="true" /></span>
		<h3>Nothing flagged</h3>
		<p>Every file has been scanned clean.</p>
	</div>
{/if}

<style>
	.verdict {
		display: grid;
		gap: 6px;
		min-width: 260px;
	}
	.verdict .input {
		padding: 6px 10px;
		font-size: 14px;
	}
</style>
