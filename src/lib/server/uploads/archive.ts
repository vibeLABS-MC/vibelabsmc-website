/**
 * Looking inside uploaded .zip and .jar files without unpacking them to disk: the entry list
 * comes from the zip's central directory, entry contents are streamed one at a time. Limits stop
 * zip bombs (huge expansion), path tricks (`../`) and archives with absurd numbers of entries.
 */
import type { Readable } from 'node:stream';
import yauzl from 'yauzl';
import type { Loader, ProjectType } from '../../marketplace/taxonomy.ts';

export const LIMITS = {
	entries: 50_000,
	/** Total size once unpacked. */
	uncompressed: 4 * 1024 ** 3,
	/** How much bigger than its compressed size an entry may be. */
	ratio: 250,
	entry: 1024 ** 3
};

export interface ZipEntry {
	name: string;
	size: number;
	compressedSize: number;
	directory: boolean;
}

export class ArchiveError extends Error {}

function open(path: string): Promise<yauzl.ZipFile> {
	return new Promise((resolve, reject) =>
		yauzl.open(
			path,
			{ lazyEntries: true, autoClose: false, validateEntrySizes: true },
			(cause, zip) =>
				cause || !zip
					? reject(new ArchiveError('That file is not a valid zip archive.'))
					: resolve(zip)
		)
	);
}

function checkEntry(entry: yauzl.Entry): void {
	if (entry.uncompressedSize > LIMITS.entry)
		throw new ArchiveError(`"${entry.fileName}" is too large.`);
	const ratio = entry.uncompressedSize / Math.max(entry.compressedSize, 1);
	if (entry.uncompressedSize > 1024 * 1024 && ratio > LIMITS.ratio)
		throw new ArchiveError('The archive expands far more than real files do (a zip bomb?).');
}

/** Every entry, after checking the limits. yauzl itself refuses absolute and `../` paths. */
export async function listEntries(path: string): Promise<ZipEntry[]> {
	const zip = await open(path);
	try {
		if (zip.entryCount > LIMITS.entries) throw new ArchiveError('The archive has too many files.');
		const entries: ZipEntry[] = [];
		let total = 0;
		await new Promise<void>((resolve, reject) => {
			zip.on('entry', (entry: yauzl.Entry) => {
				try {
					checkEntry(entry);
					total += entry.uncompressedSize;
					if (total > LIMITS.uncompressed)
						throw new ArchiveError('The archive unpacks to more than 4 GB.');
					entries.push({
						name: entry.fileName,
						size: entry.uncompressedSize,
						compressedSize: entry.compressedSize,
						directory: entry.fileName.endsWith('/')
					});
					zip.readEntry();
				} catch (cause) {
					reject(cause);
				}
			});
			zip.on('end', () => resolve());
			zip.on('error', (cause: Error) =>
				reject(
					cause instanceof ArchiveError
						? cause
						: new ArchiveError(`The archive is damaged: ${cause.message}`)
				)
			);
			zip.readEntry();
		});
		return entries;
	} finally {
		zip.close();
	}
}

/** Streams the contents of the entries `pick` chooses, one after another. */
export async function* readEntries(
	path: string,
	pick: (entry: ZipEntry) => boolean
): AsyncGenerator<{ entry: ZipEntry; stream: Readable }> {
	const zip = await open(path);
	try {
		const queue: yauzl.Entry[] = [];
		await new Promise<void>((resolve, reject) => {
			zip.on('entry', (entry: yauzl.Entry) => {
				queue.push(entry);
				zip.readEntry();
			});
			zip.on('end', () => resolve());
			zip.on('error', reject);
			zip.readEntry();
		});
		for (const raw of queue) {
			const entry: ZipEntry = {
				name: raw.fileName,
				size: raw.uncompressedSize,
				compressedSize: raw.compressedSize,
				directory: raw.fileName.endsWith('/')
			};
			if (entry.directory || !pick(entry)) continue;
			const stream = await new Promise<Readable>((resolve, reject) =>
				zip.openReadStream(raw, (cause, s) => (cause || !s ? reject(cause) : resolve(s)))
			);
			yield { entry, stream };
		}
	} finally {
		zip.close();
	}
}

const MOD_MANIFESTS: Record<string, Loader[]> = {
	'fabric.mod.json': ['fabric', 'quilt'],
	'quilt.mod.json': ['quilt'],
	'META-INF/mods.toml': ['forge', 'neoforge'],
	'META-INF/neoforge.mods.toml': ['neoforge'],
	'mcmod.info': ['forge']
};

export interface Layout {
	problems: string[];
	/** For mods: loaders the manifests inside the jar make possible. */
	loaders: Loader[];
}

/** Is this archive really the kind of project it is uploaded as? */
export function checkLayout(type: ProjectType, names: string[]): Layout {
	const files = new Set(names.filter((n) => !n.endsWith('/')));
	const has = (name: string) => files.has(name);
	const any = (test: (n: string) => boolean) => names.some(test);
	switch (type) {
		case 'shader':
			return {
				problems: any((n) => /^(?:[^/]+\/)?shaders\//.test(n))
					? []
					: ['A shader pack needs a shaders/ folder at its top level.'],
				loaders: []
			};
		case 'resourcepack':
			return {
				problems: has('pack.mcmeta') ? [] : ['A texture pack needs pack.mcmeta at its top level.'],
				loaders: []
			};
		case 'datapack': {
			const problems = [];
			if (!has('pack.mcmeta')) problems.push('A data pack needs pack.mcmeta at its top level.');
			if (!any((n) => n.startsWith('data/'))) problems.push('A data pack needs a data/ folder.');
			return { problems, loaders: [] };
		}
		case 'mod': {
			const loaders = [
				...new Set(
					Object.entries(MOD_MANIFESTS)
						.filter(([file]) => has(file))
						.flatMap(([, l]) => l)
				)
			];
			return {
				problems: loaders.length
					? []
					: [
							'This jar has no fabric.mod.json, quilt.mod.json or META-INF/mods.toml, so no mod loader can load it.'
						],
				loaders
			};
		}
	}
}

/** Loaders a version claims that the jar's manifests can't back up. */
export function unsupportedLoaders(declared: Loader[], detected: Loader[]): Loader[] {
	return declared.filter((loader) => !detected.includes(loader));
}
