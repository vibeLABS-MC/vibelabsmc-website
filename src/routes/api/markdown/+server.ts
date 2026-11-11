import { error, json } from '@sveltejs/kit';
import { limitRequest } from '#lib/server/http.ts';
import { renderMarkdown } from '#lib/server/marketplace/markdown.ts';
import type { RequestHandler } from './$types';

/** Live preview for the description and changelog editors: the same sanitised HTML the page shows. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Sign in first.');
	limitRequest(locals, 'api', `preview:${locals.user.id}`);
	const { source } = (await request.json().catch(() => ({}))) as { source?: unknown };
	if (typeof source !== 'string') error(400, 'Send { source }.');
	return json({ html: renderMarkdown(source) });
};
