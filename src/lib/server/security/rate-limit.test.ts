import { describe, expect, it } from 'vitest';
import { RateLimiter, retryAfterSeconds, RULES } from './rate-limit.ts';

const rule = { limit: 3, windowMs: 1000 };

function clock(start = 0) {
	let time = start;
	return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('RateLimiter', () => {
	it('allows the limit, then refuses until the window ends', () => {
		const time = clock();
		const limiter = new RateLimiter(time.now);

		expect(limiter.hit('k', rule)).toEqual({ ok: true, remaining: 2, retryAfterMs: 0 });
		limiter.hit('k', rule);
		expect(limiter.hit('k', rule)).toEqual({ ok: true, remaining: 0, retryAfterMs: 0 });

		time.advance(400);
		expect(limiter.hit('k', rule)).toEqual({ ok: false, remaining: 0, retryAfterMs: 600 });

		time.advance(600);
		expect(limiter.hit('k', rule).ok).toBe(true);
	});

	it('counts each key on its own, and forgets a key on reset', () => {
		const limiter = new RateLimiter(clock().now);
		for (let i = 0; i < 4; i++) limiter.hit('a', rule);

		expect(limiter.hit('a', rule).ok).toBe(false);
		expect(limiter.hit('b', rule).ok).toBe(true);

		limiter.reset('a');
		expect(limiter.hit('a', rule).ok).toBe(true);
	});

	it('never holds more keys than its cap, dropping expired ones first', () => {
		const time = clock();
		const limiter = new RateLimiter(time.now, 3);
		limiter.hit('old', { limit: 1, windowMs: 10 });
		limiter.hit('a', rule);
		limiter.hit('b', rule);
		time.advance(20);

		limiter.hit('c', rule);
		expect(limiter.size).toBe(3);
		// 'old' expired and went first; 'a' is still counting.
		expect(limiter.hit('a', rule).remaining).toBe(1);
	});

	it('drops the oldest live keys when every key is still live', () => {
		const limiter = new RateLimiter(clock().now, 2);
		limiter.hit('a', rule);
		limiter.hit('b', rule);
		limiter.hit('c', rule);

		expect(limiter.size).toBe(2);
		expect(limiter.hit('b', rule).remaining).toBe(1);
		expect(limiter.hit('a', rule).remaining).toBe(2);
	});
});

describe('retryAfterSeconds', () => {
	it('rounds up, and is at least one second', () => {
		expect(retryAfterSeconds({ ok: false, remaining: 0, retryAfterMs: 1001 })).toBe(2);
		expect(retryAfterSeconds({ ok: true, remaining: 1, retryAfterMs: 0 })).toBe(1);
	});
});

describe('RULES', () => {
	it('keeps sign-in attempts tight and reading generous', () => {
		expect(RULES.login.limit).toBeLessThanOrEqual(10);
		expect(RULES.twoFactor.limit).toBeLessThanOrEqual(10);
		expect(RULES.api.limit).toBeGreaterThan(RULES.write.limit);
	});
});
