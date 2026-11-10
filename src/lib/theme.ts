export type Theme = 'light' | 'dark';

/** The saved choice if there is a valid one, otherwise the system setting. */
export function initialTheme(saved: string | null, prefersDark: boolean): Theme {
	if (saved === 'light' || saved === 'dark') return saved;
	return prefersDark ? 'dark' : 'light';
}

export const otherTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');
