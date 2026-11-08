<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import SearchDialog from '#lib/components/SearchDialog.svelte';
	import { copyCode } from '#lib/copy.ts';

	let { children } = $props();
</script>

<svelte:document onclick={copyCode} />

<a class="skip" href="#main">Skip to content</a>
{@render children()}
<SearchDialog />
