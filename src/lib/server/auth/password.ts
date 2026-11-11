/**
 * Passwords, following NIST SP 800-63B: long rather than complicated, checked against known
 * breaches, hashed with Argon2id at OWASP's recommended cost.
 */
import { hash, verify } from '@node-rs/argon2';
import { createHash } from 'node:crypto';

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

/** Argon2id (`Algorithm.Argon2id` is 2; the enum is const, so it is written out here). */
const ARGON2 = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/** Why a password can't be used, or null. The breach check is separate (it needs the network). */
export function passwordProblem(
	password: string,
	context: { email?: string | null; username?: string | null } = {}
): string | null {
	if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
	if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
	if (new Set(password).size < 4) return 'That password repeats too few characters.';
	const lower = password.toLowerCase();
	for (const value of [context.email, context.email?.split('@')[0], context.username])
		if (value && value.length >= 4 && lower.includes(value.toLowerCase()))
			return "Don't use your email address or username in your password.";
	return null;
}

export const hashPassword = (password: string): Promise<string> => hash(password, ARGON2);

/** A real hash of a random password: checking against it costs the same as checking a real one. */
let dummy: Promise<string> | undefined;

/** Checks a password; with no stored hash it still spends the same time, so timing reveals nothing. */
export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
	if (!stored) {
		dummy ??= hashPassword(crypto.randomUUID());
		await verify(await dummy, password).catch(() => false);
		return false;
	}
	return verify(stored, password).catch(() => false);
}

/**
 * Has this password appeared in a data breach? Uses the Have I Been Pwned range API with
 * k-anonymity: only the first 5 characters of the SHA-1 leave the server, padded so the size of
 * the reply gives nothing away. If the service can't be reached the password is allowed.
 */
export async function isBreached(
	fetchFn: typeof fetch,
	base: string | null,
	password: string
): Promise<boolean> {
	if (!base) return false;
	const digest = createHash('sha1').update(password).digest('hex').toUpperCase();
	const prefix = digest.slice(0, 5);
	const suffix = digest.slice(5);
	try {
		const response = await fetchFn(`${base}/range/${prefix}`, {
			headers: { 'add-padding': 'true', 'user-agent': 'vibeLABS (+https://vibelabsmc.org)' },
			signal: AbortSignal.timeout(4000)
		});
		if (!response.ok) return false;
		return (await response.text()).split(/\r?\n/).some((line) => {
			const [candidate, count] = line.split(':');
			return candidate === suffix && Number(count) > 0;
		});
	} catch {
		return false;
	}
}
