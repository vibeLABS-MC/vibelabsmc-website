/** The compatibility matrix on a project page: which Minecraft versions work with which loaders. */
import { compareVersions } from './versions.ts';

export interface MatrixVersion {
	gameVersions: string[];
	loaders: string[];
}

export interface Matrix {
	rows: string[];
	columns: string[];
	/** `cells[row][column]`: some listed version supports both. */
	cells: boolean[][];
}

export function compatibilityMatrix(versions: MatrixVersion[], loaders: string[]): Matrix {
	const rows = [...new Set(versions.flatMap((v) => v.gameVersions))].sort(compareVersions);
	const columns = loaders.length ? loaders : ['any'];
	const cells = rows.map((row) =>
		columns.map((column) =>
			versions.some(
				(v) => v.gameVersions.includes(row) && (column === 'any' || v.loaders.includes(column))
			)
		)
	);
	return { rows, columns, cells };
}
