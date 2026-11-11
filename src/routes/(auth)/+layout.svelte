<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<div class="auth-shell">
	<header class="auth-top">
		<a class="home" href="/" aria-label="vibeLABS home"><Logo height={28} /></a>
		<ThemeToggle />
	</header>
	<main id="main" class="auth-main">
		{@render children()}
	</main>
	<footer class="auth-foot">
		<span>© {new Date().getFullYear()} vibeLABS</span>
		<span class="auth-links">
			<a href="/legal/terms">Terms</a>
			<a href="/legal/privacy">Privacy</a>
		</span>
	</footer>
</div>

<style>
	.auth-shell {
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr auto;
		background: radial-gradient(60% 50% at 50% 0%, var(--accent-bg), transparent 70%), var(--bg);
	}
	.auth-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 32px;
	}
	.home {
		display: flex;
		color: var(--fg);
		border-radius: 6px;
	}
	.auth-main {
		display: grid;
		justify-items: center;
		align-content: start;
		padding: 48px 16px 64px;
	}
	.auth-foot {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 24px 32px;
		font-size: 14px;
		color: var(--fg-4);
	}
	.auth-links {
		display: flex;
		gap: 16px;
	}
	.auth-links a:hover {
		color: var(--fg);
	}
	@media (max-width: 640px) {
		.auth-top,
		.auth-foot {
			padding-inline: 16px;
		}
		.auth-main {
			padding-top: 16px;
		}
	}
</style>
