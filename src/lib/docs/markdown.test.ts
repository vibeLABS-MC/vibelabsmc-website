import { beforeAll, describe, expect, it } from 'vitest';
import { createDocsHighlighter, type DocsHighlighter } from './highlight';
import { readingMinutes, renderMarkdown } from './markdown';

let highlighter: DocsHighlighter;
beforeAll(async () => {
	highlighter = await createDocsHighlighter();
});

const render = (markdown: string) => renderMarkdown(markdown, highlighter);

describe('headings', () => {
	it('gives each heading the same anchor GitHub would and lists second-level headings', () => {
		const { html, headings } = render(
			'## Writing to render targets\n\n### `gbuffers_water` & friends\n'
		);

		expect(html).toContain('<h2 id="writing-to-render-targets">');
		expect(html).toContain('<h3 id="gbuffers_water--friends">');
		expect(headings).toEqual([
			{ id: 'writing-to-render-targets', text: 'Writing to render targets' }
		]);
	});

	it('keeps anchors unique when two headings share a name', () => {
		const { headings } = render('## Inputs\n\n## Inputs\n');

		expect(headings.map((h) => h.id)).toEqual(['inputs', 'inputs-1']);
	});
});

describe('callouts', () => {
	it('turns a typed quote into a titled callout with Markdown inside', () => {
		const { html } = render(
			'> [!WARNING] Buffers are `cleared`\n> Keep **data** between frames.\n'
		);

		expect(html).toContain('<aside class="callout warning">');
		expect(html).toContain('<p class="callout-title">Buffers are <code>cleared</code></p>');
		expect(html).toContain('<p>Keep <strong>data</strong> between frames.</p>');
	});

	it('uses the type as the title when none is given', () => {
		const { html } = render('> [!TIP]\n> Press F3 + R to reload.\n');

		expect(html).toContain('<p class="callout-title">Tip</p>');
	});

	it('rejects a callout type it does not know', () => {
		expect(() => render('> [!DANGER] Oops\n> Text\n')).toThrow(
			'callout type "DANGER" must be one of NOTE, TIP, WARNING'
		);
	});

	it('leaves an ordinary quote alone', () => {
		expect(render('> Just a quote\n').html).toContain('<blockquote>');
	});
});

describe('code blocks', () => {
	const block =
		'```glsl title="shaders/composite.fsh" {2}\nuniform sampler2D colortex0;\nfloat d = 0.5;\n```\n';

	it('highlights with classes instead of inline styles, so the strict CSP allows it', () => {
		const { html } = render(block);

		expect(html).toMatch(/<span class="tk-keyword">uniform<\/span>/);
		expect(html).toMatch(/<span class="tk-number">0\.5<\/span>/);
		expect(html).not.toContain('style=');
	});

	it('shows the file name and language and marks highlighted lines', () => {
		const { html } = render(block);

		expect(html).toContain('<span class="code-file">shaders/composite.fsh</span>');
		expect(html).toContain('<span class="code-lang">GLSL</span>');
		expect(html.match(/class="line hl"/g)).toHaveLength(1);
		expect(html.match(/class="line"/g)).toHaveLength(1);
	});

	it('rejects a language the docs do not support', () => {
		expect(() => render('```hlsl\nfloat x;\n```\n')).toThrow(
			'code language "hlsl" must be one of glsl, properties, ini, json, bash, text'
		);
	});

	it('rejects indented code, which cannot carry a language', () => {
		expect(() => render('Text\n\n    float x;\n')).toThrow('code block needs a language');
	});

	it('requires a language so readers get highlighting and a label', () => {
		expect(() => render('```\nplain\n```\n')).toThrow('code block needs a language');
	});
});

describe('pipeline diagrams', () => {
	it('draws the listed passes in order with their kind', () => {
		const { html } = render('```pipeline\nshadow\ndeferred\nfinal\n```\n');

		const programs = [...html.matchAll(/<code class="pass-node (\w+)">(\w+)<\/code>/g)];
		expect(programs.map((m) => [m[2], m[1]])).toEqual([
			['shadow', 'geometry'],
			['deferred', 'fullscreen'],
			['final', 'fullscreen']
		]);
	});

	it('rejects a pass name it does not know', () => {
		expect(() => render('```pipeline\nshadow\nbloom\n```\n')).toThrow('unknown pass "bloom"');
	});
});

describe('safety and layout', () => {
	it('shows raw HTML as text instead of running it', () => {
		const { html } = render('<script>alert(1)</script>\n\nHi <img src=x onerror=alert(1)>\n');

		expect(html).not.toContain('<script>');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;script&gt;');
	});

	it('wraps tables so wide ones scroll on small screens', () => {
		const { html } = render('| a | b |\n| - | - |\n| 1 | 2 |\n');

		expect(html).toMatch(/^<div class="table-wrap"><table>[\s\S]*<\/table><\/div>$/m);
	});
});

describe('readingMinutes', () => {
	it('counts prose at about 200 words a minute and ignores code', () => {
		const prose = Array.from({ length: 450 }, () => 'word').join(' ');
		const code = '```glsl\n' + 'float x;\n'.repeat(500) + '```';

		expect(readingMinutes(`${prose}\n\n${code}`)).toBe(3);
		expect(readingMinutes('Short.')).toBe(1);
	});
});

describe('readingMinutes for an empty page', () => {
	it('still reports one minute', () => {
		expect(readingMinutes('')).toBe(1);
	});
});
