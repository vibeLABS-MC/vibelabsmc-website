/** "Chrome on Windows" from a User-Agent header, for the list of signed-in devices. */

const BROWSERS: [RegExp, string][] = [
	[/Edg(e|A|iOS)?\//, 'Edge'],
	[/OPR\/|Opera/, 'Opera'],
	[/Firefox\/|FxiOS/, 'Firefox'],
	[/CriOS|Chrome\//, 'Chrome'],
	[/Safari\//, 'Safari']
];

const SYSTEMS: [RegExp, string][] = [
	[/iPhone|iPad|iPod/, 'iOS'],
	[/Android/, 'Android'],
	[/Windows/, 'Windows'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/CrOS/, 'ChromeOS'],
	[/Linux/, 'Linux']
];

const first = (ua: string, table: [RegExp, string][]) =>
	table.find(([pattern]) => pattern.test(ua))?.[1];

export function describeAgent(ua: string): string {
	const browser = first(ua, BROWSERS);
	const system = first(ua, SYSTEMS);
	if (browser && system) return `${browser} on ${system}`;
	return browser ?? system ?? 'Unknown device';
}
