<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, CircleCheck, UserPlus } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Seo from '#lib/components/Seo.svelte';

	let { data, form } = $props();
	const owner = $derived(data.role === 'owner');
</script>

<Seo title="Team of {data.project.name}" description="Project team." />

{#if form?.message}<p class="alert error" role="alert">
		<CircleAlert aria-hidden="true" />{form.message}
	</p>{/if}
{#if form && 'invited' in form}<p class="alert ok" role="status">
		<CircleCheck aria-hidden="true" />Invited {form.invited}. They’ll join once they accept.
	</p>{/if}

{#if owner}
	<form method="POST" action="?/invite" class="card panel invite" use:enhance>
		<header>
			<h2>Invite a maintainer</h2>
			<p>
				Maintainers can edit the project and publish versions. Only the owner manages the team and
				can delete the project.
			</p>
		</header>
		<div class="row">
			<div class="input-group">
				<span class="prefix">@</span><input
					class="input"
					name="username"
					required
					maxlength="24"
					placeholder="username"
					aria-label="Username"
				/>
			</div>
			<button class="btn primary"><UserPlus aria-hidden="true" />Invite</button>
		</div>
	</form>
{/if}

<section class="card table-wrap">
	<table class="table">
		<thead><tr><th>Member</th><th>Role</th><th></th></tr></thead>
		<tbody>
			{#each data.members as m (m.userId)}
				<tr>
					<td
						><span class="who"
							><Avatar name={m.displayName} imageKey={m.avatarKey} size={32} /><span
								><strong>{m.displayName}</strong>{#if m.username}<span class="tiny muted"
										>@{m.username}</span
									>{/if}</span
							></span
						></td
					>
					<td
						>{#if !m.accepted}<span class="badge warn">Invited</span>{:else}<span
								class="badge {m.role === 'owner' ? 'accent' : ''}"
								>{m.role === 'owner' ? 'Owner' : 'Maintainer'}</span
							>{/if}</td
					>
					<td>
						<div class="row-gap end">
							{#if owner && m.role !== 'owner'}
								{#if m.accepted}
									<form
										method="POST"
										action="?/transfer"
										use:enhance={({ cancel }) => {
											if (!confirm(`Make ${m.displayName} the owner? You become a maintainer.`))
												cancel();
										}}
									>
										<input type="hidden" name="user" value={m.userId} /><button class="btn ghost sm"
											>Make owner</button
										>
									</form>
								{/if}
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="user" value={m.userId} /><button class="btn ghost sm"
										>{m.accepted ? 'Remove' : 'Cancel invite'}</button
									>
								</form>
							{:else if m.userId === data.me && m.role !== 'owner'}
								<form method="POST" action="?/leave" use:enhance>
									<button class="btn ghost sm">Leave project</button>
								</form>
							{/if}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	.invite .row {
		display: flex;
		gap: 12px;
		max-width: 480px;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.who > span {
		display: grid;
	}
	.end {
		justify-content: flex-end;
	}
</style>
