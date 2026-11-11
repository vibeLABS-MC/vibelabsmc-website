<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		projectId,
		decisions,
		action = '?/moderate'
	}: { projectId: string; decisions: string[]; action?: string } = $props();
	const LABEL: Record<string, [string, string]> = {
		approve: ['Approve', 'primary'],
		restore: ['Restore', 'primary'],
		changes: ['Ask for changes', 'secondary'],
		reject: ['Reject', 'danger'],
		withhold: ['Withhold', 'danger']
	};
	const needsMessage = $derived(decisions.some((d) => d !== 'approve' && d !== 'restore'));
</script>

<form method="POST" {action} class="decide" use:enhance>
	<input type="hidden" name="project" value={projectId} />
	{#if needsMessage}
		<textarea
			class="textarea"
			name="message"
			rows="2"
			maxlength="2000"
			placeholder="Message to the team (needed to reject, ask for changes or withhold)"
			aria-label="Message to the team"></textarea>
	{/if}
	<div class="row-gap">
		{#each decisions as d (d)}<button
				class="btn {LABEL[d]?.[1] ?? 'secondary'} sm"
				name="decision"
				value={d}>{LABEL[d]?.[0] ?? d}</button
			>{/each}
	</div>
</form>

<style>
	.decide {
		display: grid;
		gap: 8px;
	}
	.decide .textarea {
		min-height: 0;
		font-size: 14px;
		padding: 8px 12px;
	}
</style>
