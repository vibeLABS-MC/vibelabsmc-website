import { describe, expect, it } from 'vitest';
import { isLocalImage, markdownToText, renderMarkdown } from './markdown.ts';

const KEY = 'a'.repeat(64);

describe('renderMarkdown', () => {
	it('renders GitHub-flavoured Markdown', () => {
		const html = renderMarkdown(
			'# Title\n\n**bold** and `code`\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done'
		);

		expect(html).toContain('<h1>Title</h1>');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<code>code</code>');
		expect(html).toContain('<table>');
	});

	it('removes scripts, styles, event handlers, iframes and javascript: links', () => {
		const html = renderMarkdown(
			'<script>alert(1)</script><style>body{}</style><img src=x onerror=alert(1)><iframe src="https://evil"></iframe>' +
				'<p style="color:red" onclick="x()">hi</p>\n\n[click](javascript:alert(1)) <a href="data:text/html,x">d</a>'
		);

		expect(html).not.toMatch(/<script|<style|onerror|onclick|<iframe|style=|javascript:|data:/i);
		expect(html).toContain('<p>hi</p>');
	});

	it('keeps images from the project gallery, and turns other images into links', () => {
		const html = renderMarkdown(
			`![shot](/media/${KEY}.webp) ![remote](https://tracker.example/pixel.png)`
		);

		expect(html).toContain(`<img src="/media/${KEY}.webp" alt="shot" loading="lazy" />`);
		expect(html).not.toContain('<img src="https://');
		expect(html).toContain(
			'<a href="https://tracker.example/pixel.png" rel="nofollow ugc noopener noreferrer" target="_blank">remote</a>'
		);
	});

	it('marks outside links as user content that opens in a new tab', () => {
		const html = renderMarkdown('[source](https://github.com/x/y) and [local](/marketplace)');

		expect(html).toContain(
			'<a href="https://github.com/x/y" rel="nofollow ugc noopener noreferrer" target="_blank">source</a>'
		);
		expect(html).toContain('<a href="/marketplace">local</a>');
	});

	it('keeps a code block language for highlighting', () => {
		expect(renderMarkdown('```glsl\nvoid main() {}\n```')).toContain(
			'<code class="language-glsl">'
		);
	});
});

describe('markdownToText', () => {
	it('strips formatting and shortens long text', () => {
		expect(markdownToText('# Hi\n\nSome **bold** text.')).toBe('Hi Some bold text.');
		expect(markdownToText('word '.repeat(100), 20)).toBe('word word word word…');
	});
});

describe('isLocalImage', () => {
	it('accepts only gallery images from this site', () => {
		expect(isLocalImage(`/media/${KEY}.webp`)).toBe(true);
		expect(isLocalImage(`/media/${KEY}.thumb.webp`)).toBe(true);
		expect(isLocalImage('/media/../secret.webp')).toBe(false);
		expect(isLocalImage(`https://x/media/${KEY}.webp`)).toBe(false);
	});
});
