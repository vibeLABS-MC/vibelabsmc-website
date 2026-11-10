import { describe, expect, it } from 'vitest';
import { initialTheme, otherTheme } from './theme.ts';

describe('initialTheme', () => {
	it('uses the theme the reader chose last time', () => {
		expect(initialTheme('light', true)).toBe('light');
		expect(initialTheme('dark', false)).toBe('dark');
	});

	it('follows the system setting when nothing valid was saved', () => {
		expect(initialTheme(null, true)).toBe('dark');
		expect(initialTheme(null, false)).toBe('light');
		expect(initialTheme('sepia', true)).toBe('dark');
	});
});

describe('otherTheme', () => {
	it('swaps light and dark', () => {
		expect(otherTheme('light')).toBe('dark');
		expect(otherTheme('dark')).toBe('light');
	});
});
