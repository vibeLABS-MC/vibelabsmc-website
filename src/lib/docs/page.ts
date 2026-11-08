import { parse as parseYaml } from 'yaml';
import { LOADERS, SECTIONS, type Loader, type SectionId } from './sections';

/** One documentation page, checked once when its file is read. */
export interface DocPage {
	slug: string;
	source: string;
	title: string;
	description: string;
	section: SectionId;
	order: number;
	/** Date of the last meaningful edit, `YYYY-MM-DD`. */
	updated: string;
	tag: string | undefined;
	loaders: Loader[];
	body: string;
}

export class ContentError extends Error {}

const FIELDS = ['title', 'description', 'section', 'order', 'updated', 'tag', 'loaders'];
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Fields = Record<string, unknown>;

/** Turns a Markdown file into a page, or throws a ContentError that names the file. */
export function parsePage(file: string, raw: string): DocPage {
	const fail = (reason: string): never => {
		throw new ContentError(`${file}: ${reason}`);
	};
	const slug = slugOf(file);
	if (!KEBAB.test(slug)) fail('file name must be lowercase words joined by hyphens');
	const match = FRONTMATTER.exec(raw) ?? fail('must start with a --- frontmatter block');
	const fields = readFields(match[1], fail);
	return {
		slug,
		source: file,
		title: text(fields, 'title', fail),
		description: description(fields, fail),
		section: section(fields, fail),
		order: order(fields, fail),
		updated: updated(fields, fail),
		tag: fields.tag === undefined ? undefined : text(fields, 'tag', fail),
		loaders: loaders(fields, fail),
		body: raw.slice(match[0].length).replace(/^\r?\n/, '')
	};
}

function slugOf(file: string): string {
	return file.replace(/^.*[/\\]/, '').replace(/\.md$/, '');
}

function readFields(yaml: string, fail: (reason: string) => never): Fields {
	const fields: unknown = parseYaml(yaml);
	if (typeof fields !== 'object' || fields === null) fail('frontmatter must be a list of fields');
	const unknown = Object.keys(fields as Fields).find((key) => !FIELDS.includes(key));
	if (unknown) fail(`unknown field "${unknown}"`);
	return fields as Fields;
}

function text(fields: Fields, name: string, fail: (reason: string) => never): string {
	const value = fields[name];
	if (typeof value !== 'string' || value.trim() === '') fail(`"${name}" is required`);
	return (value as string).trim();
}

function description(fields: Fields, fail: (reason: string) => never): string {
	const value = text(fields, 'description', fail);
	if (value.length > 200) fail('"description" must be at most 200 characters');
	return value;
}

function section(fields: Fields, fail: (reason: string) => never): SectionId {
	const ids: readonly string[] = SECTIONS.map((s) => s.id);
	if (!ids.includes(fields.section as string)) {
		fail(`"section" must be one of ${ids.join(', ')}`);
	}
	return fields.section as SectionId;
}

function order(fields: Fields, fail: (reason: string) => never): number {
	const value = fields.order;
	if (!Number.isInteger(value) || (value as number) < 1) {
		fail('"order" must be a whole number from 1');
	}
	return value as number;
}

function updated(fields: Fields, fail: (reason: string) => never): string {
	const value = fields.updated instanceof Date ? isoDate(fields.updated) : String(fields.updated);
	const date = new Date(`${value}T00:00:00Z`);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isoDate(date) !== value) {
		fail('"updated" must be a real date written YYYY-MM-DD');
	}
	return value;
}

function isoDate(date: Date): string {
	return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function loaders(fields: Fields, fail: (reason: string) => never): Loader[] {
	const value = fields.loaders ?? [];
	const allowed: readonly string[] = LOADERS;
	if (!Array.isArray(value) || !value.every((item) => allowed.includes(item))) {
		fail(`"loaders" may only contain ${LOADERS.join(', ')}`);
	}
	return value as Loader[];
}
