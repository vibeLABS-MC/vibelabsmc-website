<script lang="ts">
	import type { PageProps } from './$types';
	import { ArrowRight, ArrowUpRight, ChevronsLeftRight } from '@lucide/svelte';
	import BrandIcon from '#lib/components/BrandIcon.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import SearchButton from '#lib/components/SearchButton.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { SECTION_ICONS } from '#lib/components/section-icons.ts';
	import { shortDate } from '#lib/docs/dates.ts';
	import { SITE } from '#lib/site.ts';

	let { data }: PageProps = $props();

	const titles = $derived(new Map(data.nav.map((g) => [g.id, g.title])));
	const popular = [
		{ label: 'gbuffers_water', href: '/docs/programs' },
		{ label: 'RENDERTARGETS', href: '/docs/rendering-pipeline#writing-to-render-targets' },
		{ label: 'frameTimeCounter', href: '/docs/uniforms' },
		{ label: 'block.properties', href: '/docs/block-ids' },
		{ label: 'LabPBR', href: '/docs/labpbr' }
	];
	const paths = $derived([
		{
			id: 'using' as const,
			title: 'Play with shaders',
			blurb: 'Get a shaderpack running and keep it fast.',
			pages: data.play,
			numbered: false
		},
		{
			id: 'developing' as const,
			title: 'Make shaders',
			blurb: 'Write your first shaderpack, step by step.',
			pages: data.make,
			numbered: true
		}
	]);
</script>

<Seo
	description="Free, community-written documentation for Minecraft shaders: install a shaderpack, fix what breaks, or write your own for Iris and OptiFine."
/>

