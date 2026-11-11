/**
 * Minecraft versions: comparing them, and summarising a project's list the way players read it
 * ("1.20.1–1.21.4" rather than eleven separate numbers).
 */

/** Numeric parts of a release number: "1.20.1" -> [1, 20, 1]. Snapshots return null. */
export function releaseParts(version: string): number[] | null {
	return /^\d+(\.\d+){1,2}$/.test(version) ? version.split('.').map(Number) : null;
}

export const isRelease = (version: string): boolean => releaseParts(version) !== null;

/** Sorts newest first: releases by number, anything else after them in its given order. */
export function compareVersions(a: string, b: string): number {
	const pa = releaseParts(a);
	const pb = releaseParts(b);
	if (!pa || !pb) return Number(!pa) - Number(!pb);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
		if (diff) return diff;
	}
	return 0;
}

/** "1.21.4" -> "1.21" (the group a version belongs to in filters). */
export const majorOf = (version: string): string => version.split('.').slice(0, 2).join('.');

/**
 * Summarises the versions a project supports as runs over the full list of releases:
 * ["1.20.1", "1.20.2", "1.20.4"] with 1.20.3 in between -> "1.20.1–1.20.2, 1.20.4" (oldest first).
 * `known` is every release, newest first (from the game_versions table).
 */
export function summariseVersions(selected: string[], known: string[]): string {
	const chosen = new Set(selected);
	const releases = known.filter(isRelease).reverse();
	const runs: string[][] = [];
	let run: string[] = [];
	for (const version of releases) {
		if (chosen.has(version)) run.push(version);
		else if (run.length) {
			runs.push(run);
			run = [];
		}
	}
	if (run.length) runs.push(run);
	const parts = runs.map((r) => (r.length === 1 ? r[0]! : `${r[0]}–${r[r.length - 1]}`));
	const others = selected.filter((v) => !isRelease(v) || !known.includes(v));
	if (others.length) parts.push(...others.sort(compareVersions));
	return parts.join(', ');
}

/** The newest version in a list, or null. */
export const newestVersion = (versions: string[]): string | null =>
	[...versions].filter(isRelease).sort(compareVersions)[0] ?? versions[0] ?? null;
