import { describe, expect, it } from 'vitest';
import { FAQ } from '../../src/lib/landing';
import { Browser } from './browser.ts';

const browser = new Browser();

describe('the landing page', () => {
	it('has a title, a description, its canonical address and one heading', async () => {
		const home = (await browser.get('/')).text;

		expect(home).toContain('<title>vibeLABS: Minecraft shaders, explained</title>');
		expect(home).toMatch(/<meta name="description" content="[^"]{50,}"/);
		expect(home).toContain('<link rel="canonical" href="https://vibelabsmc.org/"');
		expect(home.match(/<h1[\s>]/g)).toHaveLength(1);
	});

	it('sends readers to the docs site, never to the old /docs pages on this site', async () => {
		const hrefs = [...(await browser.get('/')).text.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);

		expect(hrefs.some((h) => h.startsWith('https://docs.vibelabsmc.org/'))).toBe(true);
		expect(hrefs.filter((h) => h.startsWith('/docs'))).toEqual([]);
	});

	it('keeps every FAQ answer in the HTML, so it is readable without JavaScript', async () => {
		const home = (await browser.get('/')).text;
		for (const item of FAQ) {
			const answer = item.answer.replaceAll('’', '&#8217;');
			expect(home.includes(item.answer) || home.includes(answer)).toBe(true);
		}
	});

	it('links to the marketplace and to sign in from the header', async () => {
		const home = (await browser.get('/')).text;

		expect(home).toContain('href="/marketplace"');
		expect(home).toMatch(/href="\/login(\?[^"]*)?"/);
	});
});

describe('site files', () => {
	it('serves a sitemap and, on a preview, a robots.txt that keeps crawlers out', async () => {
		const sitemap = await browser.get('/sitemap.xml');
		const robots = await browser.get('/robots.txt');

		expect(sitemap.headers.get('content-type')).toContain('application/xml');
		expect(sitemap.text).toContain('<loc>https://vibelabsmc.org/</loc>');
		expect(robots.text).toContain('Disallow: /');
	});

	it('answers unknown pages with a styled 404', async () => {
		const page = await browser.get('/no-such-page');

		expect(page.status).toBe(404);
		expect(page.text).toContain('<title>');
		expect(page.text).toContain('href="/"');
	});
});
