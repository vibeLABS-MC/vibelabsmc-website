<script lang="ts">
	import { siDiscord, siGithub } from 'simple-icons';

	let { name, size = 20 }: { name: 'github' | 'discord'; size?: number } = $props();
	const icon = $derived(name === 'github' ? siGithub : siDiscord);
</script>

<svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
	<path d={icon.path} />
</svg>
