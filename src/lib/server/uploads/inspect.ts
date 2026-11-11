/** The checks every uploaded project file goes through before anyone can attach it to a version. */
import { rm } from 'node:fs/promises';
import type { ProjectType } from '../../marketplace/taxonomy.ts';
import { typeInfo } from '../../marketplace/taxonomy.ts';
import { ArchiveError, checkLayout, listEntries } from './archive.ts';
import { scanArchive, type FileScan } from './scan.ts';

export interface Inspection {
	ok: boolean;
	/** Why the file was refused (empty when ok). */
	problems: string[];
	scan: FileScan | { status: 'pending'; detail: string };
	detected: { loaders: string[]; entries: number };
}

export function extensionProblem(type: ProjectType, filename: string): string | null {
	const allowed = typeInfo(type).extensions;
	return allowed.some((ext) => filename.toLowerCase().endsWith(ext))
		? null
		: `${typeInfo(type).name} must be ${allowed.join(' or ')} files.`;
}

/**
 * Opens the archive, checks its layout for the project type, and virus-scans it. Refused
 * files (not a zip, wrong layout, malware) are deleted at once. Without a scanner configured
 * (development only; production refuses to start without one) files count as clean.
 */
export async function inspectUpload(
	path: string,
	type: ProjectType,
	clamd: string | null
): Promise<Inspection> {
	let entries;
	try {
		entries = await listEntries(path);
	} catch (cause) {
		await rm(path, { force: true });
		const message =
			cause instanceof ArchiveError ? cause.message : 'That file could not be read as an archive.';
		return {
			ok: false,
			problems: [message],
			scan: { status: 'error', detail: message },
			detected: { loaders: [], entries: 0 }
		};
	}
	const layout = checkLayout(
		type,
		entries.map((e) => e.name)
	);
	const detected = { loaders: layout.loaders, entries: entries.length };
	if (layout.problems.length) {
		await rm(path, { force: true });
		return {
			ok: false,
			problems: layout.problems,
			scan: { status: 'error', detail: 'Not scanned' },
			detected
		};
	}
	if (!clamd) return { ok: true, problems: [], scan: { status: 'clean', detail: null }, detected };

	const scan = await scanArchive(clamd, path, entries);
	if (scan.status === 'infected') {
		await rm(path, { force: true });
		return {
			ok: false,
			problems: [`The virus scanner found ${scan.detail} in this file.`],
			scan,
			detected
		};
	}
	// The scanner was unreachable: keep the file, a background job scans it again later.
	if (scan.status === 'error')
		return { ok: true, problems: [], scan: { status: 'pending', detail: scan.detail }, detected };
	return { ok: true, problems: [], scan, detected };
}
