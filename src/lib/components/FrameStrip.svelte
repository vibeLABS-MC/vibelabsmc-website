<script lang="ts">
	import { FRAME } from '#lib/landing.ts';
	import { docsUrl } from '#lib/site.ts';
</script>

<figure class="frame" aria-labelledby="frame-caption">
	<div class="chrome" aria-hidden="true">
		<span></span><span></span><span></span>
		<code>one frame, in order</code>
	</div>
	<ol class="passes">
		{#each FRAME as pass, i (i)}
			<li class="pass" data-kind={pass.kind}>
				<span class="step">{String(i + 1).padStart(2, '0')}</span>
				<code>{pass.program}</code>
				<span class="title">{pass.title}</span>
			</li>
		{/each}
	</ol>
	<figcaption id="frame-caption">
		<span class="key" data-kind="geometry">Draws the world</span>
		<span class="key" data-kind="fullscreen">Runs once per pixel</span>
		<a href={docsUrl('/developing/rendering-pipeline/')}>How the pipeline works</a>
	</figcaption>
</figure>

<style>
	.frame {
		border-radius: 16px;
		background: var(--bg-raised);
		box-shadow:
			inset 0 0 0 1px var(--line),
			var(--shadow-xl);
		overflow: hidden;
	}
	.chrome {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--line);
		background: var(--bg-subtle);
	}
	.chrome span {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: var(--line-strong);
	}
	.chrome code {
		margin-left: 10px;
		font-size: 12px;
		color: var(--fg-4);
	}
	.passes {
		list-style: none;
		margin: 0;
		padding: 24px;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 12px;
	}
	.pass {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
		border-radius: 12px;
		background: var(--bg-subtle);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	/* The arrow from one pass to the next. */
	.pass + .pass::before {
		content: '';
		position: absolute;
		left: -11px;
		top: 50%;
		width: 10px;
		border-top: 1px dashed var(--line-strong);
	}
	.step {
		font: 500 12px/18px var(--mono);
		color: var(--fg-5);
	}
	.pass code {
		align-self: start;
		font-size: 13px;
		line-height: 20px;
		padding: 1px 6px;
		border-radius: 6px;
		color: var(--fg-2);
		background: var(--bg-raised);
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
	.pass[data-kind='geometry'] code {
		color: var(--accent-fg);
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	.title {
		font-size: 14px;
		line-height: 20px;
		font-weight: 600;
		color: var(--fg);
	}
	figcaption {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		padding: 14px 24px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--fg-4);
	}
	.key {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.key::before {
		content: '';
		width: 10px;
		height: 10px;
		border-radius: 3px;
		background: var(--bg-raised);
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}
	.key[data-kind='geometry']::before {
		background: var(--accent-bg);
		box-shadow: inset 0 0 0 1px var(--accent-line);
	}
	figcaption a {
		margin-left: auto;
		font-weight: 600;
		color: var(--accent-fg);
	}
	figcaption a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	@media (max-width: 960px) {
		.passes {
			grid-template-columns: repeat(3, 1fr);
		}
		.pass:nth-child(4)::before {
			display: none;
		}
	}
	@media (max-width: 560px) {
		.passes {
			grid-template-columns: repeat(2, 1fr);
			padding: 16px;
		}
		.pass:nth-child(odd)::before {
			display: none;
		}
		.pass:nth-child(4)::before {
			display: block;
		}
		figcaption a {
			margin-left: 0;
		}
	}
</style>
