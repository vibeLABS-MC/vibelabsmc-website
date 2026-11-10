<script lang="ts">
	import { LOGO } from '#lib/brand/logo.ts';

	/** Height in pixels; the width follows the wordmark's shape. */
	let { height = 28 }: { height?: number } = $props();
</script>

<svg
	class="logo"
	viewBox="0 0 {LOGO.width} {LOGO.height}"
	{height}
	width={Math.round((height * LOGO.width) / LOGO.height)}
	aria-hidden="true"
>
	<path d={LOGO.path} fill="currentColor" fill-rule="evenodd" />
</svg>
