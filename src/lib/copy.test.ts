// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyCode } from './copy';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
	vi.useFakeTimers();
	writeText.mockReset().mockResolvedValue(undefined);
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
	document.body.innerHTML = `
		<figure class="code">
			<figcaption><button data-copy aria-label="Copy code"><svg><rect /></svg></button></figcaption>
			<pre><code><span class="line">float d = 0.5;</span>
<span class="line">color *= d;</span></code></pre>
		</figure>
		<p>Elsewhere</p>`;
});

afterEach(() => vi.useRealTimers());

const click = (target: Element) => copyCode({ target } as unknown as MouseEvent);
const button = () => document.querySelector<HTMLButtonElement>('[data-copy]')!;

describe('copyCode', () => {
	it('copies the code of the block whose button was clicked, even via its icon', () => {
		click(document.querySelector('rect')!);

		expect(writeText).toHaveBeenCalledWith('float d = 0.5;\ncolor *= d;');
	});

	it('confirms the copy, then resets the button', async () => {
		click(button());
		await vi.waitFor(() => expect(button().getAttribute('aria-label')).toBe('Copied'));
		expect(button().hasAttribute('data-copied')).toBe(true);

		vi.advanceTimersByTime(1500);

		expect(button().getAttribute('aria-label')).toBe('Copy code');
		expect(button().hasAttribute('data-copied')).toBe(false);
	});

	it('does nothing for a copy button whose block has no code', () => {
		document.querySelector('pre')!.remove();

		expect(() => click(button())).not.toThrow();
		expect(writeText).not.toHaveBeenCalled();
	});

	it('ignores clicks anywhere else on the page', () => {
		click(document.querySelector('p')!);
		copyCode({ target: document } as unknown as MouseEvent);

		expect(writeText).not.toHaveBeenCalled();
	});
});
