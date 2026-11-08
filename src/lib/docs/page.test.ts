import { describe, expect, it } from 'vitest';
import { parsePage } from './page';

const file = 'src/content/docs/shader-stages.md';

function source(frontmatter: string, body = 'Intro paragraph.\n\n## First topic\n') {
	return `---\n${frontmatter}\n---\n\n${body}`;
}

const valid = [
	'title: Shader stages',
	'description: What each stage does.',
	'section: developing',
	'order: 4',
	'updated: 2026-11-08',
	'loaders: [iris, optifine]'
].join('\n');

describe('parsePage', () => {
	it('reads a page from its file name and frontmatter', () => {
		const page = parsePage(file, source(valid));

		expect(page).toEqual({
			slug: 'shader-stages',
			source: file,
			title: 'Shader stages',
			description: 'What each stage does.',
			section: 'developing',
			order: 4,
			updated: '2026-11-08',
			tag: undefined,
			loaders: ['iris', 'optifine'],
			body: 'Intro paragraph.\n\n## First topic\n'
		});
	});

	it('keeps an optional tag and defaults loaders to none', () => {
		const frontmatter = valid.replace('loaders: [iris, optifine]', 'tag: "gbuffers_*"');

		const page = parsePage(file, source(frontmatter));

		expect(page.tag).toBe('gbuffers_*');
		expect(page.loaders).toEqual([]);
	});

	it.each([
		['a file without frontmatter', 'Just text', 'must start with a --- frontmatter block'],
		[
			'frontmatter that is not a list of fields',
			'---\njust words\n---\n',
			'frontmatter must be a list of fields'
		],
		['a missing title', source(valid.replace('title: Shader stages\n', '')), '"title" is required'],
		[
			'an unknown section',
			source(valid.replace('developing', 'misc')),
			'"section" must be one of using, developing, reference, standards'
		],
		[
			'a long description',
			source(valid.replace('What each stage does.', 'x'.repeat(201))),
			'"description" must be at most 200 characters'
		],
		[
			'a zero order',
			source(valid.replace('order: 4', 'order: 0')),
			'"order" must be a whole number from 1'
		],
		[
			'a fractional order',
			source(valid.replace('order: 4', 'order: 1.5')),
			'"order" must be a whole number from 1'
		],
		[
			'an impossible date',
			source(valid.replace('2026-11-08', '2026-13-01')),
			'"updated" must be a real date written YYYY-MM-DD'
		],
		[
			'an unknown loader',
			source(valid.replace('optifine', 'canvas')),
			'"loaders" may only contain iris, optifine'
		],
		['a misspelt field', source(`${valid}\ntitel: Oops`), 'unknown field "titel"'],
		[
			'a file name that is not kebab-case',
			source(valid),
			'file name must be lowercase words joined by hyphens'
		]
	])('rejects %s with a message naming the file', (_case, text, reason) => {
		const name = reason.startsWith('file name') ? 'src/content/docs/Shader_Stages.md' : file;

		expect(() => parsePage(name, text)).toThrow(`${name}: ${reason}`);
	});
});
