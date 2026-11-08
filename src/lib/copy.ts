/** Copies the code of the block whose copy button was clicked. Wired once, in the root layout. */
export function copyCode(event: MouseEvent): void {
	const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-copy]');
	const code = button?.closest('figure')?.querySelector('pre')?.innerText;
	if (!button || code === undefined) return;
	navigator.clipboard.writeText(code).then(() => {
		button.dataset.copied = '';
		button.setAttribute('aria-label', 'Copied');
		setTimeout(() => {
			delete button.dataset.copied;
			button.setAttribute('aria-label', 'Copy code');
		}, 1500);
	});
}
