import { describe, expect, it } from 'vitest';
import { cspOf, files, htmlPages, read, sha256 } from './build';

describe('content security policy in the built pages', () => {
	it.each(htmlPages)('%s carries the policy', (page) => {
		const csp = cspOf(read(page));

		expect(csp.get('default-src')).toEqual(["'self'"]);
		expect(csp.get('object-src')).toEqual(["'none'"]);
	});

	it.each(htmlPages)('%s only runs inline scripts the policy lists', (page) => {
		const html = read(page);
		const allowed = cspOf(html).get('script-src') ?? [];
		const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];

		for (const [, body] of inline) expect(allowed).toContain(`'sha256-${sha256(body)}'`);
	});

	it.each(htmlPages)('%s has no style attributes the policy would block', (page) => {
		expect(read(page)).not.toMatch(/\sstyle="/);
	});

	it("allows the one inline style SvelteKit's route announcer sets", () => {
		const scripts = files
			.filter((f) => f.endsWith('.js'))
			.map(read)
			.join('\n');
		const announcer = /style="(position: absolute; left: 0; top: 0;[^"]+)"/.exec(scripts)?.[1];

		expect(announcer).toBeDefined();
		expect(cspOf(read('index.html')).get('style-src')).toContain(`'sha256-${sha256(announcer!)}'`);
	});

	it('loads fonts as files, never as data: URIs the policy blocks', () => {
		const css = files
			.filter((f) => f.endsWith('.css'))
			.map(read)
			.join('\n');

		expect(css).toMatch(/url\([^)]*\.woff2\)/);
		expect(css).not.toMatch(/url\(\s*["']?data:font/);
	});
});
