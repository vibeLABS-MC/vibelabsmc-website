import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Reads the built site in build/, the files GitHub Pages will serve. */
export const BUILD = join(import.meta.dirname, '..', '..', 'build');

if (!existsSync(BUILD)) throw new Error('Run `npm run build` before `npm run test:site`.');

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
	);
}

export const files = walk(BUILD).map((path) => relative(BUILD, path).replaceAll('\\', '/'));
export const read = (file: string) => readFileSync(join(BUILD, file), 'utf8');
export const htmlPages = files.filter((f) => f.endsWith('.html'));

export const sha256 = (text: string) => createHash('sha256').update(text).digest('base64');

export function cspOf(html: string): Map<string, string[]> {
	const content = /<meta http-equiv="content-security-policy" content="([^"]+)"/.exec(html)?.[1];
	if (!content) return new Map();
	return new Map(
		content.split(';').map((part) => {
			const [name, ...values] = part.trim().split(/\s+/);
			return [name, values];
		})
	);
}
