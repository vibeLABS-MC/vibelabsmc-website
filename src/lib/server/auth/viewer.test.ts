import { describe, expect, it } from 'vitest';
import type { Session, User } from './session.ts';
import { toSessionUser, toViewer } from './viewer.ts';

const T = new Date('2026-01-01T00:00:00Z');
const user: User = {
	id: 'u1',
	username: 'steve',
	displayName: 'Steve',
	bio: '',
	avatarKey: null,
	role: 'user',
	email: 'steve@example.org',
	emailVerifiedAt: T,
	passwordHash: '$argon2id$...',
	totpSecret: 'v1.secret',
	totpEnabledAt: null,
	totpLastStep: null,
	bannedAt: null,
	banReason: null,
	createdAt: T,
	updatedAt: T
};
const session = { twoFactorVerified: false } as Session;

describe('toSessionUser', () => {
	it('keeps what pages need and drops the password hash and TOTP secret', () => {
		const safe = toSessionUser(user);

		expect(safe).toEqual({
			id: 'u1',
			username: 'steve',
			displayName: 'Steve',
			avatarKey: null,
			role: 'user',
			email: 'steve@example.org',
			emailVerified: true,
			hasPassword: true,
			totpEnabled: false
		});
		expect(JSON.stringify(safe)).not.toMatch(/argon2|v1\.secret/);
	});

	it('reports a missing password, unverified email and enabled two-factor', () => {
		const safe = toSessionUser({
			...user,
			passwordHash: null,
			emailVerifiedAt: null,
			totpEnabledAt: T
		});

		expect(safe).toMatchObject({ hasPassword: false, emailVerified: false, totpEnabled: true });
	});
});

describe('toViewer', () => {
	it('is null when nobody is signed in', () => {
		expect(toViewer(null, null)).toBeNull();
		expect(toViewer(toSessionUser(user), null)).toBeNull();
	});

	it('counts an account without two-factor as verified, and one with it only after the check', () => {
		expect(toViewer(toSessionUser(user), session)).toEqual({
			role: 'user',
			onboarded: true,
			totpEnabled: false,
			twoFactorVerified: true
		});
		const withTotp = toSessionUser({ ...user, totpEnabledAt: T, username: null });
		expect(toViewer(withTotp, session)).toMatchObject({
			onboarded: false,
			twoFactorVerified: false
		});
		expect(toViewer(withTotp, { twoFactorVerified: true } as Session)?.twoFactorVerified).toBe(
			true
		);
	});
});
