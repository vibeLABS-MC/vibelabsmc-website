import { describe, expect, it } from 'vitest';
import { longDate, shortDate } from './dates';

describe('dates', () => {
	it('writes page dates the way people read them, whatever the time zone', () => {
		expect(longDate('2026-11-08')).toBe('8 Nov 2026');
		expect(shortDate('2026-01-31')).toBe('31 Jan');
	});
});
