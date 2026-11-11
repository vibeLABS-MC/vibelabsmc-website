import { describe, expect, it } from 'vitest';
import {
	locals,
	session,
	sessionUser,
	testConfig,
	thrown
} from '../../../../tests/helpers/locals.ts';
import { confirmUrl, requireAdmin, requireStaff, requireUser, sudoFailure } from './guards.ts';
import { authPageData, enabledProviders, nextFrom, skipIfSignedIn } from './pages.ts';

const staff = (values = {}) =>
	locals({
		user: sessionUser({ role: 'moderator', totpEnabled: true, ...values }),
		session: session({ twoFactorVerified: true })
	});

describe('requireUser', () => {
	it('returns the signed-in user and session', () => {
		const l = locals({ user: sessionUser(), session: session() });
		expect(requireUser(l).user.username).toBe('steve');
	});

	it('sends everyone else to sign in, and back', async () => {
		expect(
			await thrown(() => requireUser(locals(), new URL('https://x/settings?a=1')))
		).toMatchObject({
			status: 303,
			location: '/login?next=%2Fsettings%3Fa%3D1'
		});
		expect(await thrown(() => requireUser(locals()))).toMatchObject({ location: '/login' });
	});
});

describe('requireStaff and requireAdmin', () => {
	it('let staff in only with two-factor passed in this session', async () => {
		expect(requireStaff(staff()).user.role).toBe('moderator');
		expect((await thrown(() => requireStaff(locals()))).status).toBe(404);
		expect(
			(await thrown(() => requireStaff(locals({ user: sessionUser(), session: session() })))).status
		).toBe(404);
		expect((await thrown(() => requireStaff(staff({ totpEnabled: false })))).status).toBe(404);
		const unverified = locals({
			user: sessionUser({ role: 'admin', totpEnabled: true }),
			session: session()
		});
		expect((await thrown(() => requireStaff(unverified))).status).toBe(404);
	});

	it('keeps admin actions to admins', async () => {
		expect((await thrown(() => requireAdmin(staff()))).status).toBe(403);
		expect(requireAdmin(staff({ role: 'admin' })).user.role).toBe('admin');
	});
});

describe('sudoFailure', () => {
	it('asks for re-confirmation unless it happened in the last few minutes', () => {
		const soon = new Date(Date.now() + 60_000);
		expect(sudoFailure(locals({ session: session({ sudoUntil: soon }) }), '/settings')).toBeNull();
		const failure = sudoFailure(locals({ session: session() }), '/settings/security');
		expect(failure?.status).toBe(403);
		expect(failure?.data).toEqual({
			sudo: '/auth/confirm?next=%2Fsettings%2Fsecurity',
			message: 'Confirm it’s you first.'
		});
		expect(sudoFailure(locals(), '/x')?.status).toBe(403);
		expect(confirmUrl('/a b')).toBe('/auth/confirm?next=%2Fa%20b');
	});
});

describe('sign-in page helpers', () => {
	const withProviders = locals({
		config: testConfig({ GITHUB_CLIENT_ID: 'a', GITHUB_CLIENT_SECRET: 'b' })
	});

	it('lists only the providers that are set up', () => {
		expect(enabledProviders(withProviders.config)).toEqual(['github']);
		expect(enabledProviders(locals().config)).toEqual([]);
	});

	it('keeps `next` on this site or the docs site', () => {
		expect(nextFrom(locals(), new URL('https://x/login?next=/marketplace'))).toBe('/marketplace');
		expect(nextFrom(locals(), new URL('https://x/login?next=https://evil.example'))).toBe(
			'/dashboard'
		);
		expect(nextFrom(locals(), new URL('https://x/login'), '/home')).toBe('/home');
		expect(authPageData(withProviders, new URL('https://x/login?next=/x'))).toEqual({
			providers: ['github'],
			emailEnabled: true,
			next: '/x'
		});
	});

	it('sends signed-in visitors on, and half-signed-in ones to the second factor', async () => {
		const url = new URL('https://x/login?next=/settings');
		expect(skipIfSignedIn(locals(), url)).toBeUndefined();
		expect(await thrown(() => skipIfSignedIn(locals({ user: sessionUser() }), url))).toMatchObject({
			location: '/settings'
		});
		expect(
			await thrown(() =>
				skipIfSignedIn(locals({ pendingSession: session({ pendingTwoFactor: true }) }), url)
			)
		).toMatchObject({
			location: '/auth/2fa?next=%2Fsettings'
		});
	});
});
