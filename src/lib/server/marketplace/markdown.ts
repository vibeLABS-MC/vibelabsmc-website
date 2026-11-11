/**
 * Project descriptions and changelogs are Markdown written by anyone, so the HTML is built on
 * the server and then passed through a strict allowlist: no scripts, no styles, no event
 * handlers, no iframes. Images may only come from this site's own /media/ (the project's
 * gallery); any other image becomes a link, so pages never load third-party content.
 */
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const marked = new Marked({ gfm: true, breaks: false, async: false });

const ALLOWED_TAGS = [
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'p',
	'br',
	'hr',
	'blockquote',
	'pre',
	'code',
	'kbd',
	'strong',
	'em',
	'del',
	's',
	'sup',
	'sub',
	'ul',
	'ol',
	'li',
	'a',
	'img',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',
	'details',
	'summary',
	'span'
];

const LOCAL_IMAGE = /^\/media\/[0-9a-f]{64}(\.thumb)?\.webp$/;

export const isLocalImage = (src: string): boolean => LOCAL_IMAGE.test(src);

function sanitize(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: {
			a: ['href', 'title', 'rel', 'target'],
			img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
			code: ['class'],
			th: ['align'],
			td: ['align'],
			ol: ['start']
		},
		allowedClasses: { code: [/^language-[\w-]+$/] },
		allowedSchemes: ['https', 'http', 'mailto'],
		allowedSchemesByTag: { img: [] },
		allowProtocolRelative: false,
		transformTags: {
			a: (tag, attribs) => {
				const external = /^https?:\/\//i.test(attribs.href ?? '');
				return {
					tagName: 'a',
					attribs: external
						? { ...attribs, rel: 'nofollow ugc noopener noreferrer', target: '_blank' }
						: attribs
				};
			},
			img: ((tag: string, attribs: sanitizeHtml.Attributes) => {
				const src = attribs.src ?? '';
				if (isLocalImage(src)) return { tagName: 'img', attribs: { ...attribs, loading: 'lazy' } };
				return {
					tagName: 'a',
					attribs: { href: src, rel: 'nofollow ugc noopener noreferrer', target: '_blank' },
					text: attribs.alt || src
				};
			}) as sanitizeHtml.Transformer
		},
		exclusiveFilter: (frame) => frame.tag === 'a' && !frame.attribs.href
	});
}

export function renderMarkdown(source: string): string {
	return sanitize(marked.parse(source.slice(0, 100_000)) as string);
}

/** Plain text for summaries and search snippets. */
export function markdownToText(source: string, max = 300): string {
	const text = sanitizeHtml(marked.parse(source.slice(0, 20_000)) as string, {
		allowedTags: [],
		allowedAttributes: {}
	})
		.replace(/\s+/g, ' ')
		.trim();
	return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
