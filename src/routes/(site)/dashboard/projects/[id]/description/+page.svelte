<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck } from '@lucide/svelte';
	import MarkdownEditor from '#lib/components/MarkdownEditor.svelte';
	import Seo from '#lib/components/Seo.svelte';

	let { data, form } = $props();
	const template = `## Features\n\n- \n\n## Installation\n\n1. Install Iris (or OptiFine).\n2. Put the zip in your shaderpacks folder.\n\n## Requirements\n\n## Known issues\n`;
</script>

<Seo title="Description of {data.project.name}" description="Project description." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}
{#if form && 'saved' in form}<p class="alert ok" role="status">
		<CircleCheck aria-hidden="true" />Description saved.
	</p>{/if}

<form
	method="POST"
	class="card panel"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	<header>
		<h2>Description</h2>
		<p>
			What it does, how to install it, what it needs. Markdown works: headings, lists, links, tables
			and code. Images can only come from your gallery.
		</p>
	</header>
	<MarkdownEditor
		name="description"
		value={data.project.description || template}
		images={data.images}
	/>
	<footer>
		<button class="btn primary" disabled={data.project.status === 'in_review'}
			>Save description</button
		>
	</footer>
</form>
