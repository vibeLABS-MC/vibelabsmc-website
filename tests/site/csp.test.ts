import { describe, expect, it } from 'vitest';
import { Browser, ORIGIN } from './browser.ts';

/** Public pages every visitor can open; later test files add pages behind sign-in. */
export const PUBLIC_PAGES = ['/', '/login', '/signup', '/marketplace', '/marketplace/shaders'];

function policy(header: string | null): Map<string, string[]> {
	return new Map(
		(header ?? '').split(';').map((part) => {
			const [name, ...values] = part.trim().split(/\s+/);
			return [name!, values];
		})
	);
}

describe('content security policy on server-rendered pages', () => {
	const browser = new Browser();

	it.each(PUBLIC_PAGES)('%s sends a strict policy with a fresh nonce', async (path) => {
		const first = await browser.get(path);
		const second = await browser.get(path);
		const csp = policy(first.headers.get('content-security-policy'));

		expect(first.status).toBe(200);
		expect(csp.get('default-src')).toEqual(["'self'"]);
		expect(csp.get('object-src')).toEqual(["'none'"]);
		expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
		expect(csp.get('base-uri')).toEqual(["'none'"]);
		expect(csp.get('form-action')).toEqual(["'self'"]);
		const nonce = csp.get('script-src')?.find((v) => v.startsWith("'nonce-"));
		expect(nonce).toBeDefined();
		expect(second.headers.get('content-security-policy')).not.toContain(nonce);
	});

	it.each(PUBLIC_PAGES)('%s only runs inline scripts that carry the nonce', async (path) => {
		const page = await browser.get(path);
		const nonce = /'nonce-([^']+)'/.exec(page.headers.get('content-security-policy') ?? '')?.[1];
		const inline = [...page.text.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)];

		for (const [, attributes] of inline) expect(attributes).toContain(`nonce="${nonce}"`);
	});

	it.each(PUBLIC_PAGES)('%s has no style attributes the policy would block', async (path) => {
		expect((await browser.get(path)).text).not.toMatch(/\sstyle="/);
	});

	it('also sends the other security headers, and noindex on a preview', async () => {
		const page = await browser.get('/');

		expect(page.headers.get('x-content-type-options')).toBe('nosniff');
		expect(page.headers.get('x-frame-options')).toBe('DENY');
		expect(page.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect(page.headers.get('cross-origin-opener-policy')).toBe('same-origin');
		expect(page.headers.get('x-robots-tag')).toBe('noindex, nofollow');
	});

	it('loads fonts as files, never as data: URIs the policy blocks', async () => {
		const home = await browser.get('/');
		// SvelteKit writes relative links ("./_app/..."); resolve them like a browser does.
		const sheets = [...home.text.matchAll(/<link href="([^"]+\.css)"/g)].map(
			(m) => new URL(m[1]!, `${ORIGIN}/`).pathname
		);
		expect(sheets.length).toBeGreaterThan(0);
		const css = (await Promise.all(sheets.map(async (s) => (await browser.get(s)).text))).join(
			'\n'
		);

		expect(css).toMatch(/url\([^)]*\.woff2\)/);
		expect(css).not.toMatch(/url\(\s*["']?data:font/);
	});
});
