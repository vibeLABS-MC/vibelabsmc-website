/**
 * The few cryptographic building blocks everything else uses. Node's own crypto only:
 * no home-made primitives.
 */
import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	hkdfSync,
	randomBytes,
	timingSafeEqual
} from 'node:crypto';

/** A random token with `bytes` bytes of entropy, URL-safe. 32 bytes = 256 bits. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

const ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

/** A short random ID for database rows and URLs (Crockford base32, 12 chars = 60 bits). */
export function newId(length = 12): string {
	const bytes = randomBytes(length);
	let id = '';
	for (const byte of bytes) id += ID_ALPHABET[byte & 31];
	return id;
}

export const sha256 = (value: string | Buffer): string =>
	createHash('sha256').update(value).digest('base64url');

export const hmac = (key: Buffer, value: string): string =>
	createHmac('sha256', key).update(value).digest('base64url');

/** A separate key per purpose, so one leaked derived key never exposes another. */
export const deriveKey = (secret: Buffer, purpose: string): Buffer =>
	Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), `vibelabs:${purpose}`, 32));

/** Compares two strings in constant time (for codes and tokens). */
export function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}

/** AES-256-GCM. The output is `v1.<iv>.<ciphertext+tag>`, all base64url. */
export function encrypt(key: Buffer, plaintext: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const body = Buffer.concat([
		cipher.update(plaintext, 'utf8'),
		cipher.final(),
		cipher.getAuthTag()
	]);
	return `v1.${iv.toString('base64url')}.${body.toString('base64url')}`;
}

export function decrypt(key: Buffer, sealed: string): string {
	const [version, iv, body] = sealed.split('.');
	if (version !== 'v1' || !iv || !body) throw new Error('Unknown sealed value format.');
	const bytes = Buffer.from(body, 'base64url');
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
	decipher.setAuthTag(bytes.subarray(bytes.length - 16));
	return Buffer.concat([
		decipher.update(bytes.subarray(0, bytes.length - 16)),
		decipher.final()
	]).toString('utf8');
}
