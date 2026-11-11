/** Small helpers every route uses: reading form fields and applying rate limits. */
import { error, fail, type ActionFailure } from '@sveltejs/kit';
import { retryAfterSeconds, RULES, type RuleName } from './security/rate-limit.ts';

/** A trimmed text field ('' when missing or not text). */
export function field(data: FormData, name: string): string {
	const value = data.get(name);
	return typeof value === 'string' ? value.trim() : '';
}

/** A text field kept exactly as typed (passwords: spaces are part of them). */
export function rawField(data: FormData, name: string): string {
	const value = data.get(name);
	return typeof value === 'string' ? value : '';
}

/** Every checked value of a multi-select or checkbox group. */
export function fields(data: FormData, name: string): string[] {
	return data
		.getAll(name)
		.filter((v): v is string => typeof v === 'string')
		.map((v) => v.trim())
		.filter(Boolean);
}

export function file(data: FormData, name: string): File | null {
	const value = data.get(name);
	return value instanceof File && value.size > 0 ? value : null;
}

const tooMany = (seconds: number) =>
	`Too many attempts. Try again in ${seconds < 120 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`}.`;

/** For form actions: a failure to return when over the limit, otherwise null. */
export function limitAction(
	locals: App.Locals,
	rule: RuleName,
	who: string
): ActionFailure<{ message: string }> | null {
	const verdict = locals.limiter.hit(`${rule}:${who}`, RULES[rule]);
	return verdict.ok ? null : fail(429, { message: tooMany(retryAfterSeconds(verdict)) });
}

/** For endpoints and loads: throws a 429 when over the limit. */
export function limitRequest(locals: App.Locals, rule: RuleName, who: string): void {
	const verdict = locals.limiter.hit(`${rule}:${who}`, RULES[rule]);
	if (!verdict.ok) error(429, tooMany(retryAfterSeconds(verdict)));
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailProblem(email: string): string | null {
	if (!email) return 'Enter your email address.';
	if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
	return null;
}
