<script lang="ts">
	import { LockKeyhole } from '@lucide/svelte';

	let { href }: { href: string } = $props();
</script>

<div class="alert warn sudo">
	<LockKeyhole aria-hidden="true" />
	<span>Changes here need a fresh check that it’s you.</span>
	<a class="btn secondary sm" href="/auth/confirm?next={encodeURIComponent(href)}"
		>Confirm it’s you</a
	>
</div>

<style>
	.sudo {
		align-items: center;
	}
	.sudo span {
		flex: 1;
	}
</style>
