/**
 * A tiny browser for site tests: keeps cookies like a real one (including __Host- cookies over
 * the test's plain-http origin), lets a test choose its IP address, and leaves redirects to the
 * test so each step can be checked.
 */
import { inject } from 'vitest';

export const ORIGIN = inject('origin');

export interface Page {
	status: number;
	headers: Headers;
	text: string;
	location: string | null;
}

let nextIp = 1;

export class Browser {
	readonly cookies = new Map<string, string>();
	/** Each browser gets its own address, so rate limits in one test never hit another. */
	ip = `10.0.${Math.floor(nextIp / 250)}.${(nextIp++ % 250) + 1}`;

	async request(path: string, init: RequestInit = {}): Promise<Page> {
		const url = path.startsWith('http') ? path : ORIGIN + path;
		const headers = new Headers(init.headers);
		headers.set('x-real-ip', this.ip);
		// What a browser sends; without it SvelteKit answers form posts with JSON for `fetch` callers.
		if (!headers.has('accept')) headers.set('accept', 'text/html,application/xhtml+xml');
		if (this.cookies.size)
			headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
		const response = await fetch(url, { ...init, headers, redirect: 'manual' });
		for (const line of response.headers.getSetCookie()) {
			const [pair, ...attributes] = line.split(';');
			const [name, ...rest] = pair!.split('=');
			const value = rest.join('=');
			const expired = attributes.some((a) => /^\s*max-age=0\s*$/i.test(a)) || value === '';
			if (expired) this.cookies.delete(name!.trim());
			else this.cookies.set(name!.trim(), value);
		}
		return {
			status: response.status,
			headers: response.headers,
			text: await response.text(),
			location: response.headers.get('location')
		};
	}

	get(path: string, headers: Record<string, string> = {}) {
		return this.request(path, { headers });
	}

	/** Submits a form the way a browser does without JavaScript (SvelteKit form actions). */
	post(path: string, fields: Record<string, string | Blob>, headers: Record<string, string> = {}) {
		const form = new FormData();
		for (const [k, v] of Object.entries(fields)) form.append(k, v);
		return this.request(path, {
			method: 'POST',
			body: form,
			headers: { origin: ORIGIN, ...headers }
		});
	}

	/** Follows redirects on this site, the way a browser would after a form post. */
	async follow(page: Page, limit = 5): Promise<Page> {
		let current = page;
		while (current.location && limit-- > 0) {
			const next = new URL(current.location, ORIGIN);
			if (next.origin !== ORIGIN) return current;
			current = await this.get(next.pathname + next.search);
		}
		return current;
	}
}

/** The value of a meta or attribute in HTML, for quick assertions. */
export const findAll = (html: string, pattern: RegExp) =>
	[...html.matchAll(pattern)].map((m) => m[1]!);
