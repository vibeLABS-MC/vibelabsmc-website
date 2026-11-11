/**
 * Time-based one-time passwords (RFC 6238, the authenticator-app codes) and recovery codes.
 * SHA-1, 6 digits, 30 seconds: the settings every authenticator app supports.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { safeEqual, sha256 } from '../security/crypto.ts';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(bytes: Buffer): string {
	let bits = 0;
	let value = 0;
	let out = '';
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
	return out;
}

export function base32Decode(text: string): Buffer {
	const clean = text.toUpperCase().replace(/[\s=-]/g, '');
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const char of clean) {
		const index = BASE32.indexOf(char);
		if (index < 0) throw new Error('Not a base32 secret.');
		value = (value << 5) | index;
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}

/** A new 160-bit secret, base32 as authenticator apps expect it. */
export const newTotpSecret = (): string => base32Encode(randomBytes(20));

export const stepAt = (time: Date): number => Math.floor(time.getTime() / 1000 / STEP_SECONDS);

/** The code for one 30-second step (RFC 4226 HOTP with the step as counter). */
export function codeForStep(secret: string, step: number): string {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));
	const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
	const offset = digest[digest.length - 1]! & 15;
	const binary = digest.readUInt32BE(offset) & 0x7fffffff;
	return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Checks a code against the current step and one step either side (clock drift). Returns the
 * matching step so the caller can refuse it next time, or null. Steps at or before
 * `lastStep` are refused, so a code can't be replayed.
 */
export function verifyTotp(
	secret: string,
	code: string,
	time: Date,
	lastStep: number | null = null
): number | null {
	const clean = code.replace(/\s/g, '');
	if (!/^\d{6}$/.test(clean)) return null;
	const now = stepAt(time);
	for (const step of [now - 1, now, now + 1]) {
		if (lastStep !== null && step <= lastStep) continue;
		if (safeEqual(codeForStep(secret, step), clean)) return step;
	}
	return null;
}

export function otpauthUri(secret: string, account: string): string {
	const label = encodeURIComponent(`vibeLABS:${account}`);
	return `otpauth://totp/${label}?secret=${secret}&issuer=vibeLABS&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** Ten single-use recovery codes like `k3m9-x2pq-7t`, and their hashes for storage. */
export function newRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
	const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
	const codes = Array.from({ length: count }, () => {
		const bytes = randomBytes(10);
		const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
		return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 10)}`;
	});
	return { codes, hashes: codes.map(hashRecoveryCode) };
}

/** Recovery codes are compared case-insensitively and with or without the dashes. */
export const hashRecoveryCode = (code: string): string =>
	sha256(code.toLowerCase().replace(/[\s-]/g, ''));

export const looksLikeRecoveryCode = (code: string): boolean =>
	/^[a-z0-9]{10}$/i.test(code.replace(/[\s-]/g, ''));
