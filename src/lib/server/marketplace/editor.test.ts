import { describe, expect, it } from 'vitest';
import { linkProblem, lockedForReview } from './editor.ts';
import type { Project } from './projects.ts';

describe('linkProblem', () => {
	it('accepts web links and nothing else', () => {
		expect(linkProblem('')).toBeNull();
		expect(linkProblem('https://github.com/x/y')).toBeNull();
		expect(linkProblem('http://example.org')).toBeNull();
		expect(linkProblem('javascript:alert(1)')).toBe('Links must start with https://');
		expect(linkProblem('data:text/html,hi')).toBe('Links must start with https://');
		expect(linkProblem('not a link')).toBe('That isn’t a valid link.');
	});
});

describe('lockedForReview', () => {
	it('locks editing only while a moderator is reviewing', () => {
		expect(lockedForReview({ status: 'in_review' } as Project)).toBe(true);
		expect(lockedForReview({ status: 'draft' } as Project)).toBe(false);
		expect(lockedForReview({ status: 'approved' } as Project)).toBe(false);
	});
});
