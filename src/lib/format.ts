/** Formatting shared by pages and cards. Pure, so it runs the same on the server and in the browser. */

/** "Steve Miner" -> "SM", "kit" -> "K". */
export function initials(name: string): string {
	const words = name
		.trim()
		.split(/[\s_-]+/)
		.filter(Boolean);
	const letters = words.length > 1 ? [words[0]![0], words[words.length - 1]![0]] : [words[0]?.[0]];
	return letters.join('').toUpperCase() || '?';
}

/** One of six avatar colours, always the same for the same name. */
export function toneOf(name: string): number {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return hash % 6;
}

/** 950 -> "950", 1234 -> "1.2k", 1_500_000 -> "1.5M". */
export function compact(value: number): string {
	if (value < 1000) return String(value);
	const [divisor, suffix] =
		value < 1_000_000 ? [1000, 'k'] : value < 1e9 ? [1_000_000, 'M'] : [1e9, 'B'];
	const scaled = value / divisor;
	return `${scaled < 10 ? Math.floor(scaled * 10) / 10 : Math.floor(scaled)}${suffix}`;
}

export const plural = (count: number, one: string, many = `${one}s`) =>
	`${count.toLocaleString('en-GB')} ${count === 1 ? one : many}`;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 86400],
	['month', 30 * 86400],
	['week', 7 * 86400],
	['day', 86400],
	['hour', 3600],
	['minute', 60]
];
const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

/** "3 days ago", "yesterday", "just now". */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
	const seconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
	for (const [unit, size] of UNITS)
		if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
	return 'just now';
}

const DATE = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});

/** "8 Nov 2026" */
export const shortDate = (date: Date | string) => DATE.format(new Date(date));

/** 2_400_000 -> "2.3 MB" */
export function fileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
