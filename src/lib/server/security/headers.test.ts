import { describe, expect, it } from 'vitest';
import { applyHeaders, securityHeaders } from './headers.ts';

describe('securityHeaders', () => {
	it('always forbids framing, sniffing and powerful browser features', () => {
		const headers = securityHeaders({ production: false, noindex: false, personal: false });

		expect(headers).toEqual({
			'x-content-type-options': 'nosniff',
			'referrer-policy': 'strict-origin-when-cross-origin',
			'x-frame-options': 'DENY',
			'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
			'cross-origin-opener-policy': 'same-origin',
			'cross-origin-resource-policy': 'same-site'
		});
	});

	it('adds HSTS in production, noindex on previews and no-store for signed-in pages', () => {
		const headers = securityHeaders({ production: true, noindex: true, personal: true });

		expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
		expect(headers['x-robots-tag']).toBe('noindex, nofollow');
		expect(headers['cache-control']).toBe('private, no-store');
	});
});

describe('applyHeaders', () => {
	it('fills in missing headers but keeps the ones a route set', () => {
		const response = new Response('', { headers: { 'cache-control': 'public, max-age=60' } });

		applyHeaders(response, { 'cache-control': 'private, no-store', 'x-frame-options': 'DENY' });

		expect(response.headers.get('cache-control')).toBe('public, max-age=60');
		expect(response.headers.get('x-frame-options')).toBe('DENY');
	});
});
