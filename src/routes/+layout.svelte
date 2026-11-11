<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.css';
	import '#lib/styles/ui.css';
	import { Tooltip } from 'bits-ui';

	let { children } = $props();
</script>

<a class="skip" href="#main">Skip to content</a>
<Tooltip.Provider>
	{@render children()}
</Tooltip.Provider>
