<script lang="ts">
	import { page } from '$app/state';
	import { KeyRound, ShieldCheck, UserRound } from '@lucide/svelte';

	let { children } = $props();
	const links = [
		{ href: '/settings', label: 'Profile', icon: UserRound },
		{ href: '/settings/account', label: 'Account', icon: KeyRound },
		{ href: '/settings/security', label: 'Security', icon: ShieldCheck }
	];
</script>

<main id="main" class="container page">
	<header class="page-head">
		<div>
			<h1>Settings</h1>
			<p>Your profile, sign-in methods and security.</p>
		</div>
	</header>
	<div class="side-layout">
		<nav class="side-nav" aria-label="Settings">
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}
					><link.icon aria-hidden="true" />{link.label}</a
				>
			{/each}
		</nav>
		<div>{@render children()}</div>
	</div>
</main>
