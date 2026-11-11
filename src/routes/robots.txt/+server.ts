import { SITE } from '#lib/site.ts';
import type { RequestHandler } from './$types';

/** Previews keep every crawler out; the live site lets them in and points at the sitemap. */
export const GET: RequestHandler = ({ locals }) => {
	const rules = locals.config.noindex
		? ['User-agent: *', 'Disallow: /']
		: [
				'User-agent: *',
				'Allow: /',
				'Disallow: /dashboard',
				'Disallow: /settings',
				'Disallow: /admin',
				'',
				`Sitemap: ${SITE.url}/sitemap.xml`
			];
	return new Response(rules.join('\n') + '\n', {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
