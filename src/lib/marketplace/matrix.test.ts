import { describe, expect, it } from 'vitest';
import { compatibilityMatrix } from './matrix.ts';

describe('compatibilityMatrix', () => {
	it('marks each Minecraft version and loader pair some version supports, newest first', () => {
		const matrix = compatibilityMatrix(
			[
				{ gameVersions: ['1.21.4', '1.21'], loaders: ['iris'] },
				{ gameVersions: ['1.20.1'], loaders: ['iris', 'optifine'] }
			],
			['iris', 'optifine']
		);

		expect(matrix.rows).toEqual(['1.21.4', '1.21', '1.20.1']);
		expect(matrix.columns).toEqual(['iris', 'optifine']);
		expect(matrix.cells).toEqual([
			[true, false],
			[true, false],
			[true, true]
		]);
	});

	it('uses one column for types without loaders', () => {
		const matrix = compatibilityMatrix([{ gameVersions: ['1.21'], loaders: [] }], []);

		expect(matrix).toEqual({ rows: ['1.21'], columns: ['any'], cells: [[true]] });
		expect(compatibilityMatrix([], ['iris']).rows).toEqual([]);
	});
});
