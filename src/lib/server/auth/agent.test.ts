import { describe, expect, it } from 'vitest';
import { describeAgent } from './agent.ts';

describe('describeAgent', () => {
	it.each([
		[
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
			'Chrome on Windows'
		],
		[
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
			'Edge on Windows'
		],
		[
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
			'Safari on macOS'
		],
		['Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox on Linux'],
		[
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
			'Chrome on iOS'
		],
		[
			'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 OPR/85.0',
			'Opera on Android'
		],
		[
			'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
			'Chrome on ChromeOS'
		]
	])('%s', (ua, expected) => {
		expect(describeAgent(ua)).toBe(expected);
	});

	it('names what it can, and admits what it cannot', () => {
		expect(describeAgent('curl/8.0')).toBe('Unknown device');
		expect(describeAgent('Firefox/1.0')).toBe('Firefox');
		expect(describeAgent('Something (Windows)')).toBe('Windows');
		expect(describeAgent('')).toBe('Unknown device');
	});
});
