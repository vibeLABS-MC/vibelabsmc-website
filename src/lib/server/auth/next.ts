/**
 * Where to send someone after signing in. Only paths on this site, or pages on the vibeLABS
 * sites listed in the config (the docs), are allowed: an attacker's `?next=https://evil` or
 * `//evil` falls back to the default.
 */
export function safeNext(
	next: string | null | undefined,
	origin: string,
	allowedOrigins: readonly string[],
	fallback = '/'
): string {
	if (!next) return fallback;
	if (next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
		// Resolve dot segments and control characters the way a browser would.
		const url = new URL(next, origin);
		return url.origin === origin ? url.pathname + url.search + url.hash : fallback;
	}
	try {
		const url = new URL(next);
		return allowedOrigins.includes(url.origin) ? url.toString() : fallback;
	} catch {
		return fallback;
	}
}
