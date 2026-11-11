/**
 * How an uploaded archive is virus-scanned. Archives up to clamd's 25 MB stream limit go in
 * whole (clamd unpacks them itself and scans each file by type). Bigger ones are scanned entry
 * by entry: anything that could run (class files, jars, scripts, executables) on its own, plain
 * media and text batched together. An entry over the limit can't be scanned, so the file goes to
 * a moderator instead of being published.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { readEntries, type ZipEntry } from './archive.ts';
import { scanStream, STREAM_LIMIT, type ScanVerdict } from './clamd.ts';

export type FileScan =
	{ status: 'clean'; detail: null } | { status: 'infected' | 'review' | 'error'; detail: string };

const LOW_RISK =
	/\.(png|jpe?g|gif|webp|ogg|wav|mp3|json|mcmeta|txt|md|lang|properties|glsl|fsh|vsh|gsh|csh|tsh|tes|tcs|inc|nbt|mcfunction|toml|cfg|ttf|otf|bbmodel|jem|jpm|obj|mtl)$/i;

export const isLowRisk = (name: string): boolean => LOW_RISK.test(name);

/** Groups low-risk entries into batches that each fit in one clamd stream. */
export function batchEntries(entries: ZipEntry[], limit = STREAM_LIMIT): ZipEntry[][] {
	const batches: ZipEntry[][] = [];
	let current: ZipEntry[] = [];
	let size = 0;
	for (const entry of entries) {
		if (size + entry.size > limit && current.length) {
			batches.push(current);
			current = [];
			size = 0;
		}
		current.push(entry);
		size += entry.size;
	}
	if (current.length) batches.push(current);
	return batches;
}

/** Combines verdicts: any infection wins, then any error, otherwise clean. */
export function combine(verdicts: ScanVerdict[]): FileScan {
	const infected = verdicts.find((v) => v.status === 'infected');
	if (infected?.status === 'infected') return { status: 'infected', detail: infected.signature };
	const failed = verdicts.find((v) => v.status === 'error');
	if (failed?.status === 'error') return { status: 'error', detail: failed.detail };
	return { status: 'clean', detail: null };
}

async function* entryBytes(path: string, names: Set<string>) {
	for await (const { stream } of readEntries(path, (e) => names.has(e.name))) yield* stream;
}

export async function scanArchive(
	clamd: string,
	path: string,
	entries: ZipEntry[]
): Promise<FileScan> {
	if ((await stat(path)).size <= STREAM_LIMIT)
		return combine([await scanStream(clamd, createReadStream(path))]);

	const files = entries.filter((e) => !e.directory);
	const tooBig = files.find((e) => e.size > STREAM_LIMIT);
	if (tooBig)
		return { status: 'review', detail: `"${tooBig.name}" is too large to scan automatically.` };

	const verdicts: ScanVerdict[] = [];
	for (const entry of files.filter((e) => !isLowRisk(e.name))) {
		verdicts.push(await scanStream(clamd, entryBytes(path, new Set([entry.name]))));
		if (verdicts.at(-1)!.status === 'infected') return combine(verdicts);
	}
	for (const batch of batchEntries(files.filter((e) => isLowRisk(e.name)))) {
		verdicts.push(await scanStream(clamd, entryBytes(path, new Set(batch.map((e) => e.name)))));
		if (verdicts.at(-1)!.status === 'infected') break;
	}
	return combine(verdicts);
}
