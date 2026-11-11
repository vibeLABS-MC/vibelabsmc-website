import { describe, expect, it } from 'vitest';
import {
	decrypt,
	deriveKey,
	encrypt,
	hmac,
	newId,
	randomToken,
	safeEqual,
	sha256
} from './crypto.ts';

const SECRET = Buffer.alloc(32, 1);

describe('random values', () => {
	it('makes 256-bit URL-safe tokens that never repeat', () => {
		const tokens = new Set(Array.from({ length: 50 }, () => randomToken()));

		expect(tokens.size).toBe(50);
		for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
	});

	it('makes short lowercase IDs without look-alike letters', () => {
		const ids = Array.from({ length: 200 }, () => newId());

		for (const id of ids) expect(id).toMatch(/^[0-9a-hjkmnp-tv-z]{12}$/);
		expect(new Set(ids).size).toBe(200);
		expect(newId(8)).toHaveLength(8);
	});
});

describe('hashing', () => {
	it('hashes with SHA-256 into base64url', () => {
		expect(sha256('abc')).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
	});

	it('signs with HMAC-SHA-256, so the same value gives a different hash under another key', () => {
		expect(hmac(SECRET, 'x')).toBe(hmac(SECRET, 'x'));
		expect(hmac(SECRET, 'x')).not.toBe(hmac(Buffer.alloc(32, 2), 'x'));
	});

	it('derives a different 32-byte key for each purpose', () => {
		const a = deriveKey(SECRET, 'totp');
		const b = deriveKey(SECRET, 'ip');

		expect(a).toHaveLength(32);
		expect(a.equals(deriveKey(SECRET, 'totp'))).toBe(true);
		expect(a.equals(b)).toBe(false);
	});

	it('compares strings without leaking where they differ', () => {
		expect(safeEqual('123456', '123456')).toBe(true);
		expect(safeEqual('123456', '123457')).toBe(false);
		expect(safeEqual('123456', '12345')).toBe(false);
	});
});

describe('sealing values with AES-256-GCM', () => {
	const key = deriveKey(SECRET, 'test');

	it('round-trips, and never repeats a ciphertext', () => {
		const sealed = encrypt(key, 'JBSWY3DPEHPK3PXP');

		expect(sealed).toMatch(/^v1\.[\w-]{16}\.[\w-]+$/);
		expect(decrypt(key, sealed)).toBe('JBSWY3DPEHPK3PXP');
		expect(encrypt(key, 'JBSWY3DPEHPK3PXP')).not.toBe(sealed);
	});

	it('refuses a tampered value, the wrong key and an unknown format', () => {
		const sealed = encrypt(key, 'secret');
		const tampered = sealed.slice(0, -2) + (sealed.endsWith('A') ? 'BB' : 'AA');

		expect(() => decrypt(key, tampered)).toThrow();
		expect(() => decrypt(deriveKey(SECRET, 'other'), sealed)).toThrow();
		expect(() => decrypt(key, 'v2.a.b')).toThrow('Unknown sealed value format.');
		expect(() => decrypt(key, 'v1.only')).toThrow('Unknown sealed value format.');
	});
});
