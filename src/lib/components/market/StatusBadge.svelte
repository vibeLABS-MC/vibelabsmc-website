<script lang="ts">
	let { status }: { status: string } = $props();
	const LABEL: Record<string, [string, string]> = {
		draft: ['Draft', ''],
		in_review: ['In review', 'accent'],
		approved: ['Public', 'ok'],
		rejected: ['Rejected', 'error'],
		withheld: ['Withheld', 'error']
	};
	const [label, tone] = $derived(LABEL[status] ?? [status, '']);
</script>

<span class="badge {tone}">{label}</span>
