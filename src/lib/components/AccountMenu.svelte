<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import {
		Bookmark,
		LayoutDashboard,
		LogOut,
		Settings,
		ShieldCheck,
		UserRound
	} from '@lucide/svelte';
	import Avatar from './Avatar.svelte';

	interface MenuUser {
		username: string | null;
		displayName: string;
		avatarKey: string | null;
		role: 'user' | 'moderator' | 'admin';
	}

	let { user }: { user: MenuUser } = $props();
	let logout = $state<HTMLFormElement>();

	const links = $derived([
		...(user.username
			? [{ href: `/user/${user.username}`, label: 'Your profile', icon: UserRound }]
			: []),
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/dashboard/collections', label: 'Collections', icon: Bookmark },
		{ href: '/settings', label: 'Settings', icon: Settings },
		...(user.role !== 'user' ? [{ href: '/admin', label: 'Moderation', icon: ShieldCheck }] : [])
	]);
</script>

<form method="POST" action="/logout" bind:this={logout} hidden></form>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="account-trigger" aria-label="Your account">
		<Avatar name={user.displayName} imageKey={user.avatarKey} size={32} />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="menu" align="end" sideOffset={8}>
			<div class="menu-head">
				<Avatar name={user.displayName} imageKey={user.avatarKey} size={40} />
				<div>
					<strong>{user.displayName}</strong>
					{#if user.username}<span>@{user.username}</span>{/if}
				</div>
			</div>
			{#each links as link (link.href)}
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<a {...props} class="menu-item" href={link.href}
							><link.icon aria-hidden="true" />{link.label}</a
						>
					{/snippet}
				</DropdownMenu.Item>
			{/each}
			<DropdownMenu.Separator class="menu-sep" />
			<DropdownMenu.Item class="menu-item" onSelect={() => logout?.requestSubmit()}>
				<LogOut aria-hidden="true" />Sign out
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
