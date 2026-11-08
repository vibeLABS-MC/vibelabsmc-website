import { Marked, type Token, type TokenizerAndRendererExtension, type Tokens } from 'marked';
import { isLanguage, LANGUAGES, type DocsHighlighter } from './highlight';
import { ContentError } from './page';
import { parsePipeline, pipelineHtml } from './pipeline';

export interface Heading {
	id: string;
	text: string;
}

export interface Rendered {
	html: string;
	/** Second-level headings, for the "On this page" outline. */
	headings: Heading[];
}

const CALLOUTS = {
	NOTE: {
		title: 'Note',
		icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
	},
	TIP: {
		title: 'Tip',
		icon: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'
	},
	WARNING: {
		title: 'Warning',
		icon: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
	}
} as const;

type CalloutType = keyof typeof CALLOUTS;

interface CalloutToken extends Tokens.Generic {
	kind: CalloutType;
	title: Token[];
	tokens: Token[];
}

export function renderMarkdown(markdown: string, highlighter: DocsHighlighter): Rendered {
	const headings: Heading[] = [];
	const anchor = slugger();
	const marked = new Marked({ gfm: true, async: false });
	marked.use({
		extensions: [callout],
		renderer: {
			heading({ tokens, depth }) {
				const inner = this.parser.parseInline(tokens);
				const text = plain(inner);
				const id = anchor(text);
				if (depth === 2) headings.push({ id, text });
				return `<h${depth} id="${id}">${inner}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
			},
			code({ text, lang }) {
				return codeBlock(text, lang ?? '', highlighter);
			},
			html({ text }) {
				return escapeHtml(text);
			}
		}
	});
	const html = (marked.parse(markdown) as string)
		.replaceAll('<table>', '<div class="table-wrap"><table>')
		.replaceAll('</table>', '</table></div>');
	return { html, headings };
}

const callout: TokenizerAndRendererExtension = {
	name: 'callout',
	level: 'block',
	start: (src) => /^> \[!/m.exec(src)?.index,
	tokenizer(src) {
		const match = /^> \[!(\w+)\][ \t]*([^\n]*)\n?((?:>[^\n]*(?:\n|$))*)/.exec(src);
		if (!match) return undefined;
		const [raw, type, title, rest] = match;
		if (!Object.hasOwn(CALLOUTS, type)) {
			throw new ContentError(
				`callout type "${type}" must be one of ${Object.keys(CALLOUTS).join(', ')}`
			);
		}
		const kind = type as CalloutType;
		const token: CalloutToken = { type: 'callout', raw, kind, title: [], tokens: [] };
		this.lexer.inline(title.trim() || CALLOUTS[kind].title, token.title);
		this.lexer.blockTokens(rest.replace(/^> ?/gm, ''), token.tokens);
		return token;
	},
	renderer(token) {
		const { kind, title, tokens } = token as CalloutToken;
		const icon = `<svg class="callout-icon" viewBox="0 0 24 24" aria-hidden="true">${CALLOUTS[kind].icon}</svg>`;
		return (
			`<aside class="callout ${kind.toLowerCase()}">${icon}<div>` +
			`<p class="callout-title">${this.parser.parseInline(title)}</p>${this.parser.parse(tokens)}</div></aside>\n`
		);
	}
};

interface Fence {
	lang: string;
	title: string | undefined;
	lines: Set<number>;
}

/** Reads a fence's info string, such as `glsl title="shaders/final.fsh" {2,4-6}`. */
export function parseFence(info: string): Fence {
	const lines = new Set<number>();
	for (const part of (/\{([\d,\s-]+)\}/.exec(info)?.[1] ?? '').split(',')) {
		const [from, to = from] = part.split('-').map((n) => Number.parseInt(n, 10));
		for (let n = from; n <= to; n++) lines.add(n);
	}
	return { lang: info.split(/\s/)[0], title: /title="([^"]*)"/.exec(info)?.[1], lines };
}

function codeBlock(text: string, info: string, highlighter: DocsHighlighter): string {
	const fence = parseFence(info.trim());
	if (fence.lang === '') throw new ContentError('code block needs a language');
	if (fence.lang === 'pipeline') return pipelineHtml(parsePipeline(text));
	if (!isLanguage(fence.lang)) {
		throw new ContentError(
			`code language "${fence.lang}" must be one of ${Object.keys(LANGUAGES).join(', ')}`
		);
	}
	const file = fence.title ? `<span class="code-file">${escapeHtml(fence.title)}</span>` : '';
	return (
		`<figure class="code"><figcaption>${file}<span class="code-lang">${LANGUAGES[fence.lang]}</span>` +
		'<button type="button" class="code-copy" data-copy aria-label="Copy code"><svg viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>' +
		`</figcaption>${highlighter.code(text, fence.lang, fence.lines)}</figure>\n`
	);
}

/** Anchors the way GitHub makes them, numbering repeats: `inputs`, `inputs-1`. */
function slugger(): (text: string) => string {
	const seen = new Map<string, number>();
	return (text) => {
		const base = text
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s_-]/gu, '')
			.replace(/\s/g, '-');
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${count}`;
	};
}

function plain(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.replaceAll('&amp;', '&')
		.trim();
}

function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/** About 200 words a minute; code is skimmed, so it does not count. */
export function readingMinutes(markdown: string): number {
	const words = markdown.replace(/```[\s\S]*?```/g, '').match(/\S+/g)?.length ?? 0;
	return Math.max(1, Math.ceil(words / 200));
}
