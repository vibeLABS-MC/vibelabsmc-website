<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, Search, ShieldCheck } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import SudoNote from '#lib/components/SudoNote.svelte';
	import { shortDate } from '#lib/format.ts';

	let { data, form } = $props();
</script>

<Seo title="Users" description="Accounts, roles and suspensions." />

<form method="GET" class="search">
	<Search aria-hidden="true" /><input
		class="input"
		name="q"
		value={data.q}
		placeholder="Username, name{data.isAdmin ? ', email' : ''} or ID"
		aria-label="Search users"
	/>
</form>
{#if !data.sudo}<SudoNote href="/admin/users" />{/if}
{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}{#if form && 'sudo' in form}&nbsp;<a
				class="link"
				href={String(form.sudo)}>Confirm it’s you</a
			>{/if}
	</p>{/if}
{#if form && 'done' in form}<p class="alert ok" role="status">
		<CircleCheck aria-hidden="true" />{form.done}
	</p>{/if}

<div class="card table-wrap">
	<table class="table">
		<thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
		<tbody>
			{#each data.users as u (u.id)}
				<tr>
					<td>
						<span class="who"
							><Avatar name={u.displayName} imageKey={u.avatarKey} size={32} /><span>
								<strong>{u.displayName}</strong>
								<span class="tiny muted"
									>{u.username ? `@${u.username}` : 'no username yet'}{u.email
										? ` · ${u.email}`
										: ''} · joined {shortDate(u.createdAt)}</span
								>
							</span></span
						>
					</td>
					<td>
						{#if data.isAdmin && u.id !== data.me}
							<form method="POST" action="?/role" class="row-gap" use:enhance>
								<input type="hidden" name="user" value={u.id} />
								<select class="select role" name="role" value={u.role} aria-label="Role"
									><option value="user">User</option><option value="moderator">Moderator</option
									><option value="admin">Admin</option></select
								>
								<button class="btn secondary sm" disabled={!data.sudo}>Set</button>
							</form>
						{:else}
							<span class="badge {u.role === 'user' ? '' : 'accent'}">{u.role}</span>
						{/if}
						{#if u.totp}<span class="badge ok tfa"><ShieldCheck aria-hidden="true" />2FA</span>{/if}
					</td>
					<td
						>{#if u.bannedAt}<span class="badge error">Suspended</span><br /><span
								class="tiny muted">{u.banReason}</span
							>{:else}<span class="badge ok">Active</span>{/if}</td
					>
					<td>
						{#if u.id !== data.me}
							<form method="POST" action="?/ban" class="ban" use:enhance>
								<input type="hidden" name="user" value={u.id} />
								{#if !u.bannedAt}<input
										class="input"
										name="reason"
										maxlength="300"
										placeholder="Reason"
										aria-label="Reason for suspension"
									/>{/if}
								<button class="btn {u.bannedAt ? 'secondary' : 'danger'} sm" disabled={!data.sudo}
									>{u.bannedAt ? 'Lift suspension' : 'Suspend'}</button
								>
							</form>
							<form method="POST" action="?/signOut" use:enhance>
								<input type="hidden" name="user" value={u.id} /><button class="btn ghost sm"
									>Sign out everywhere</button
								>
							</form>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="muted">No users match.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.search {
		position: relative;
		max-width: 420px;
	}
	.search :global(svg) {
		position: absolute;
		left: 12px;
		top: 50%;
		translate: 0 -50%;
		width: 18px;
		height: 18px;
		color: var(--fg-4);
	}
	.search .input {
		padding-left: 38px;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.who > span {
		display: grid;
	}
	.role {
		width: auto;
		padding: 4px 30px 4px 8px;
		font-size: 13px;
	}
	.tfa {
		margin-top: 4px;
	}
	.ban {
		display: flex;
		gap: 6px;
		margin-bottom: 4px;
	}
	.ban .input {
		padding: 4px 8px;
		font-size: 13px;
		min-width: 140px;
	}
</style>
