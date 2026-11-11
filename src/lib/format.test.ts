import { describe, expect, it } from 'vitest';
import { compact, fileSize, initials, plural, shortDate, timeAgo, toneOf } from './format.ts';

describe('initials', () => {
	it('takes the first and last word, or one letter', () => {
		expect(initials('Steve Miner')).toBe('SM');
		expect(initials('anna marie van dyke')).toBe('AD');
		expect(initials('kit')).toBe('K');
		expect(initials('shader_dev-42')).toBe('S4');
		expect(initials('   ')).toBe('?');
	});
});

describe('toneOf', () => {
	it('picks a stable tone from 0 to 5', () => {
		expect(toneOf('steve')).toBe(toneOf('steve'));
		const tones = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map(toneOf));
		expect(tones.size).toBeGreaterThan(3);
		for (const tone of tones) expect(tone).toBeGreaterThanOrEqual(0);
		for (const tone of tones) expect(tone).toBeLessThan(6);
	});
});

describe('compact', () => {
	it('shortens big numbers without rounding up', () => {
		expect(compact(0)).toBe('0');
		expect(compact(999)).toBe('999');
		expect(compact(1000)).toBe('1k');
		expect(compact(1250)).toBe('1.2k');
		expect(compact(9999)).toBe('9.9k');
		expect(compact(12_345)).toBe('12k');
		expect(compact(999_999)).toBe('999k');
		expect(compact(1_500_000)).toBe('1.5M');
		expect(compact(2_000_000_000)).toBe('2B');
	});
});

describe('plural', () => {
	it('picks the right word and groups thousands', () => {
		expect(plural(1, 'download')).toBe('1 download');
		expect(plural(2, 'download')).toBe('2 downloads');
		expect(plural(1200, 'reply', 'replies')).toBe('1,200 replies');
	});
});

describe('timeAgo', () => {
	const now = new Date('2026-06-15T12:00:00Z');

	it('says how long ago in plain words', () => {
		expect(timeAgo(new Date('2026-06-15T11:59:40Z'), now)).toBe('just now');
		expect(timeAgo(new Date('2026-06-15T11:55:00Z'), now)).toBe('5 minutes ago');
		expect(timeAgo(new Date('2026-06-15T09:00:00Z'), now)).toBe('3 hours ago');
		expect(timeAgo(new Date('2026-06-14T12:00:00Z'), now)).toBe('yesterday');
		expect(timeAgo(new Date('2026-06-01T12:00:00Z'), now)).toBe('2 weeks ago');
		expect(timeAgo('2025-06-15T12:00:00Z', now)).toBe('last year');
	});
});

describe('dates and sizes', () => {
	it('formats a date the British way, in UTC', () => {
		expect(shortDate('2026-11-08T23:30:00Z')).toBe('8 Nov 2026');
	});

	it('formats file sizes', () => {
		expect(fileSize(512)).toBe('512 B');
		expect(fileSize(2048)).toBe('2.0 KB');
		expect(fileSize(2_400_000)).toBe('2.3 MB');
		expect(fileSize(50 * 1024 * 1024)).toBe('50 MB');
		expect(fileSize(3 * 1024 ** 4)).toBe('3072 GB');
	});
});
