/**
 * Fixed-window rate limits, kept in memory. The site runs as one process, so memory is the
 * simplest store that is always right; a restart forgets the counts, which only ever helps a
 * real user. The map is capped so a flood of keys cannot exhaust memory.
 */

export interface Rule {
	limit: number;
	windowMs: number;
}

export interface Verdict {
	ok: boolean;
	remaining: number;
	retryAfterMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Every limit in one place, so they are easy to review. Keys are `${rule}:${who}`. */
export const RULES = {
	login: { limit: 10, windowMs: 15 * MINUTE },
	loginAccount: { limit: 20, windowMs: HOUR },
	signup: { limit: 5, windowMs: HOUR },
	emailSend: { limit: 5, windowMs: HOUR },
	oauth: { limit: 30, windowMs: 10 * MINUTE },
	twoFactor: { limit: 10, windowMs: 15 * MINUTE },
	upload: { limit: 60, windowMs: HOUR },
	write: { limit: 120, windowMs: 10 * MINUTE },
	review: { limit: 10, windowMs: 24 * HOUR },
	report: { limit: 20, windowMs: 24 * HOUR },
	api: { limit: 600, windowMs: 10 * MINUTE }
} as const satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

export class RateLimiter {
	private readonly buckets = new Map<string, { count: number; resetAt: number }>();
	private readonly now: () => number;
	private readonly maxKeys: number;

	// Plain fields rather than parameter properties, so Node can run this file as it is.
	constructor(now: () => number = Date.now, maxKeys = 100_000) {
		this.now = now;
		this.maxKeys = maxKeys;
	}

	hit(key: string, rule: Rule): Verdict {
		const time = this.now();
		let bucket = this.buckets.get(key);
		if (!bucket || bucket.resetAt <= time) {
			this.makeRoom(time);
			bucket = { count: 0, resetAt: time + rule.windowMs };
			this.buckets.set(key, bucket);
		}
		bucket.count += 1;
		const ok = bucket.count <= rule.limit;
		return {
			ok,
			remaining: Math.max(0, rule.limit - bucket.count),
			retryAfterMs: ok ? 0 : bucket.resetAt - time
		};
	}

	/** Forget a key, e.g. the failed-login count after a successful sign-in. */
	reset(key: string): void {
		this.buckets.delete(key);
	}

	get size(): number {
		return this.buckets.size;
	}

	private makeRoom(time: number): void {
		if (this.buckets.size < this.maxKeys) return;
		for (const [key, bucket] of this.buckets) if (bucket.resetAt <= time) this.buckets.delete(key);
		// Still full of live keys: drop the oldest ones (Map keeps insertion order).
		const excess = this.buckets.size - this.maxKeys + 1;
		let dropped = 0;
		for (const key of this.buckets.keys()) {
			if (dropped++ >= excess) break;
			this.buckets.delete(key);
		}
	}
}

/** Seconds to put in a Retry-After header, never less than one. */
export const retryAfterSeconds = (verdict: Verdict): number =>
	Math.max(1, Math.ceil(verdict.retryAfterMs / 1000));
