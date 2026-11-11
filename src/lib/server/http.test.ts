import { describe, expect, it } from 'vitest';
import { RateLimiter } from './security/rate-limit.ts';
import { emailProblem, field, fields, file, limitAction, limitRequest, rawField } from './http.ts';

const form = (entries: [string, string | Blob][]) => {
	const data = new FormData();
	for (const [k, v] of entries) data.append(k, v);
	return data;
};

describe('form fields', () => {
	const data = form([
		['name', '  Steve  '],
		['password', '  spaced  '],
		['tag', 'a'],
		['tag', ' '],
		['tag', 'b'],
		['upload', new File(['x'], 'x.zip')],
		['empty', new File([], 'e.zip')]
	]);

	it('trims text, keeps passwords exactly and collects repeated values', () => {
		expect(field(data, 'name')).toBe('Steve');
		expect(field(data, 'missing')).toBe('');
		expect(field(data, 'upload')).toBe('');
		expect(rawField(data, 'password')).toBe('  spaced  ');
		expect(rawField(data, 'upload')).toBe('');
		expect(fields(data, 'tag')).toEqual(['a', 'b']);
	});

	it('returns uploaded files, but not empty or missing ones', () => {
		expect(file(data, 'upload')?.name).toBe('x.zip');
		expect(file(data, 'empty')).toBeNull();
		expect(file(data, 'name')).toBeNull();
	});
});

describe('rate limits in routes', () => {
	const locals = () => ({ limiter: new RateLimiter() }) as App.Locals;

	it('lets requests through until the rule is used up, then answers 429', () => {
		const l = locals();
		for (let i = 0; i < 10; i++) expect(limitAction(l, 'login', 'ip')).toBeNull();
		const failure = limitAction(l, 'login', 'ip');

		expect(failure?.status).toBe(429);
		expect(failure?.data.message).toMatch(/^Too many attempts\. Try again in \d+ minutes\.$/);
	});

	it('throws a 429 from endpoints', () => {
		const l = locals();
		for (let i = 0; i < 30; i++) limitRequest(l, 'oauth', 'ip');

		expect(() => limitRequest(l, 'oauth', 'ip')).toThrow();
	});

	it('words short waits in seconds', () => {
		let time = 0;
		const l = { limiter: new RateLimiter(() => time) } as App.Locals;
		for (let i = 0; i < 10; i++) limitAction(l, 'login', 'x');
		time = 15 * 60_000 - 30_000;

		expect(limitAction(l, 'login', 'x')?.data.message).toBe(
			'Too many attempts. Try again in 30 seconds.'
		);
	});
});

describe('emailProblem', () => {
	it('accepts ordinary addresses and explains the rest', () => {
		expect(emailProblem('steve@example.org')).toBeNull();
		expect(emailProblem('')).toBe('Enter your email address.');
		expect(emailProblem('steve@example')).toBe('Enter a valid email address.');
		expect(emailProblem('st eve@example.org')).toBe('Enter a valid email address.');
		expect(emailProblem(`${'a'.repeat(250)}@x.org`)).toBe('Enter a valid email address.');
	});
});
