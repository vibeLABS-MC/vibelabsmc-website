import { describe, expect, it } from 'vitest';
import { FAQ } from '../../src/lib/landing';
import { files, read } from './build';

const home = read('index.html');
const hrefs = [...home.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe('the built landing page', () => {
	it('has a title, a description, its canonical address and one heading', () => {
		expect(home).toContain('<title>vibeLABS: Minecraft shaders, explained</title>');
		expect(home).toMatch(/<meta name="description" content="[^"]{50,}"/);
		expect(home).toContain('<link rel="canonical" href="https://vibelabsmc.org/"');
		expect(home.match(/<h1[\s>]/g)).toHaveLength(1);
	});

	it('sends readers to the docs site, never to the old /docs pages on this site', () => {
		expect(hrefs.some((h) => h.startsWith('https://docs.vibelabsmc.org/'))).toBe(true);
		expect(hrefs.filter((h) => h.startsWith('/docs'))).toEqual([]);
	});

	it('keeps every FAQ answer in the HTML, so it is readable without JavaScript', () => {
		for (const item of FAQ) {
			const answer = item.answer.replaceAll('’', '&#8217;');
			expect(home.includes(item.answer) || home.includes(answer)).toBe(true);
		}
	});

	it('lists the one page in the sitemap and serves a not-found page', () => {
		expect(read('sitemap.xml')).toContain('<loc>https://vibelabsmc.org/</loc>');
		expect(files).toEqual(expect.arrayContaining(['404.html', '.nojekyll', 'robots.txt']));
		expect(read('robots.txt')).toContain('Sitemap: https://vibelabsmc.org/sitemap.xml');
	});
});
