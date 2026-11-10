import { describe, expect, it } from 'vitest';
import { docsUrl, SITE } from './site.ts';

describe('docsUrl', () => {
	it('points at a page on the docs site', () => {
		expect(docsUrl('/using/install-iris/')).toBe('https://docs.vibelabsmc.org/using/install-iris/');
	});

	it('keeps a heading anchor', () => {
		expect(docsUrl('/using/install-optifine/#optifine-or-iris')).toBe(
			'https://docs.vibelabsmc.org/using/install-optifine/#optifine-or-iris'
		);
	});

	it('defaults to the docs home page', () => {
		expect(docsUrl()).toBe(`${SITE.docs}/`);
	});

	it('rejects a relative path, which would silently link to the wrong page', () => {
		expect(() => docsUrl('using/install-iris/')).toThrow(
			'Docs paths start with "/": got "using/install-iris/"'
		);
	});

	it('rejects a page path without its trailing slash, which costs a redirect', () => {
		expect(() => docsUrl('/using/install-iris')).toThrow(
			'Docs page paths end with "/": got "/using/install-iris"'
		);
	});
});
