/** Postgres error codes the app reacts to, found whichever driver or wrapper raised them. */

function codeOf(error: unknown): string | undefined {
	let current: unknown = error;
	for (let depth = 0; current && depth < 4; depth++) {
		const code = (current as { code?: unknown }).code;
		if (typeof code === 'string') return code;
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
}

/** A unique index refused the row (a taken username, email or slug). */
export const isUniqueViolation = (error: unknown): boolean => codeOf(error) === '23505';
