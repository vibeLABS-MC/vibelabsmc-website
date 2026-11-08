<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';

	let dark = $state(false);

	$effect(() => {
		const chosen = document.documentElement.dataset.theme;
		dark = chosen ? chosen === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggle() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// Storage can be blocked; the choice then lasts for this page only.
		}
	}
</script>

<button
	type="button"
	class="btn ghost"
	onclick={toggle}
	aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
>
	{#if dark}<Sun size={20} aria-hidden="true" />{:else}<Moon size={20} aria-hidden="true" />{/if}
</button>
