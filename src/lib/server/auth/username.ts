/** Usernames: the public handle in profile URLs, chosen once and unique in any letter case. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

/** Names that would impersonate the site or clash with its pages. */
const RESERVED = new Set([
	'about',
	'account',
	'admin',
	'administrator',
	'api',
	'app',
	'auth',
	'collections',
	'contact',
	'dashboard',
	'discord',
	'docs',
	'github',
	'help',
	'legal',
	'login',
	'logout',
	'marketplace',
	'me',
	'mod',
	'moderator',
	'mods',
	'new',
	'notifications',
	'null',
	'official',
	'onboarding',
	'owner',
	'privacy',
	'root',
	'security',
	'settings',
	'signup',
	'staff',
	'support',
	'system',
	'team',
	'terms',
	'undefined',
	'user',
	'users',
	'vibelabs',
	'vibelabsmc',
	'www'
]);

export function usernameProblem(name: string): string | null {
	if (name.length < USERNAME_MIN || name.length > USERNAME_MAX)
		return `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
	if (!/^[A-Za-z0-9_-]+$/.test(name)) return 'Use only letters, numbers, - and _.';
	if (!/^[A-Za-z0-9]/.test(name) || !/[A-Za-z0-9]$/.test(name))
		return 'Start and end with a letter or number.';
	if (/[-_]{2}/.test(name)) return "Don't put two - or _ in a row.";
	if (RESERVED.has(name.toLowerCase())) return 'That name is reserved.';
	return null;
}

/** A valid starting suggestion from a GitHub or Discord name, e.g. "Steve M." -> "Steve-M". */
export function suggestUsername(raw: string): string {
	const cleaned = raw
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9_-]+/g, '-')
		.replace(/[-_]{2,}/g, '-')
		.replace(/^[-_]+|[-_]+$/g, '')
		.slice(0, USERNAME_MAX)
		.replace(/[-_]+$/, '');
	if (usernameProblem(cleaned) === null) return cleaned;
	const padded = `${cleaned || 'crafter'}-${Math.floor(1000 + Math.random() * 9000)}`.replace(
		/^[-_]+/,
		''
	);
	return padded.slice(-USERNAME_MAX).replace(/^[-_]+/, '');
}
