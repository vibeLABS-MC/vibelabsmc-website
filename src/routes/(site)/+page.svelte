<script lang="ts">
	import { ArrowRight, ArrowUpRight, BookOpen, Code, Layers } from '@lucide/svelte';
	import BrandIcon from '#lib/components/BrandIcon.svelte';
	import Faq from '#lib/components/Faq.svelte';
	import FrameStrip from '#lib/components/FrameStrip.svelte';
	import PathTabs from '#lib/components/PathTabs.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { docsUrl, SITE } from '#lib/site.ts';

	const principles = [
		{
			icon: Layers,
			title: 'Iris and OptiFine, side by side',
			text: 'Every page says which loader it covers, and calls out the places where the two behave differently.'
		},
		{
			icon: Code,
			title: 'Code written to compile',
			text: 'GLSL examples use the same setup a real pack does, so they work when you paste them in.'
		},
		{
			icon: BookOpen,
			title: 'Grounded in the official references',
			text: 'Pages point to shaders.properties, OptiFine’s shaders.txt, the Iris source and the LabPBR spec.'
		}
	];
</script>

<Seo
	description="vibeLABS is a community for Minecraft shader players and developers. Free docs take you from installing your first shaderpack to writing GLSL for Iris and OptiFine."
/>

<main id="main">
	<section class="hero">
		<div class="container">
			<a class="pill" href={docsUrl()}>
				<span class="pill-tag">Docs</span>
				15 pages for Iris and OptiFine
				<ArrowRight aria-hidden="true" />
			</a>
			<h1>Minecraft shaders, explained</h1>
			<p class="lede">
				vibeLABS is a community for people who play with shaders and people who write them. Our free
				docs take you from installing your first shaderpack to writing your own GLSL.
			</p>
			<div class="ctas">
				<a class="btn primary lg" href={docsUrl()}>Read the docs</a>
				<a class="btn secondary lg" href={docsUrl('/developing/first-shaderpack/')}
					>Write your first shader</a
				>
			</div>
			<div class="visual">
				<FrameStrip />
			</div>
		</div>
	</section>

	<section class="section" aria-labelledby="start-title">
		<div class="container">
			<p class="eyebrow">Get started</p>
			<h2 id="start-title">Start where you are</h2>
			<p class="sub">Two paths through the docs. Pick one, and each step links to its guide.</p>
			<PathTabs />
		</div>
	</section>

	<section class="section muted" aria-labelledby="why-title">
		<div class="container">
			<p class="eyebrow">How the docs are written</p>
			<h2 id="why-title">Plain words, real sources</h2>
			<ul class="principles">
				{#each principles as item (item.title)}
					{@const Icon = item.icon}
					<li>
						<span class="icon"><Icon aria-hidden="true" /></span>
						<h3>{item.title}</h3>
						<p>{item.text}</p>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="section" aria-labelledby="faq-title">
		<div class="container faq-layout">
			<div>
				<p class="eyebrow">Questions</p>
				<h2 id="faq-title">New to shaders?</h2>
				<p class="sub">The short answers. Each one links to the guide with the full story.</p>
			</div>
			<Faq />
		</div>
	</section>

	<section class="section" aria-labelledby="help-title">
		<div class="container">
			<div class="cta">
				<div>
					<h2 id="help-title">Help write the docs</h2>
					<p>
						The docs are written in the open. Fix a mistake, explain something more clearly, or add
						the page you wish existed.
					</p>
				</div>
				<div class="cta-actions">
					<a class="btn secondary lg" href={SITE.docsRepo}
						><BrandIcon name="github" />Contribute on GitHub</a
					>
					{#if SITE.discord}
						<a class="btn primary lg" href={SITE.discord}
							><BrandIcon name="discord" />Join the Discord<ArrowUpRight aria-hidden="true" /></a
						>
					{/if}
				</div>
			</div>
		</div>
	</section>
</main>

<style>
	.hero {
		position: relative;
		padding: 96px 0 0;
		text-align: center;
		overflow: hidden;
	}
	/* A faint grid that fades out towards the edges. */
	.hero::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: 640px;
		background-image:
			linear-gradient(var(--line) 1px, transparent 1px),
			linear-gradient(90deg, var(--line) 1px, transparent 1px);
		background-size: 48px 48px;
		background-position: center top;
		mask-image: radial-gradient(ellipse 60% 70% at 50% 0%, #000 30%, transparent 75%);
		opacity: 0.7;
		pointer-events: none;
	}
	.hero .container {
		position: relative;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px 4px 4px;
		border-radius: 999px;
		font-size: 14px;
		line-height: 20px;
		font-weight: 500;
		color: var(--fg-2);
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			var(--shadow-xs);
		transition: box-shadow 0.15s;
	}
	.pill:hover {
		box-shadow:
			inset 0 0 0 1px var(--accent-line),
			var(--shadow-sm);
	}
	.pill-tag {
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 12px;
		line-height: 18px;
		font-weight: 600;
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.pill :global(svg) {
		width: 16px;
		height: 16px;
		color: var(--fg-4);
	}
	h1 {
		margin: 24px auto 0;
		max-width: 880px;
		font-size: clamp(40px, 6.4vw, 64px);
		line-height: 1.1;
		letter-spacing: -0.025em;
		font-weight: 600;
		text-wrap: balance;
	}
	.lede {
		margin: 24px auto 0;
		max-width: 640px;
		font-size: 20px;
		line-height: 30px;
		color: var(--fg-3);
		text-wrap: pretty;
	}
	.ctas {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 40px;
	}
	.btn.lg {
		padding: 12px 20px;
		font-size: 16px;
		line-height: 24px;
	}
	.visual {
		margin: 64px auto 0;
		max-width: 1024px;
		text-align: left;
	}

	.section {
		padding: 96px 0;
	}
	.section.muted {
		background: var(--bg-subtle);
		border-block: 1px solid var(--line);
	}
	h2 {
		margin-top: 12px;
		font-size: clamp(30px, 3.6vw, 36px);
		line-height: 1.22;
		letter-spacing: -0.02em;
		font-weight: 600;
	}
	.sub {
		margin: 16px 0 40px;
		max-width: 640px;
		font-size: 18px;
		line-height: 28px;
		color: var(--fg-3);
	}

	.principles {
		list-style: none;
		padding: 0;
		margin-top: 48px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 32px;
	}
	.principles .icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 10px;
		color: var(--fg-2);
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			var(--shadow-xs);
	}
	.principles .icon :global(svg) {
		width: 24px;
		height: 24px;
	}
	.principles h3 {
		margin-top: 20px;
		font-size: 20px;
		line-height: 30px;
		font-weight: 600;
	}
	.principles p {
		margin-top: 8px;
		color: var(--fg-3);
	}

	.faq-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
		gap: 64px;
		align-items: start;
	}

	.cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		flex-wrap: wrap;
		padding: 48px;
		border-radius: 16px;
		background: var(--bg-subtle);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.cta h2 {
		margin: 0;
		font-size: 30px;
	}
	.cta p {
		margin-top: 12px;
		max-width: 560px;
		font-size: 18px;
		line-height: 28px;
		color: var(--fg-3);
	}
	.cta-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	@media (max-width: 860px) {
		.hero {
			padding-top: 64px;
		}
		.lede {
			font-size: 18px;
			line-height: 28px;
		}
		.section {
			padding: 64px 0;
		}
		.principles,
		.faq-layout {
			grid-template-columns: 1fr;
		}
		.faq-layout {
			gap: 24px;
		}
		.cta {
			padding: 32px 24px;
		}
	}
	@media (max-width: 560px) {
		.ctas .btn {
			flex: 1 1 100%;
		}
	}
</style>
