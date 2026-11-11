import { describe, expect, it } from 'vitest';
import { afterSignIn } from './flow.ts';

describe('afterSignIn', () => {
	it('goes to the second factor first, then onboarding, then where the user was heading', () => {
		const now = new Date();

		expect(afterSignIn({ username: 'steve', totpEnabledAt: now }, '/dashboard?x=1')).toBe(
			'/auth/2fa?next=%2Fdashboard%3Fx%3D1'
		);
		expect(afterSignIn({ username: null, totpEnabledAt: null }, '/dashboard')).toBe(
			'/onboarding?next=%2Fdashboard'
		);
		expect(afterSignIn({ username: 'steve', totpEnabledAt: null }, '/dashboard')).toBe(
			'/dashboard'
		);
	});
});
