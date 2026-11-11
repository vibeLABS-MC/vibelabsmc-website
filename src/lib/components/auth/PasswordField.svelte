<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';

	let {
		id,
		name = 'password',
		label = 'Password',
		autocomplete = 'current-password',
		error,
		hint
	}: {
		id: string;
		name?: string;
		label?: string;
		autocomplete?: 'current-password' | 'new-password';
		error?: string;
		hint?: string;
	} = $props();
	let visible = $state(false);
</script>

<div class="field">
	<label for={id}>{label}</label>
	<div class="wrap">
		<input
			class="input"
			{id}
			{name}
			type={visible ? 'text' : 'password'}
			{autocomplete}
			required
			maxlength="256"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
		/>
		<button
			type="button"
			class="btn ghost toggle"
			aria-label={visible ? 'Hide password' : 'Show password'}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			{#if visible}<EyeOff aria-hidden="true" />{:else}<Eye aria-hidden="true" />{/if}
		</button>
	</div>
	{#if error}<p class="field-error" id="{id}-error">{error}</p>
	{:else if hint}<p class="field-hint" id="{id}-hint">{hint}</p>{/if}
</div>

<style>
	.wrap {
		position: relative;
	}
	.wrap .input {
		padding-right: 48px;
	}
	.toggle {
		position: absolute;
		right: 4px;
		top: 50%;
		translate: 0 -50%;
	}
</style>
