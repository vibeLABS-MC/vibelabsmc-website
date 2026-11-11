import { describe, expect, it } from 'vitest';
import { decideAccess, isStaff, type Viewer } from './access.ts';

const user: Viewer = {
	role: 'user',
	onboarded: true,
	totpEnabled: false,
	twoFactorVerified: false
};
const mod: Viewer = {
	role: 'moderator',
	onboarded: true,
	totpEnabled: true,
	twoFactorVerified: true
};
const admin: Viewer = { ...mod, role: 'admin' };

describe('decideAccess', () => {
	it('lets anyone read public pages', () => {
		for (const path of ['/', '/marketplace', '/marketplace/shaders/x', '/user/steve', '/login'])
			expect(decideAccess(path, '', null)).toEqual({ kind: 'allow' });
	});

	it('sends signed-out visitors of account pages to sign in, then back', () => {
		expect(decideAccess('/dashboard/projects', '?tab=2', null)).toEqual({
			kind: 'redirect',
			to: '/login?next=%2Fdashboard%2Fprojects%3Ftab%3D2'
		});
		expect(decideAccess('/settings', '', null)).toEqual({
			kind: 'redirect',
			to: '/login?next=%2Fsettings'
		});
		expect(decideAccess('/settings', '', user)).toEqual({ kind: 'allow' });
	});

	it('does not mistake a page that only starts with the same letters for an account page', () => {
		expect(decideAccess('/settingsx', '', null)).toEqual({ kind: 'allow' });
		expect(decideAccess('/administrators', '', null)).toEqual({ kind: 'allow' });
	});

	it('asks a new account to choose a username before anything else', () => {
		const fresh = { ...user, onboarded: false };

		expect(decideAccess('/marketplace', '', fresh)).toEqual({
			kind: 'redirect',
			to: '/onboarding?next=%2Fmarketplace'
		});
		for (const path of [
			'/onboarding',
			'/logout',
			'/auth/github/callback',
			'/legal/terms',
			'/api/session',
			'/_app/x.js'
		])
			expect(decideAccess(path, '', fresh)).toEqual({ kind: 'allow' });
	});

	it('hides the admin area from ordinary users and sends visitors to sign in', () => {
		expect(decideAccess('/admin', '', user)).toEqual({ kind: 'not-found' });
		expect(decideAccess('/admin/users', '', null)).toEqual({
			kind: 'redirect',
			to: '/login?next=%2Fadmin%2Fusers'
		});
	});

	it('makes staff turn on two-factor, and pass it, before entering the admin area', () => {
		expect(decideAccess('/admin', '', { ...mod, totpEnabled: false })).toEqual({
			kind: 'redirect',
			to: '/settings/security?required=staff'
		});
		expect(decideAccess('/admin/queue', '', { ...mod, twoFactorVerified: false })).toEqual({
			kind: 'redirect',
			to: '/auth/2fa?next=%2Fadmin%2Fqueue'
		});
		expect(decideAccess('/admin', '', mod)).toEqual({ kind: 'allow' });
		expect(decideAccess('/admin/users', '', admin)).toEqual({ kind: 'allow' });
	});
});

describe('isStaff', () => {
	it('counts moderators and admins as staff', () => {
		expect(isStaff('user')).toBe(false);
		expect(isStaff('moderator')).toBe(true);
		expect(isStaff('admin')).toBe(true);
	});
});
