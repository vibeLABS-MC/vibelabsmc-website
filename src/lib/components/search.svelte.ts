/** Shared by every search button and the one search dialog. */
export const searchState = $state({ open: false, query: '' });

export function openSearch(query = ''): void {
	searchState.query = query;
	searchState.open = true;
}
