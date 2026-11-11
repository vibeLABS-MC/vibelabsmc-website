/**
 * Response headers every page and endpoint gets. SvelteKit adds the Content-Security-Policy
 * itself (configured in vite.config.ts); these cover everything else.
 */

export interface HeaderOptions {
	production: boolean;
	/** Preview deployments ask search engines not to index anything. */
	noindex: boolean;
	/** Signed-in responses must never be stored by a shared cache. */
	personal: boolean;
}

export function securityHeaders(options: HeaderOptions): Record<string, string> {
	const headers: Record<string, string> = {
		'x-content-type-options': 'nosniff',
		'referrer-policy': 'strict-origin-when-cross-origin',
		'x-frame-options': 'DENY',
		'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
		'cross-origin-opener-policy': 'same-origin',
		// The docs site (same site, other origin) shows avatars from here.
		'cross-origin-resource-policy': 'same-site'
	};
	if (options.production)
		headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
	if (options.noindex) headers['x-robots-tag'] = 'noindex, nofollow';
	if (options.personal) headers['cache-control'] = 'private, no-store';
	return headers;
}

/** Applies headers without overwriting any a route already chose (e.g. its own cache-control). */
export function applyHeaders(response: Response, headers: Record<string, string>): void {
	for (const [name, value] of Object.entries(headers))
		if (!response.headers.has(name)) response.headers.set(name, value);
}
