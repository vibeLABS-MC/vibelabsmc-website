/** Project links (source, issues, wiki, Discord): only real web addresses are kept. */

/** Links must be real web addresses; anything else (javascript:, data:) is refused. */
export function linkProblem(value: string): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:'
			? null
			: 'Links must start with https://';
	} catch {
		return 'That isn’t a valid link.';
	}
}
