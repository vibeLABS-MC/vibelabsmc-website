<script lang="ts">
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';
	import { pageList } from '#lib/marketplace/search.ts';

	let { page, pages, href }: { page: number; pages: number; href: (page: number) => string } =
		$props();
</script>

{#if pages > 1}
	<nav class="pager" aria-label="Pages">
		{#if page > 1}<a class="btn secondary" href={href(page - 1)} rel="prev"
				><ArrowLeft aria-hidden="true" />Previous</a
			>{:else}<span></span>{/if}
		<div class="pages">
			{#each pageList(page, pages) as p, i (i)}
				{#if p === null}<span>…</span>{:else}<a
						href={href(p)}
						aria-current={p === page ? 'page' : undefined}>{p}</a
					>{/if}
			{/each}
		</div>
		{#if page < pages}<a class="btn secondary" href={href(page + 1)} rel="next"
				>Next<ArrowRight aria-hidden="true" /></a
			>{:else}<span></span>{/if}
	</nav>
{/if}
