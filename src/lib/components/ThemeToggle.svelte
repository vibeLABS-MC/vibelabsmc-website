<script lang="ts">
	import { Toggle } from 'bits-ui';
	import { Moon, Sun } from '@lucide/svelte';
	import Hint from './Hint.svelte';
	import { initialTheme } from '#lib/theme.ts';

	let dark = $state(false);

	$effect(() => {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem('theme');
		} catch {
			// Storage can be blocked; the system theme still applies.
		}
		dark = initialTheme(saved, matchMedia('(prefers-color-scheme: dark)').matches) === 'dark';
	});

	function apply(pressed: boolean) {
		const theme = pressed ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// The choice then lasts for this page only.
		}
	}
</script>

<Hint label={dark ? 'Use light theme' : 'Use dark theme'}>
	{#snippet children(props)}
		<Toggle.Root
			{...props}
			bind:pressed={dark}
			onPressedChange={apply}
			class="btn ghost"
			aria-label="Dark theme"
		>
			{#if dark}<Sun aria-hidden="true" />{:else}<Moon aria-hidden="true" />{/if}
		</Toggle.Root>
	{/snippet}
</Hint>
