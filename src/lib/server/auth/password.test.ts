import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { hashPassword, isBreached, passwordProblem, verifyPassword } from './password.ts';

describe('passwordProblem', () => {
	it('accepts a long passphrase with no composition rules', () => {
		expect(passwordProblem('purple monkey dishwasher')).toBeNull();
		expect(passwordProblem('a'.repeat(8) + 'bcdefgh')).toBeNull();
	});

	it('wants 12 to 256 characters', () => {
		expect(passwordProblem('short pass1')).toBe('Use at least 12 characters.');
		expect(passwordProblem('x'.repeat(100) + 'abcd'.repeat(40))).toBe(
			'Use at most 256 characters.'
		);
		expect(passwordProblem('abcd'.repeat(64))).toBeNull();
	});

	it('refuses passwords made of almost one character', () => {
		expect(passwordProblem('aaaaaaaaaaaaaaaa')).toBe('That password repeats too few characters.');
		expect(passwordProblem('abcabcabcabcabc')).toBe('That password repeats too few characters.');
	});

	it('refuses passwords that contain the email or username', () => {
		const message = "Don't use your email address or username in your password.";
		expect(passwordProblem('my name is SteveMiner!', { username: 'steveminer' })).toBe(message);
		expect(passwordProblem('hello-steve.m@example.org', { email: 'steve.m@example.org' })).toBe(
			message
		);
		expect(passwordProblem('steve.m rocks every day', { email: 'steve.m@example.org' })).toBe(
			message
		);
		// Very short names are too common to forbid.
		expect(passwordProblem('a long password with ab', { username: 'ab' })).toBeNull();
		expect(passwordProblem('nothing in common here', { email: null, username: null })).toBeNull();
	});
});

describe('hashing', () => {
	it('hashes with Argon2id and verifies only the right password', async () => {
		const stored = await hashPassword('purple monkey dishwasher');

		expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
		expect(await verifyPassword(stored, 'purple monkey dishwasher')).toBe(true);
		expect(await verifyPassword(stored, 'purple monkey dishwashe')).toBe(false);
	});

	it('says no, after the same work, when there is no stored hash or it is broken', async () => {
		expect(await verifyPassword(null, 'anything at all here')).toBe(false);
		expect(await verifyPassword('not-a-hash', 'anything at all here')).toBe(false);
	});
});

describe('isBreached', () => {
	const leaked = 'password1234';
	const digest = createHash('sha1').update(leaked).digest('hex').toUpperCase();
	const range = (lines: string[]) =>
		vi.fn<typeof fetch>(async () => new Response(lines.join('\r\n')));

	it('sends only the first five characters of the SHA-1, with padding', async () => {
		const fetchFn = range([`${digest.slice(5)}:12`]);

		expect(await isBreached(fetchFn, 'https://hibp', leaked)).toBe(true);
		const [url, init] = fetchFn.mock.calls[0]!;
		expect(url).toBe(`https://hibp/range/${digest.slice(0, 5)}`);
		expect((init!.headers as Record<string, string>)['add-padding']).toBe('true');
		expect(String(url)).not.toContain(digest.slice(5));
	});

	it('ignores padding entries with a zero count, and other suffixes', async () => {
		expect(await isBreached(range([`${digest.slice(5)}:0`]), 'https://hibp', leaked)).toBe(false);
		expect(await isBreached(range(['ABC:5']), 'https://hibp', leaked)).toBe(false);
	});

	it('lets the password through when the service is off, down or failing', async () => {
		expect(await isBreached(range([]), null, leaked)).toBe(false);
		const down = vi.fn<typeof fetch>(async () => {
			throw new Error('offline');
		});
		expect(await isBreached(down, 'https://hibp', leaked)).toBe(false);
		const failing = vi.fn<typeof fetch>(
			async () => new Response(`${digest.slice(5)}:9`, { status: 503 })
		);
		expect(await isBreached(failing, 'https://hibp', leaked)).toBe(false);
	});
});
