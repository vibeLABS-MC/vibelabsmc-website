import { building } from '$app/env';
import { error, redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { decideAccess } from '#lib/server/auth/access.ts';
import { SESSION_COOKIE, sessionCookieOptions, validateSession } from '#lib/server/auth/session.ts';
import { toSessionUser, toViewer } from '#lib/server/auth/viewer.ts';
import { startJobs } from '#lib/server/jobs.ts';
import { runtime } from '#lib/server/runtime.ts';
import { hmac, newId } from '#lib/server/security/crypto.ts';
import { applyHeaders, securityHeaders } from '#lib/server/security/headers.ts';

/** Fails the start-up, not the first request, when the configuration is incomplete. */
export const init: ServerInit = async () => {
	if (building) return;
	const rt = await runtime();
	await startJobs(rt);
	// adapter-node emits this after it stops taking requests: close the pool so the process ends.
	process.once('sveltekit:shutdown', () => void rt.close());
};

/** Only the upload endpoint takes big bodies; everything else stops at 10 MB before reading. */
const UPLOAD_PATH = /^\/api\/projects\/[^/]+\/uploads$/;
const BODY_LIMIT = 10 * 1024 * 1024;

/**
 * The visitor's address, from the X-Real-IP header nginx sets (from Cloudflare's address when
 * the request came through Cloudflare). The app only listens on localhost, so a request without
 * it is a local health check: it gets a placeholder rather than an error.
 */
function clientAddress(get: () => string): string {
	try {
		return get();
	} catch {
		return '127.0.0.1';
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const length = Number(event.request.headers.get('content-length') ?? 0);
	if (length > BODY_LIMIT && !UPLOAD_PATH.test(event.url.pathname))
		error(413, 'That request is too large.');
	const { config, db, limiter, mailer, keys } = await runtime();
	const ip = clientAddress(event.getClientAddress);
	Object.assign(event.locals, {
		db,
		config,
		limiter,
		mailer,
		keys,
		ip,
		ipHash: hmac(keys.ip, ip),
		user: null,
		session: null,
		pendingSession: null
	});

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const found = await validateSession(db, token);
		if (!found) event.cookies.delete(SESSION_COOKIE, sessionCookieOptions(new Date(0)));
		else if (found.session.pendingTwoFactor) event.locals.pendingSession = found.session;
		else {
			event.locals.session = found.session;
			event.locals.user = toSessionUser(found.user);
		}
	}

	const decision = decideAccess(
		event.url.pathname,
		event.url.search,
		toViewer(event.locals.user, event.locals.session)
	);
	if (decision.kind === 'redirect') redirect(303, decision.to);
	if (decision.kind === 'not-found') error(404, 'Not found');

	const response = await resolve(event);
	applyHeaders(
		response,
		securityHeaders({
			production: config.production,
			noindex: config.noindex,
			personal: !!(event.locals.session || event.locals.pendingSession)
		})
	);
	return response;
};

/** Unexpected errors: log the detail with an ID, show the visitor only the ID. */
export const handleError: HandleServerError = (caught) => {
	if (caught.kind !== 'unknown') return;
	const id = newId(8);
	console.error(
		`[error ${id}] ${caught.event.request.method} ${caught.event.url.pathname}`,
		caught.error
	);
	return { message: 'Something went wrong on our side.', id };
};
