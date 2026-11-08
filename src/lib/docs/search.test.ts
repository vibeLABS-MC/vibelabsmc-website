import { describe, expect, it } from 'vitest';
import { search, type SearchEntry } from './search';

const entries: SearchEntry[] = [
	{
		slug: 'rendering-pipeline',
		title: 'Rendering pipeline',
		section: 'Developing',
		description: 'Which programs run when, and how data moves between passes.',
		headings: [
			{ id: 'overview', text: 'Overview' },
			{ id: 'writing-to-render-targets', text: 'Writing to render targets' }
		]
	},
	{
		slug: 'programs',
		title: 'Programs',
		section: 'Reference',
		description: 'Every program, including gbuffers_water, and when it runs.',
		headings: [{ id: 'composite', text: 'Composite' }]
	},
	{
		slug: 'install-iris',
		title: 'Installing Iris',
		section: 'Using shaders',
		description: 'Get Iris and a shaderpack running.',
		headings: []
	}
];

describe('search', () => {
	it('returns nothing for an empty query', () => {
		expect(search(entries, '   ')).toEqual([]);
	});

	it('ranks a title match above a description match', () => {
		const results = search(entries, 'programs');

		expect(results.map((r) => r.href)).toEqual(['/docs/programs', '/docs/rendering-pipeline']);
	});

	it('keeps reading order between equally good matches', () => {
		expect(search(entries, 'when').map((r) => r.title)).toEqual(['Rendering pipeline', 'Programs']);
	});

	it('needs every word of the query to match, in any case', () => {
		expect(search(entries, 'IRIS shaderpack').map((r) => r.title)).toEqual(['Installing Iris']);
		expect(search(entries, 'iris composite')).toEqual([]);
	});

	it('links straight to a matching heading and shows it', () => {
		const [result] = search(entries, 'render targets');

		expect(result).toEqual({
			href: '/docs/rendering-pipeline#writing-to-render-targets',
			title: 'Rendering pipeline',
			section: 'Developing',
			snippet: 'Writing to render targets'
		});
	});

	it('finds code words with underscores and stops at the limit', () => {
		expect(search(entries, 'gbuffers_water')[0].href).toBe('/docs/programs');
		expect(search(entries, 'e', 2)).toHaveLength(2);
	});
});
