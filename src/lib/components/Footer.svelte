<script lang="ts">
	import type { NavGroup } from '#lib/docs/summary.ts';
	import { SITE } from '#lib/site.ts';

	let { nav }: { nav: NavGroup[] } = $props();
	const columns = $derived(nav.filter((g) => g.id === 'using' || g.id === 'developing'));
</script>

<footer class="foot">
	<div class="container">
		<div class="row">
			<div class="brand">
				<a href="/" aria-label="{SITE.name} home"><span class="logo"></span></a>
				<p>{SITE.tagline}</p>
			</div>
			<div class="cols">
				{#each columns as group (group.id)}
					<div>
						<h2>{group.title}</h2>
						<ul>
							{#each group.pages.slice(0, 4) as item (item.slug)}
								<li><a href="/docs/{item.slug}">{item.title}</a></li>
							{/each}
						</ul>
					</div>
				{/each}
				<div>
					<h2>Project</h2>
					<ul>
						<li><a href="/docs">All docs</a></li>
						<li><a href={SITE.repo}>GitHub</a></li>
						<li><a href="{SITE.repo}/blob/main/CONTRIBUTING.md">Contribute</a></li>
						{#if SITE.discord}<li><a href={SITE.discord}>Discord</a></li>{/if}
					</ul>
				</div>
			</div>
		</div>
		<div class="legal">
			<span>© {new Date().getFullYear()} vibeLABS</span>
			<span
				>Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</span
			>
		</div>
	</div>
</footer>

<style>
	.foot {
		border-top: 1px solid var(--line);
		padding-block: 48px;
		margin-top: 96px;
	}
	.row {
		display: flex;
		gap: 64px;
		flex-wrap: wrap;
	}
	.brand a {
		color: var(--fg);
		display: inline-block;
	}
	.brand .logo {
		height: 34px;
	}
	.brand p {
		margin-top: 16px;
		max-width: 300px;
		font-size: 15px;
		color: var(--fg-3);
	}
	.cols {
		display: flex;
		gap: 64px;
		margin-left: auto;
		flex-wrap: wrap;
	}
	h2 {
		font-size: 14px;
		font-weight: 600;
		color: var(--fg-4);
		margin-bottom: 14px;
	}
	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	li a {
		font-weight: 500;
		color: var(--fg-3);
		font-size: 15px;
	}
	li a:hover {
		color: var(--fg);
	}
	.legal {
		margin-top: 40px;
		padding-top: 24px;
		border-top: 1px solid var(--line);
		display: flex;
		flex-wrap: wrap;
		gap: 8px 24px;
		justify-content: space-between;
		color: var(--fg-4);
		font-size: 14px;
	}
</style>
