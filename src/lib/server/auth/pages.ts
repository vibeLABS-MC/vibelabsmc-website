/** Data every sign-in page shows: which providers are on, and where to go afterwards. */
import { redirect } from '@sveltejs/kit';
import { PROVIDERS, type ProviderId } from './oauth.ts';
import { safeNext } from './next.ts';

export function enabledProviders(config: App.Locals['config']): ProviderId[] {
	return PROVIDERS.filter((p) => config[p] !== null);
}

export function nextFrom(locals: App.Locals, url: URL, fallback = '/dashboard'): string {
	return safeNext(
		url.searchParams.get('next'),
		locals.config.origin,
		locals.config.accountOrigins,
		fallback
	);
}

/** Signed-in visitors skip the sign-in pages; a half-finished sign-in resumes at the second factor. */
export function skipIfSignedIn(locals: App.Locals, url: URL): void {
	if (locals.user) redirect(303, nextFrom(locals, url), { external: locals.config.accountOrigins });
	if (locals.pendingSession)
		redirect(303, `/auth/2fa?next=${encodeURIComponent(nextFrom(locals, url))}`);
}

export function authPageData(locals: App.Locals, url: URL) {
	return {
		providers: enabledProviders(locals.config),
		emailEnabled: locals.mailer.available,
		next: nextFrom(locals, url)
	};
}
