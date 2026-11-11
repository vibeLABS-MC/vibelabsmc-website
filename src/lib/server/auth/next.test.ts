import { describe, expect, it } from 'vitest';
import { safeNext } from './next.ts';

const ORIGIN = 'https://vibelabsmc.org';
const DOCS = ['https://docs.vibelabsmc.org'];

describe('safeNext', () => {
	it('keeps paths on this site, with their query and fragment', () => {
		expect(safeNext('/dashboard?tab=2#x', ORIGIN, DOCS)).toBe('/dashboard?tab=2#x');
		expect(safeNext('/a/../settings', ORIGIN, DOCS)).toBe('/settings');
	});

	it('allows pages on the docs site', () => {
		expect(safeNext('https://docs.vibelabsmc.org/using/install/', ORIGIN, DOCS)).toBe(
			'https://docs.vibelabsmc.org/using/install/'
		);
	});

	it('falls back for anything that could leave for another site', () => {
		for (const next of [
			'https://evil.example',
			'//evil.example/x',
			'/\\evil.example',
			'https://docs.vibelabsmc.org.evil.example/',
			'javascript:alert(1)',
			'http://docs.vibelabsmc.org/',
			'not a url',
			'',
			null,
			undefined
		])
			expect(safeNext(next, ORIGIN, DOCS, '/home')).toBe('/home');
	});

	it('defaults to the home page', () => {
		expect(safeNext(null, ORIGIN, DOCS)).toBe('/');
	});
});
