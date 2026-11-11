<script lang="ts">
	import { LogOut } from '@lucide/svelte';
	import Seo from '#lib/components/Seo.svelte';
	import AuthCard from '#lib/components/auth/AuthCard.svelte';

	let { data } = $props();
</script>

<Seo title="Sign out" description="Sign out of vibeLABS." />

<AuthCard
	title="Sign out?"
	subtitle={data.name ? `You’re signed in as ${data.name}.` : 'Finish signing out of vibeLABS.'}
	icon={LogOut}
>
	<form method="POST" action="?next={encodeURIComponent(data.next)}">
		<button class="btn primary lg block">Sign out</button>
	</form>
	<a class="btn secondary lg block" href={data.next}>Stay signed in</a>
</AuthCard>
