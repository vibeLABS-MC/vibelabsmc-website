import { describe, expect, it } from 'vitest';
import { bestVersion, fits, parseSetup, serialiseSetup } from './setup.ts';

describe('the setup cookie', () => {
	it('round-trips, and ignores anything odd', () => {
		const setup = { version: '1.21.4', loader: 'iris' };
		expect(parseSetup(serialiseSetup(setup))).toEqual(setup);
		expect(parseSetup(undefined)).toEqual({ version: null, loader: null });
		expect(parseSetup(serialiseSetup({ version: '1.20.1', loader: null }))).toEqual({
			version: '1.20.1',
			loader: null
		});
		expect(parseSetup('<script>|x y')).toEqual({ version: null, loader: null });
	});
});

describe('fits', () => {
	const project = { gameVersions: ['1.21.4', '1.20.1'], loaders: ['iris'] };

	it('checks the version, and the loader when the type has loaders', () => {
		expect(fits({ version: '1.21.4', loader: 'iris' }, project, true)).toBe('yes');
		expect(fits({ version: '1.19.2', loader: 'iris' }, project, true)).toBe('no');
		expect(fits({ version: '1.21.4', loader: 'optifine' }, project, true)).toBe('no');
		expect(fits({ version: '1.21.4', loader: 'optifine' }, project, false)).toBe('yes');
		expect(fits({ version: null, loader: 'iris' }, project, true)).toBe('yes');
		expect(fits({ version: null, loader: null }, project, true)).toBe('unknown');
	});
});

describe('bestVersion', () => {
	const versions = [
		{ id: 'beta', channel: 'beta', gameVersions: ['1.21.4'], loaders: ['iris'] },
		{ id: 'new', channel: 'release', gameVersions: ['1.21.4'], loaders: ['optifine'] },
		{ id: 'old', channel: 'release', gameVersions: ['1.21.4', '1.20.1'], loaders: ['iris'] }
	];

	it('picks the newest release that fits, then anything that fits', () => {
		expect(bestVersion(versions, { version: '1.21.4', loader: 'iris' }, true)?.id).toBe('old');
		expect(bestVersion(versions, { version: '1.21.4', loader: 'optifine' }, true)?.id).toBe('new');
		expect(bestVersion(versions.slice(0, 1), { version: '1.21.4', loader: 'iris' }, true)?.id).toBe(
			'beta'
		);
		expect(bestVersion(versions, { version: '1.8.9', loader: null }, true)).toBeNull();
		expect(bestVersion(versions, { version: null, loader: null }, true)?.id).toBe('new');
	});
});
