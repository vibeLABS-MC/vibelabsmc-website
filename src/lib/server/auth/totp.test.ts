import { describe, expect, it } from 'vitest';
import {
	base32Decode,
	base32Encode,
	codeForStep,
	hashRecoveryCode,
	looksLikeRecoveryCode,
	newRecoveryCodes,
	newTotpSecret,
	otpauthUri,
	stepAt,
	verifyTotp
} from './totp.ts';

// RFC 6238 appendix B: the ASCII secret "12345678901234567890", SHA-1, 8 digits.
// The 6-digit codes are the last six digits of the RFC's 8-digit values.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const vectors: [number, string][] = [
	[59, '287082'],
	[1111111109, '081804'],
	[1111111111, '050471'],
	[1234567890, '005924'],
	[2000000000, '279037'],
	[20000000000, '353130']
];

describe('base32', () => {
	it('encodes like RFC 4648 (without padding) and decodes back', () => {
		expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
		expect(base32Encode(Buffer.from('f'))).toBe('MY');
		expect(base32Decode('MZXW6YTBOI').toString()).toBe('foobar');
		expect(base32Decode('mzxw 6ytb-oi==').toString()).toBe('foobar');
		expect(() => base32Decode('MZ1')).toThrow('Not a base32 secret.');
	});

	it('makes 160-bit secrets of 32 characters', () => {
		const secret = newTotpSecret();

		expect(secret).toMatch(/^[A-Z2-7]{32}$/);
		expect(base32Decode(secret)).toHaveLength(20);
	});
});

describe('TOTP codes', () => {
	it.each(vectors)('matches RFC 6238 at %i seconds', (seconds, code) => {
		expect(codeForStep(RFC_SECRET, stepAt(new Date(seconds * 1000)))).toBe(code);
	});

	it('accepts the current step and one either side, and returns which one matched', () => {
		const time = new Date(1111111111 * 1000);
		const step = stepAt(time);

		expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step), time)).toBe(step);
		expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step - 1), time)).toBe(step - 1);
		expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step + 1), time)).toBe(step + 1);
		expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step - 2), time)).toBeNull();
		expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step + 2), time)).toBeNull();
	});

	it('refuses a code from a step already used, so codes cannot be replayed', () => {
		const time = new Date(1234567890 * 1000);
		const step = stepAt(time);
		const code = codeForStep(RFC_SECRET, step);

		expect(verifyTotp(RFC_SECRET, code, time, step)).toBeNull();
		expect(verifyTotp(RFC_SECRET, code, time, step - 1)).toBe(step);
		expect(verifyTotp(RFC_SECRET, codeForStep(RFC_SECRET, step + 1), time, step)).toBe(step + 1);
	});

	it('ignores spaces and refuses anything that is not six digits', () => {
		const time = new Date(59 * 1000);

		expect(verifyTotp(RFC_SECRET, '287 082', time)).toBe(1);
		expect(verifyTotp(RFC_SECRET, '28708', time)).toBeNull();
		expect(verifyTotp(RFC_SECRET, 'abcdef', time)).toBeNull();
		expect(verifyTotp(RFC_SECRET, '2870821', time)).toBeNull();
	});

	it('builds the otpauth address authenticator apps scan', () => {
		expect(otpauthUri('ABC', 'steve')).toBe(
			'otpauth://totp/vibeLABS%3Asteve?secret=ABC&issuer=vibeLABS&algorithm=SHA1&digits=6&period=30'
		);
	});
});

describe('recovery codes', () => {
	it('makes ten distinct readable codes and stores only their hashes', () => {
		const { codes, hashes } = newRecoveryCodes();

		expect(codes).toHaveLength(10);
		expect(new Set(codes).size).toBe(10);
		for (const code of codes)
			expect(code).toMatch(/^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{2}$/);
		expect(hashes).toEqual(codes.map(hashRecoveryCode));
		expect(hashes.join()).not.toContain(codes[0]!.slice(0, 4));
	});

	it('matches codes typed in capitals, with spaces or without dashes', () => {
		expect(hashRecoveryCode('K3M9-X2PQ-7T')).toBe(hashRecoveryCode('k3m9x2pq7t'));
		expect(hashRecoveryCode('k3m9 x2pq 7t')).toBe(hashRecoveryCode('k3m9-x2pq-7t'));
		expect(looksLikeRecoveryCode('k3m9-x2pq-7t')).toBe(true);
		expect(looksLikeRecoveryCode('123456')).toBe(false);
	});
});
