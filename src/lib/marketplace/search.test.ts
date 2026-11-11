import { describe, expect, it } from 'vitest';
import {
	bayesianRating,
	DEFAULT_QUERY,
	hasFilters,
	pageList,
	parseQuery,
	toggle,
	toParams,
	withChanges
} from './search.ts';

describe('parseQuery', () => {
	it('reads every filter from the URL', () => {
		const query = parseQuery(
			new URLSearchParams(
				'q=+water+&v=1.21.4&v=1.20.1&l=iris&c=shadows,water&oss=1&sort=downloads&page=3&view=list'
			)
		);

		expect(query).toEqual({
			q: 'water',
			versions: ['1.21.4', '1.20.1'],
			loaders: ['iris'],
			categories: ['shadows', 'water'],
			openSource: true,
			sort: 'downloads',
			page: 3,
			view: 'list'
		});
	});

	it('falls back to defaults for missing or broken values', () => {
		expect(parseQuery(new URLSearchParams(''))).toEqual(DEFAULT_QUERY);
		const odd = parseQuery(
			new URLSearchParams(
				`sort=evil&page=-4&view=table&c=${'x'.repeat(50)}&c=<b>&l=iris&l=iris&q=${'q'.repeat(150)}`
			)
		);
		expect(odd).toMatchObject({
			sort: 'relevance',
			page: 1,
			view: 'grid',
			categories: [],
			loaders: ['iris']
		});
		expect(odd.q).toHaveLength(100);
		expect(parseQuery(new URLSearchParams('page=abc')).page).toBe(1);
		expect(parseQuery(new URLSearchParams('page=99999')).page).toBe(500);
	});
});

describe('building URLs', () => {
	it('leaves defaults out', () => {
		expect(toParams(DEFAULT_QUERY).toString()).toBe('');
		expect(toParams({ ...DEFAULT_QUERY, q: 'bsl', loaders: ['iris'], page: 2 }).toString()).toBe(
			'q=bsl&l=iris&page=2'
		);
	});

	it('goes back to page 1 when a filter changes, but keeps a page change', () => {
		const query = { ...DEFAULT_QUERY, page: 4 };
		expect(withChanges(query, { sort: 'newest' })).toBe('?sort=newest');
		expect(withChanges(query, { page: 5 })).toBe('?page=5');
		expect(withChanges(DEFAULT_QUERY, {})).toBe('?');
		expect(
			withChanges(query, {
				view: 'list',
				openSource: true,
				versions: ['1.21'],
				categories: ['pbr']
			})
		).toBe('?v=1.21&c=pbr&oss=1&view=list');
	});

	it('toggles a value in a list', () => {
		expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
		expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
	});

	it('knows whether any filter is on', () => {
		expect(hasFilters(DEFAULT_QUERY)).toBe(false);
		expect(hasFilters({ ...DEFAULT_QUERY, sort: 'newest', page: 2 })).toBe(false);
		expect(hasFilters({ ...DEFAULT_QUERY, openSource: true })).toBe(true);
		expect(hasFilters({ ...DEFAULT_QUERY, versions: ['1.21'] })).toBe(true);
	});
});

describe('bayesianRating', () => {
	it('pulls averages with few reviews towards the middle', () => {
		expect(bayesianRating(5, 1)).toBeCloseTo(3.875);
		expect(bayesianRating(450, 100)).toBeCloseTo(4.47, 2);
		expect(bayesianRating(0, 0)).toBe(3.5);
		expect(bayesianRating(5, 1)).toBeLessThan(bayesianRating(450, 100));
	});
});

describe('pageList', () => {
	it('shows every page when there are few', () => {
		expect(pageList(1, 1)).toEqual([1]);
		expect(pageList(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('shows the ends and the neighbours of the current page', () => {
		expect(pageList(1, 20)).toEqual([1, 2, null, 20]);
		expect(pageList(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
		expect(pageList(20, 20)).toEqual([1, null, 19, 20]);
		expect(pageList(3, 20)).toEqual([1, 2, 3, 4, null, 20]);
	});
});
