import { createHighlighter, type ShikiTransformer, type ThemeRegistration } from 'shiki';

/** Languages a code block may use, with the label shown on the block. */
export const LANGUAGES = {
	glsl: 'GLSL',
	properties: 'Properties',
	ini: 'INI',
	json: 'JSON',
	bash: 'Bash',
	text: 'Text'
} as const;

export type Language = keyof typeof LANGUAGES;

export const isLanguage = (name: string): name is Language => Object.hasOwn(LANGUAGES, name);

/**
 * Token kinds. Shiki needs a colour per scope, so each kind gets a unique placeholder colour that
 * is swapped for a class name; the real colours live in the stylesheet. Emitting classes rather
 * than inline styles keeps the page within a `style-src 'self'` Content Security Policy.
 */
const TOKENS = [
	{ name: 'comment', scopes: ['comment', 'punctuation.definition.comment'] },
	{
		name: 'directive',
		scopes: ['meta.preprocessor', 'keyword.control.directive', 'punctuation.definition.directive']
	},
	{ name: 'keyword', scopes: ['keyword.control', 'keyword.other', 'storage', 'support.type'] },
	{ name: 'number', scopes: ['constant.numeric', 'constant.language'] },
	{ name: 'function', scopes: ['entity.name.function', 'support.function'] },
	{ name: 'string', scopes: ['string'] },
	{
		name: 'key',
		scopes: [
			'support.type.property-name',
			'entity.name.tag',
			'keyword.other.definition.ini',
			'variable.other.property'
		]
	}
];

const placeholder = (i: number) => `#0000${(i + 1).toString(16).padStart(2, '0')}`;
const CLASS_BY_COLOUR = new Map(TOKENS.map((t, i) => [placeholder(i), `tk-${t.name}`]));

const THEME: ThemeRegistration = {
	name: 'vibelabs',
	type: 'dark',
	colors: { 'editor.background': '#000000', 'editor.foreground': '#ffffff' },
	tokenColors: TOKENS.map((t, i) => ({ scope: t.scopes, settings: { foreground: placeholder(i) } }))
};

export interface DocsHighlighter {
	/** Highlighted `<pre>` for one block; `lines` are 1-based line numbers to emphasise. */
	code(text: string, lang: Language, lines: ReadonlySet<number>): string;
}

export async function createDocsHighlighter(): Promise<DocsHighlighter> {
	const shiki = await createHighlighter({
		themes: [THEME],
		langs: Object.keys(LANGUAGES).filter((l) => l !== 'text')
	});
	return {
		code: (text, lang, lines) =>
			shiki.codeToHtml(text, {
				lang,
				theme: 'vibelabs',
				mergeWhitespaces: 'never',
				transformers: [classesNotStyles(lines)]
			})
	};
}

function classesNotStyles(lines: ReadonlySet<number>): ShikiTransformer {
	return {
		pre(node) {
			delete node.properties.style;
			node.properties.class = 'code-body';
		},
		line(node, line) {
			if (lines.has(line)) this.addClassToHast(node, 'hl');
		},
		span(node) {
			const colour = /color:(#[0-9a-f]{6})/i.exec(String(node.properties.style ?? ''))?.[1];
			delete node.properties.style;
			const name = colour && CLASS_BY_COLOUR.get(colour.toLowerCase());
			if (name) node.properties.class = name;
		}
	};
}
