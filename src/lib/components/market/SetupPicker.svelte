<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Popover } from 'bits-ui';
	import { Gamepad2, X } from '@lucide/svelte';
	import { LOADER_NAMES, type Loader } from '#lib/marketplace/taxonomy.ts';
	import { serialiseSetup, SETUP_COOKIE, type Setup } from '#lib/marketplace/setup.ts';

	let { setup, versions, loaders }: { setup: Setup; versions: string[]; loaders: Loader[] } =
		$props();
	let open = $state(false);
	let version = $state('');
	let loader = $state('');

	$effect(() => {
		if (open) {
			version = setup.version ?? '';
			loader = setup.loader ?? '';
		}
	});

	async function save(next: Setup) {
		const secure = location.protocol === 'https:' ? '; secure' : '';
		document.cookie = `${SETUP_COOKIE}=${serialiseSetup(next)}; path=/; max-age=31536000; samesite=lax${secure}`;
		open = false;
		await invalidateAll();
	}
	const label = $derived(
		setup.version || setup.loader
			? [setup.version, setup.loader ? LOADER_NAMES[setup.loader as Loader] : null]
					.filter(Boolean)
					.join(' · ')
			: 'Set your game'
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="btn secondary setup-trigger {setup.version || setup.loader ? 'active' : ''}"
	>
		<Gamepad2 aria-hidden="true" />{label}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content class="popover setup-pop" align="end" sideOffset={8}>
			<p class="setup-title">Your game</p>
			<p class="setup-note">Cards show what works with it, and Download picks the right file.</p>
			<label class="label" for="setup-version">Minecraft version</label>
			<select class="select" id="setup-version" bind:value={version}>
				<option value="">Any version</option>
				{#each versions as v (v)}<option value={v}>{v}</option>{/each}
			</select>
			{#if loaders.length}
				<label class="label" for="setup-loader">Loader</label>
				<select class="select" id="setup-loader" bind:value={loader}>
					<option value="">Any loader</option>
					{#each loaders as l (l)}<option value={l}>{LOADER_NAMES[l]}</option>{/each}
				</select>
			{/if}
			<div class="setup-actions">
				{#if setup.version || setup.loader}
					<button
						type="button"
						class="btn ghost sm"
						onclick={() => save({ version: null, loader: null })}
						><X aria-hidden="true" />Clear</button
					>
				{/if}
				<button
					type="button"
					class="btn primary sm"
					onclick={() => save({ version: version || null, loader: loader || null })}>Save</button
				>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
