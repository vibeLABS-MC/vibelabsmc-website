import { describe, expect, it } from 'vitest';
import {
	compareVersions,
	isRelease,
	majorOf,
	newestVersion,
	releaseParts,
	summariseVersions
} from './versions.ts';

const KNOWN = [
	'1.21.4',
	'1.21.3',
	'1.21.2',
	'1.21.1',
	'1.21',
	'1.20.6',
	'1.20.5',
	'1.20.4',
	'1.20.3',
	'1.20.2',
	'1.20.1',
	'1.20'
];

describe('release numbers', () => {
	it('reads release numbers and rejects snapshots', () => {
		expect(releaseParts('1.20.1')).toEqual([1, 20, 1]);
		expect(releaseParts('1.21')).toEqual([1, 21]);
		expect(releaseParts('25w02a')).toBeNull();
		expect(releaseParts('1.21-pre1')).toBeNull();
		expect(isRelease('1.8.9')).toBe(true);
		expect(majorOf('1.21.4')).toBe('1.21');
		expect(majorOf('1.21')).toBe('1.21');
	});

	it('sorts newest first, with snapshots after releases', () => {
		expect(['1.20.1', '1.21', '25w02a', '1.9', '1.21.4', '1.20'].sort(compareVersions)).toEqual([
			'1.21.4',
			'1.21',
			'1.20.1',
			'1.20',
			'1.9',
			'25w02a'
		]);
		expect(compareVersions('1.21', '1.21.0')).toBe(0);
		expect(compareVersions('a', 'b')).toBe(0);
	});

	it('finds the newest supported version', () => {
		expect(newestVersion(['1.20.1', '1.21.4', '1.21'])).toBe('1.21.4');
		expect(newestVersion(['25w02a'])).toBe('25w02a');
		expect(newestVersion([])).toBeNull();
	});
});

describe('summariseVersions', () => {
	it('joins neighbouring releases into ranges', () => {
		expect(summariseVersions(['1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21'], KNOWN)).toBe(
			'1.21–1.21.4'
		);
		expect(summariseVersions(['1.20.1', '1.20.2', '1.20.4'], KNOWN)).toBe('1.20.1–1.20.2, 1.20.4');
		expect(summariseVersions(['1.20.1'], KNOWN)).toBe('1.20.1');
	});

	it('lists unknown versions and snapshots after the ranges', () => {
		expect(summariseVersions(['1.21.4', '25w02a', '1.22'], KNOWN)).toBe('1.21.4, 1.22, 25w02a');
		expect(summariseVersions(['1.20', '1.20.1', '1.21.4'], KNOWN)).toBe('1.20–1.20.1, 1.21.4');
		expect(summariseVersions([], KNOWN)).toBe('');
	});
});
