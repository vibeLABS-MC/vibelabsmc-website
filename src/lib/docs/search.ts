import type { Heading } from './markdown';

/** What the build writes to /search.json for each page. */
export interface SearchEntry {
	slug: string;
	title: string;
	section: string;
	description: string;
	headings: Heading[];
}

export interface SearchResult {
	href: string;
	title: string;
	section: string;
	snippet: string;
}

const TITLE = 10;
const HEADING = 5;
const DESCRIPTION = 2;

/** Pages that contain every word of the query, best matches first. */
export function search(entries: SearchEntry[], query: string, limit = 8): SearchResult[] {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return [];
	return entries
		.map((entry, position) => ({ entry, position, score: score(entry, terms) }))
		.filter((match) => match.score > 0)
		.sort((a, b) => b.score - a.score || a.position - b.position)
		.slice(0, limit)
		.map(({ entry }) => toResult(entry, terms));
}

function score(entry: SearchEntry, terms: string[]): number {
	const weights = terms.map((term) => weight(entry, term));
	return weights.includes(0) ? 0 : weights.reduce((sum, w) => sum + w, 0);
}

function weight(entry: SearchEntry, term: string): number {
	if (contains(entry.title, term)) return TITLE;
	if (entry.headings.some((h) => contains(h.text, term))) return HEADING;
	return contains(entry.description, term) ? DESCRIPTION : 0;
}

function toResult(entry: SearchEntry, terms: string[]): SearchResult {
	const matchesAll = (text: string) => terms.every((term) => contains(text, term));
	const heading = matchesAll(entry.title)
		? undefined
		: entry.headings.find((h) => matchesAll(h.text));
	return {
		href: heading ? `/docs/${entry.slug}#${heading.id}` : `/docs/${entry.slug}`,
		title: entry.title,
		section: entry.section,
		snippet: heading ? heading.text : entry.description
	};
}

const contains = (text: string, term: string) => text.toLowerCase().includes(term);
