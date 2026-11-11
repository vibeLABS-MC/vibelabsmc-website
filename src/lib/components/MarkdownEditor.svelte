<script lang="ts">
	import { Tabs } from 'bits-ui';

	let {
		name,
		value = '',
		rows = 18,
		maxlength = 100000,
		placeholder = '',
		images = []
	}: {
		name: string;
		value?: string;
		rows?: number;
		maxlength?: number;
		placeholder?: string;
		images?: { key: string; title: string }[];
	} = $props();

	let text = $state('');
	$effect(() => {
		text = value;
	});
	let html = $state('');
	let tab = $state('write');
	let area = $state<HTMLTextAreaElement>();

	async function preview() {
		const response = await fetch('/api/markdown', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ source: text })
		});
		html = response.ok ? (await response.json()).html : '<p>Preview unavailable.</p>';
	}
	$effect(() => {
		if (tab === 'preview') void preview();
	});

	function insert(snippet: string) {
		if (!area) return;
		const start = area.selectionStart;
		text = text.slice(0, start) + snippet + text.slice(area.selectionEnd);
		tab = 'write';
	}
</script>

<Tabs.Root bind:value={tab} class="md-editor">
	<div class="md-bar">
		<Tabs.List class="md-tabs">
			<Tabs.Trigger value="write" class="md-tab">Write</Tabs.Trigger>
			<Tabs.Trigger value="preview" class="md-tab">Preview</Tabs.Trigger>
		</Tabs.List>
		{#if images.length}
			<select
				class="select md-insert"
				aria-label="Insert a gallery image"
				onchange={(e) => {
					const key = e.currentTarget.value;
					if (key)
						insert(
							`\n![${images.find((i) => i.key === key)?.title || 'Screenshot'}](/media/${key}.webp)\n`
						);
					e.currentTarget.value = '';
				}}
			>
				<option value="">Insert screenshot…</option>
				{#each images as image (image.key)}<option value={image.key}
						>{image.title || image.key.slice(0, 8)}</option
					>{/each}
			</select>
		{/if}
		<span class="muted tiny">Markdown · {text.length.toLocaleString('en-GB')} characters</span>
	</div>
	<Tabs.Content value="write">
		<textarea
			class="textarea code"
			{name}
			{rows}
			{maxlength}
			{placeholder}
			bind:value={text}
			bind:this={area}></textarea>
	</Tabs.Content>
	<Tabs.Content value="preview">
		<input type="hidden" {name} value={text} disabled={tab !== 'preview'} />
		<div class="prose md-preview">{@html html}</div>
	</Tabs.Content>
</Tabs.Root>

<style>
	:global(.md-editor) {
		display: grid;
		gap: 8px;
	}
	.md-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.md-bar :global(.md-tabs) {
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 10px;
		background: var(--bg-muted);
	}
	.md-bar :global(.md-tab) {
		border: 0;
		background: none;
		padding: 6px 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		color: var(--fg-3);
		cursor: pointer;
	}
	.md-bar :global(.md-tab[data-state='active']) {
		background: var(--bg-raised);
		color: var(--fg);
		box-shadow: var(--shadow-xs);
	}
	.md-insert {
		width: auto;
		padding: 6px 32px 6px 10px;
		font-size: 14px;
	}
	.md-bar .tiny {
		margin-left: auto;
	}
	.md-preview {
		min-height: 360px;
		padding: 16px 20px;
		border-radius: 8px;
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
</style>
