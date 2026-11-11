import { redirect } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { consumeEmailToken } from '#lib/server/auth/email-tokens.ts';
import { users } from '#lib/server/db/schema.ts';
import { limitRequest } from '#lib/server/http.ts';
import type { PageServerLoad } from './$types';

/**
 * The link from the confirmation email. It confirms the address (the one the token was made
 * for, so it also completes an email change) and then asks the person to sign in: opening a
 * link never signs anyone in by itself.
 */
export const load: PageServerLoad = async ({ url, locals }) => {
	limitRequest(locals, 'emailSend', `verify:${locals.ipHash}`);
	const token = url.searchParams.get('token') ?? '';
	const used = token ? await consumeEmailToken(locals.db, token, 'verify_email') : null;
	if (!used) return { ok: false as const };

	const [taken] = await locals.db
		.select({ id: users.id })
		.from(users)
		.where(
			and(sql`lower(${users.email}) = ${used.email.toLowerCase()}`, ne(users.id, used.userId))
		);
	if (taken)
		return { ok: false as const, reason: 'That email address now belongs to another account.' };

	await locals.db
		.update(users)
		.set({ email: used.email, emailVerifiedAt: new Date(), updatedAt: new Date() })
		.where(eq(users.id, used.userId));
	await audit(locals.db, {
		actorId: used.userId,
		action: 'auth.email_verified',
		targetType: 'user',
		targetId: used.userId,
		ipHash: locals.ipHash
	});
	if (locals.user?.id === used.userId) redirect(303, '/settings/account?notice=email-verified');
	redirect(303, '/login?notice=verified');
};
