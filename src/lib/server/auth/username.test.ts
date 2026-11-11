import { describe, expect, it } from 'vitest';
import { suggestUsername, usernameProblem } from './username.ts';

describe('usernameProblem', () => {
	it('accepts ordinary handles', () => {
		for (const name of ['steve', 'Kit_42', 'shader-dev', 'abc', 'a'.repeat(24)])
			expect(usernameProblem(name)).toBeNull();
	});

	it('explains what is wrong', () => {
		expect(usernameProblem('ab')).toBe('Use 3 to 24 characters.');
		expect(usernameProblem('a'.repeat(25))).toBe('Use 3 to 24 characters.');
		expect(usernameProblem('steve m')).toBe('Use only letters, numbers, - and _.');
		expect(usernameProblem('stéve')).toBe('Use only letters, numbers, - and _.');
		expect(usernameProblem('-steve')).toBe('Start and end with a letter or number.');
		expect(usernameProblem('steve_')).toBe('Start and end with a letter or number.');
		expect(usernameProblem('ste--ve')).toBe("Don't put two - or _ in a row.");
		expect(usernameProblem('ste_-ve')).toBe("Don't put two - or _ in a row.");
	});

	it('reserves names that would impersonate staff or clash with pages, in any case', () => {
		for (const name of ['admin', 'Moderator', 'VIBELABS', 'settings', 'marketplace'])
			expect(usernameProblem(name)).toBe('That name is reserved.');
	});
});

describe('suggestUsername', () => {
	it('keeps a valid provider name as it is', () => {
		expect(suggestUsername('steve_m')).toBe('steve_m');
	});

	it('cleans spaces, accents, symbols and long names into a valid handle', () => {
		expect(suggestUsername('Steve M.')).toBe('Steve-M');
		expect(suggestUsername('Zoë Ångström')).toBe('Zoe-Angstrom');
		expect(suggestUsername('__cool__dude__')).toBe('cool-dude');
		expect(suggestUsername('a'.repeat(30))).toBe('a'.repeat(24));
	});

	it('adds a number when the cleaned name is still not usable', () => {
		for (const raw of ['admin', 'ab', '', '!!!', '日本語'])
			expect(usernameProblem(suggestUsername(raw))).toBeNull();
		expect(suggestUsername('admin')).toMatch(/^admin-\d{4}$/);
		expect(suggestUsername('')).toMatch(/^crafter-\d{4}$/);
	});
});
