const at = (iso: string) => new Date(`${iso}T00:00:00Z`);
const long = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});
const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** `2026-11-08` → `8 Nov 2026` */
export const longDate = (iso: string) => long.format(at(iso));

/** `2026-11-08` → `8 Nov` */
export const shortDate = (iso: string) => short.format(at(iso));