<header class="hero">
	<div class="container top">
		<a class="home" href="/" aria-label="{SITE.name} home"><span class="logo"></span></a>
		<nav aria-label="Main">
			<a href="/docs">Docs</a>
			{#each data.nav.filter((g) => g.id === 'reference' || g.id === 'standards') as group (group.id)}
				<a href="/docs/{group.pages[0].slug}">{group.title}</a>
			{/each}
		</nav>
		<div class="right">
			<a class="btn ghost" href={SITE.repo} aria-label="vibeLABS docs on GitHub"
				><BrandIcon name="github" /></a
			>
			{#if SITE.discord}<a class="btn glass" href={SITE.discord}
					><BrandIcon name="discord" size={18} />Discord</a
				>{/if}
		</div>
	</div>
	<div class="container intro">
		<p class="pill"><b>Docs</b>Written by the community for Iris and OptiFine</p>
		<h1>Learn how Minecraft shaders work</h1>
		<p class="lede">
			Install a shaderpack, fix what breaks, or write your own from the first line of GLSL. Clear
			guides and an honest reference, free for everyone.
		</p>
		<div class="search">
			<SearchButton large label="Search the docs: programs, uniforms, render targets…" />
		</div>
		<p class="popular">
			Popular:
			{#each popular as item (item.label)}<a href={item.href}>{item.label}</a>{/each}
		</p>
	</div>
</header>

<main id="main" class="container">
	<div class="paths">
		{#each paths as path (path.id)}
			{@const Icon = SECTION_ICONS[path.id]}
			<section class="path" aria-labelledby="path-{path.id}">
				<div class="head">
					<span class="fi"><Icon size={24} aria-hidden="true" /></span>
					<div>
						<h2 id="path-{path.id}">{path.title}</h2>
						<p>{path.blurb}</p>
					</div>
				</div>
				<ol class:numbered={path.numbered}>
					{#each path.pages as item (item.slug)}
						<li>
							<a href="/docs/{item.slug}"
								><span class="name">{item.title}</span><span class="time">{item.minutes} min</span
								></a
							>
						</li>
					{/each}
				</ol>
			</section>
		{/each}
	</div>

	<section class="section">
		<div class="sec-head">
			<div>
				<p class="eyebrow">The basics</p>
				<h2>One frame, six passes</h2>
				<p class="sub">
					Every Iris and OptiFine shaderpack runs these passes in order. Learn them once and the
					rest of the docs make sense.
				</p>
			</div>
			<a class="btn secondary" href="/docs/rendering-pipeline"
				>Read the pipeline guide<ArrowRight size={18} aria-hidden="true" /></a
			>
		</div>
		{@html data.pipeline}
	</section>

	<section class="section learn">
		<div>
			<p class="eyebrow">Learn by doing</p>
			<h2>Your first effect: a vignette</h2>
			<p class="sub">
				Guides teach with small, complete programs you can drop into a pack and see working straight
				away.
			</p>
			<ol class="steps">
				<li>
					<b>Create <code>composite.fsh</code></b><span
						>A fullscreen pass that runs after the world is drawn.</span
					>
				</li>
				<li>
					<b>Read the scene</b><span
						><code>colortex0</code> holds the colour of every pixel so far.</span
					>
				</li>
				<li>
					<b>Darken the edges</b><span
						>Scale each pixel by its distance from the centre of the screen.</span
					>
				</li>
			</ol>
			<a class="btn primary" href="/docs/first-shaderpack"
				>Build your first shaderpack<ArrowRight size={18} aria-hidden="true" /></a
			>
		</div>
		<div class="demo">
			{@html data.lesson}
			<div
				class="result"
				role="img"
				aria-label="The same image before and after the vignette: the right half has darker edges"
			>
				<div class="after"></div>
				<span class="tag left">Before</span><span class="tag right">After</span>
				<span class="divider"
					><span class="knob"><ChevronsLeftRight size={16} aria-hidden="true" /></span></span
				>
			</div>
		</div>
	</section>

	<section class="section">
		<div class="sec-head">
			<div>
				<p class="eyebrow">Reference</p>
				<h2>Look it up</h2>
				<p class="sub">Precise pages for when you know what you need.</p>
			</div>
			<a class="btn secondary" href="/docs">All docs</a>
		</div>
		<div class="ref">
			{#each data.reference as item (item.slug)}
				<a class="card" href="/docs/{item.slug}">
					<span class="code-chip">{item.tag}</span>
					<span class="title">{item.title}<ArrowUpRight size={18} aria-hidden="true" /></span>
					<span class="desc">{item.description}</span>
				</a>
			{/each}
		</div>
	</section>

	<section class="section split">
		<div>
			<p class="eyebrow">Changelog</p>
			<h2 class="h2">Recently updated</h2>
			<ul class="updates">
				{#each data.recent as item (item.slug)}
					<li>
						<a href="/docs/{item.slug}">
							<span class="name">{item.title}</span>
							<time datetime={item.updated}>{shortDate(item.updated)}</time>
							<span class="meta"
								><span class="badge">{titles.get(item.section)}</span><span class="text"
									>{item.description}</span
								></span
							>
						</a>
					</li>
				{/each}
			</ul>
		</div>
		<aside class="contribute">
			<div>
				<span class="mark" aria-hidden="true"></span>
				<h2>Every page is open to edits</h2>
				<p>
					Spotted a mistake or know a better trick? The docs live on GitHub, and every page has an
					edit link.
				</p>
				<ol class="how">
					<li>Open a page and choose <b>Edit this page</b>.</li>
					<li>Change the Markdown on GitHub and open a pull request.</li>
					<li>The build checks links, anchors and frontmatter for you.</li>
				</ol>
			</div>
			<p class="btns">
				<a class="btn light" href="{SITE.repo}/blob/main/CONTRIBUTING.md"
					><BrandIcon name="github" size={18} />How to contribute</a
				>
				{#if SITE.discord}<a class="btn glass" href={SITE.discord}
						><BrandIcon name="discord" size={18} />Ask in Discord</a
					>{/if}
			</p>
		</aside>
	</section>
</main>

<Footer nav={data.nav} />

<style>
	.hero {
		position: relative;
		color: #fff;
		overflow: hidden;
		background: var(--brand-gradient);
	}
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.5;
		background-image: radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px);
		background-size: 22px 22px;
		mask-image: linear-gradient(180deg, #000, transparent 85%);
	}
	.hero > :global(*) {
		position: relative;
		z-index: 1;
	}
	.top {
		height: 76px;
		display: flex;
		align-items: center;
		gap: 40px;
	}
	.home {
		color: #fff;
	}
	.home .logo {
		height: 48px;
		margin-top: -6px;
	}
	.top nav {
		display: flex;
		gap: 28px;
		font-size: 15px;
		font-weight: 500;
		color: rgb(255 255 255 / 0.72);
	}
	.top nav a:hover {
		color: #fff;
	}
	.right {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.right .ghost {
		color: rgb(255 255 255 / 0.72);
	}
	.right .ghost:hover {
		color: #fff;
		background: rgb(255 255 255 / 0.08);
	}
	.btn.glass {
		color: #fff;
		background: rgb(255 255 255 / 0.08);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.18);
	}
	.btn.glass:hover {
		background: rgb(255 255 255 / 0.14);
	}
	.intro {
		text-align: center;
		padding-block: 88px 120px;
		max-width: 1000px;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 500;
		color: rgb(255 255 255 / 0.85);
		padding: 4px 12px 4px 6px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.07);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14);
	}
	.pill b {
		font-weight: 600;
		font-size: 12px;
		padding: 0 8px;
		border-radius: 999px;
		background: #fff;
		color: var(--indigo-800);
	}
	h1 {
		font-size: 56px;
		line-height: 64px;
		letter-spacing: -1.2px;
		font-weight: 600;
		margin: 22px 0 18px;
		text-wrap: balance;
	}
	.lede {
		font-size: 19px;
		line-height: 30px;
		color: rgb(255 255 255 / 0.72);
		max-width: 640px;
		margin: 0 auto;
	}
	.search {
		max-width: 640px;
		margin: 40px auto 0;
	}
	.popular {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 20px;
		font-size: 14px;
		color: rgb(255 255 255 / 0.6);
	}
	.popular a {
		font: 500 13px/20px var(--mono);
		color: rgb(255 255 255 / 0.9);
		padding: 3px 10px;
		border-radius: 8px;
		background: rgb(255 255 255 / 0.07);
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14);
	}
	.popular a:hover {
		background: rgb(255 255 255 / 0.14);
	}

	.paths {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-top: -64px;
		position: relative;
		z-index: 2;
	}
	.path {
		background: var(--bg-raised);
		border-radius: 20px;
		padding: 32px;
		box-shadow:
			inset 0 0 0 1px var(--line),
			var(--shadow-xl);
	}
	.head {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}
	.fi {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		flex: none;
		background: var(--accent-bg);
		color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.path h2 {
		font-size: 22px;
		line-height: 30px;
		font-weight: 600;
		letter-spacing: -0.2px;
	}
	.head p {
		color: var(--fg-3);
		margin-top: 4px;
	}
	.path ol {
		list-style: none;
		padding: 0;
		margin-top: 24px;
		border-top: 1px solid var(--line);
		counter-reset: step;
	}
	.path li a {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 4px;
		border-bottom: 1px solid var(--line);
		font-weight: 500;
		color: var(--fg-2);
	}
	.path li a:hover {
		color: var(--accent-fg);
	}
	.path ol.numbered li a::before {
		counter-increment: step;
		content: counter(step);
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		flex: none;
		font-size: 12px;
		font-weight: 600;
		color: var(--fg-3);
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
	.time {
		margin-left: auto;
		color: var(--fg-4);
		font-weight: 400;
		font-size: 14px;
	}

	.section {
		padding-top: 96px;
	}
	.sec-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 32px;
		margin-bottom: 32px;
	}
	.section h2,
	.h2 {
		font-size: 30px;
		line-height: 38px;
		font-weight: 600;
		letter-spacing: -0.4px;
		margin-top: 8px;
	}
	.sub {
		color: var(--fg-3);
		margin-top: 8px;
		max-width: 620px;
		font-size: 18px;
		line-height: 28px;
	}

	.learn {
		display: grid;
		grid-template-columns: 1fr 1.25fr;
		gap: 64px;
		align-items: center;
	}
	.steps {
		list-style: none;
		padding: 0;
		margin: 28px 0 32px;
		display: grid;
		gap: 20px;
		counter-reset: s;
	}
	.steps li {
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 0 14px;
		counter-increment: s;
	}
	.steps li::before {
		content: counter(s);
		grid-row: span 2;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 14px;
		font-weight: 600;
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.steps b {
		font-weight: 600;
	}
	.steps span {
		color: var(--fg-3);
		font-size: 15px;
		line-height: 22px;
	}
	.steps code {
		font-size: 0.9em;
	}
	.demo {
		border-radius: 20px;
		overflow: hidden;
		background: var(--code-bg);
		box-shadow:
			0 0 0 1px var(--line),
			var(--shadow-xl);
	}
	.demo :global(.code) {
		margin: 0;
		border-radius: 0;
		box-shadow: none;
	}
	.result {
		position: relative;
		height: 210px;
		background: url('/images/vignette-demo.webp') center / cover;
		border-top: 1px solid var(--code-line);
	}
	.after {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 60% 75% at 50% 50%, transparent 35%, rgb(0 0 0 / 0.9) 100%);
		clip-path: inset(0 0 0 50%);
	}
	.divider {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 2px;
		margin-left: -1px;
		background: #fff;
	}
	.knob {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 32px;
		height: 32px;
		margin: -16px 0 0 -16px;
		border-radius: 50%;
		background: #fff;
		display: grid;
		place-items: center;
		color: #414651;
		box-shadow: var(--shadow-lg);
	}
	.tag {
		position: absolute;
		top: 12px;
		font: 600 12px/18px var(--sans);
		color: #fff;
		padding: 2px 8px;
		border-radius: 6px;
		background: rgb(12 14 18 / 0.55);
		backdrop-filter: blur(6px);
	}
	.tag.left {
		left: 12px;
	}
	.tag.right {
		right: 12px;
	}

	.ref {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 24px;
	}
	.card {
		display: block;
		padding: 24px;
		border-radius: 16px;
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line),
			var(--shadow-xs);
		transition: box-shadow 0.15s;
	}
	.card:hover {
		box-shadow:
			inset 0 0 0 1px var(--accent-line),
			var(--shadow-lg);
	}
	.card .title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 18px;
		line-height: 28px;
		font-weight: 600;
		margin-top: 16px;
	}
	.card .title :global(svg) {
		color: var(--fg-5);
	}
	.card .desc {
		display: block;
		color: var(--fg-3);
		margin-top: 4px;
		font-size: 15px;
		line-height: 22px;
	}

	.split {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 24px;
	}
	.updates {
		list-style: none;
		padding: 0;
		margin-top: 24px;
		border-radius: 16px;
		box-shadow: inset 0 0 0 1px var(--line);
		overflow: hidden;
	}
	.updates li + li {
		border-top: 1px solid var(--line);
	}
	.updates a {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 4px 16px;
		padding: 18px 24px;
		align-items: center;
	}
	.updates a:hover {
		background: var(--bg-subtle);
	}
	.updates .name {
		font-weight: 600;
	}
	.updates time {
		grid-row: span 2;
		font-size: 14px;
		color: var(--fg-4);
	}
	.updates .meta {
		font-size: 14px;
		color: var(--fg-4);
		display: flex;
		gap: 8px;
		align-items: center;
		min-width: 0;
	}
	.updates .text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.badge {
		flex: none;
		font-size: 12px;
		font-weight: 500;
		color: var(--fg-3);
		padding: 1px 8px;
		border-radius: 999px;
		box-shadow: inset 0 0 0 1px var(--line);
		background: var(--bg-subtle);
	}
	.contribute {
		border-radius: 16px;
		padding: 32px;
		color: #fff;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 24px;
		background: var(--brand-gradient);
	}
	.mark {
		display: block;
		width: 44px;
		height: 44px;
		background: #fff;
		mask: url('/brand/mark.png') center / contain no-repeat;
	}
	.contribute h2 {
		font-size: 24px;
		line-height: 32px;
		font-weight: 600;
		margin-top: 20px;
	}
	.contribute p {
		color: rgb(255 255 255 / 0.72);
		margin-top: 8px;
	}
	.how {
		margin-top: 20px;
		padding-left: 20px;
		display: grid;
		gap: 8px;
		color: rgb(255 255 255 / 0.8);
		font-size: 15px;
		line-height: 22px;
	}
	.how b {
		color: #fff;
		font-weight: 600;
	}
	.btns {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.btn.light {
		background: #fff;
		color: #414651;
	}
	.btn.light:hover {
		background: #f5f5f5;
	}

	@media (max-width: 960px) {
		.paths,
		.learn,
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
		.top nav {
			display: none;
		}
	}
	@media (max-width: 640px) {
		h1 {
			font-size: 38px;
			line-height: 46px;
		}
		.intro {
			padding-block: 56px 104px;
		}
		.path {
			padding: 24px;
		}
		.sec-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
