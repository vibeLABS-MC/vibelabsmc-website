<script lang="ts">
	import { MailX } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';

	let { data } = $props();
</script>

<Seo title="Confirm your email" description="Confirm the email address on your vibeLABS account." />

<AuthCard
	title="This link doesn’t work"
	subtitle={data.reason ??
		'It may have expired (links last 30 minutes) or already been used. Sign in to get a new one.'}
	icon={MailX}
>
	<a class="btn primary lg block" href="/login">Sign in</a>
</AuthCard>
