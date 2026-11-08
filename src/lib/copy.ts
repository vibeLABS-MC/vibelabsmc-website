/** Copies the code of the block whose copy button was clicked. Wired once, in the root layout. */
export function copyCode(event: MouseEvent): void {
	const button = event.target instanceof Element ? event.target.closest('[data-copy]') : null;
	const code = button?.closest('figure')?.querySelector('pre')?.textContent;
	if (button && code) void copy(button, code);
}

async function copy(button: Element, code: string): Promise<void> {
	await navigator.clipboard.writeText(code);
	label(button, 'Copied', true);
	setTimeout(() => label(button, 'Copy code', false), 1500);
}

function label(button: Element, text: string, copied: boolean): void {
	button.setAttribute('aria-label', text);
	button.toggleAttribute('data-copied', copied);
}
