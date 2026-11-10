<script lang="ts">
	import Logo from './Logo.svelte';
	import { NAV } from '#lib/nav.ts';
	import { docsUrl, SITE } from '#lib/site.ts';

	const columns = [
		{ title: 'Docs', links: NAV },
		{
			title: 'Project',
			links: [
				{ label: 'Docs on GitHub', href: SITE.docsRepo },
				{ label: 'Website on GitHub', href: SITE.repo },
				{ label: 'Glossary', href: docsUrl('/reference/glossary/') },
				...(SITE.discord ? [{ label: 'Discord', href: SITE.discord }] : [])
			]
		}
	];
</script>

<footer class="foot">
	<div class="container">
		<div class="row">
			<div class="brand">
				<a href="/" aria-label="{SITE.name} home"><Logo height={32} /></a>
				<p>{SITE.tagline}</p>
			</div>
			<div class="cols">
				{#each columns as column (column.title)}
					<div>
						<h2>{column.title}</h2>
						<ul>
							{#each column.links as link (link.href)}
								<li><a href={link.href}>{link.label}</a></li>
							{/each}
						</ul>
					</div>
				{/each}
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
		padding-block: 64px 48px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 48px;
		flex-wrap: wrap;
	}
	.brand a {
		display: inline-flex;
		color: var(--fg);
		border-radius: 6px;
	}
	.brand p {
		margin-top: 20px;
		max-width: 320px;
		color: var(--fg-3);
	}
	.cols {
		display: flex;
		gap: 64px;
	}
	h2 {
		font-size: 14px;
		line-height: 20px;
		font-weight: 600;
		color: var(--fg-4);
		margin-bottom: 16px;
	}
	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 12px;
	}
	li a {
		font-weight: 600;
		color: var(--fg-3);
	}
	li a:hover {
		color: var(--fg);
	}
	.legal {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px 32px;
		margin-top: 64px;
		padding-top: 32px;
		border-top: 1px solid var(--line);
		font-size: 14px;
		color: var(--fg-4);
	}
	@media (max-width: 560px) {
		.cols {
			gap: 40px;
		}
	}
</style>
