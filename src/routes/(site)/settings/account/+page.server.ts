import { fail, redirect } from '@sveltejs/kit';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { audit } from '#lib/server/audit.ts';
import { deleteAccount } from '#lib/server/auth/account.ts';
import { createEmailToken } from '#lib/server/auth/email-tokens.ts';
import { clearSessionCookie } from '#lib/server/auth/flow.ts';
import { requireUser, sudoFailure } from '#lib/server/auth/guards.ts';
import { isProvider, PROVIDER_NAMES } from '#lib/server/auth/oauth.ts';
import { enabledProviders } from '#lib/server/auth/pages.ts';
import { hashPassword, isBreached, passwordProblem } from '#lib/server/auth/password.ts';
import { deleteUserSessions, hasSudo } from '#lib/server/auth/session.ts';
import { findUserByEmail, signInMethods, unlinkProvider } from '#lib/server/auth/users.ts';
import { emailTokens, users } from '#lib/server/db/schema.ts';
import { emailProblem, field, limitAction, rawField } from '#lib/server/http.ts';
import { passwordChanged, securityNotice, verifyEmail } from '#lib/server/mail/templates.ts';
import type { Actions, PageServerLoad } from './$types';

const HERE = '/settings/account';

const NOTICES: Record<string, [string, 'ok' | 'error']> = {
	linked: ['Sign-in method connected.', 'ok'],
	'link-taken': ['That account is already connected to a different vibeLABS account.', 'error'],
	'link-has-provider': [
		'Disconnect the one you have first; an account can have one of each.',
		'error'
	],
	'email-verified': ['Your email address is confirmed.', 'ok']
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, session } = requireUser(locals, url);
	const [methods, pending] = await Promise.all([
		signInMethods(locals.db, user.id),
		locals.db
			.select({ email: emailTokens.email })
			.from(emailTokens)
			.where(
				and(
					eq(emailTokens.userId, user.id),
					eq(emailTokens.purpose, 'verify_email'),
					isNull(emailTokens.usedAt),
					gt(emailTokens.expiresAt, new Date())
				)
			)
	]);
	const notice = NOTICES[url.searchParams.get('notice') ?? ''] ?? null;
	return {
		email: user.email,
		emailVerified: user.emailVerified,
		pendingEmail: pending[0]?.email !== user.email ? (pending[0]?.email ?? null) : null,
		hasPassword: user.hasPassword,
		methods,
		available: enabledProviders(locals.config),
		emailEnabled: locals.mailer.available,
		sudo: hasSudo(session),
		username: user.username,
		notice: notice ? { text: notice[0], tone: notice[1] } : null
	};
};

export const actions: Actions = {
	email: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		const email = field(await request.formData(), 'email').toLowerCase();
		const problem = emailProblem(email);
		if (problem) return fail(400, { section: 'email', message: problem });
		const limited = limitAction(locals, 'emailSend', user.id);
		if (limited) return fail(429, { section: 'email', message: limited.data.message });
		const owner = await findUserByEmail(locals.db, email);
		if (owner && owner.id !== user.id)
			return fail(400, {
				section: 'email',
				message: 'That email address belongs to another account.'
			});
		const token = await createEmailToken(locals.db, {
			userId: user.id,
			purpose: 'verify_email',
			email
		});
		// The address only goes on the account once the link is opened (verify-email), so nobody
		// can claim an address they don't control.
		await locals.mailer.send(
			verifyEmail(email, `${locals.config.origin}/verify-email?token=${token}`)
		);
		await audit(locals.db, {
			actorId: user.id,
			action: 'account.email_change_requested',
			targetType: 'user',
			targetId: user.id,
			ipHash: locals.ipHash
		});
		return { section: 'email', sent: email };
	},

	password: async ({ request, locals, url }) => {
		const { user, session } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		if (!user.email || !user.emailVerified)
			return fail(400, {
				section: 'password',
				message: 'Add and confirm an email address first: it’s how you reset a forgotten password.'
			});
		const password = rawField(await request.formData(), 'password');
		const problem =
			passwordProblem(password, { email: user.email, username: user.username }) ??
			((await isBreached(fetch, locals.config.endpoints.hibp, password))
				? 'This password has appeared in a data breach. Choose another one.'
				: null);
		if (problem) return fail(400, { section: 'password', message: problem });
		await locals.db
			.update(users)
			.set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
			.where(eq(users.id, user.id));
		await deleteUserSessions(locals.db, user.id, session.id);
		await audit(locals.db, {
			actorId: user.id,
			action: user.hasPassword ? 'auth.password_changed' : 'auth.password_set',
			targetType: 'user',
			targetId: user.id,
			ipHash: locals.ipHash
		});
		await locals.mailer.send(passwordChanged(user.email)).catch(() => {});
		return { section: 'password', saved: true };
	},

	unlink: async ({ request, locals, url }) => {
		const { user } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		const provider = field(await request.formData(), 'provider');
		if (!isProvider(provider))
			return fail(400, { section: 'methods', message: 'Unknown sign-in method.' });
		const result = await unlinkProvider(locals.db, user.id, provider);
		if (result === 'last-method')
			return fail(400, {
				section: 'methods',
				message: 'That’s your only way to sign in. Add a password or another account first.'
			});
		if (result === 'unlinked') {
			await audit(locals.db, {
				actorId: user.id,
				action: 'auth.provider_unlinked',
				targetType: 'user',
				targetId: user.id,
				details: { provider },
				ipHash: locals.ipHash
			});
			if (user.email && user.emailVerified)
				await locals.mailer
					.send(securityNotice(user.email, `${PROVIDER_NAMES[provider]} sign-in was disconnected`))
					.catch(() => {});
		}
		return { section: 'methods', saved: true };
	},

	delete: async ({ request, locals, url, cookies }) => {
		const { user } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		if (field(await request.formData(), 'confirm') !== user.username)
			return fail(400, { section: 'delete', message: 'Type your username exactly to confirm.' });
		const result = await deleteAccount(locals.db, user.id);
		await audit(locals.db, {
			actorId: null,
			action: 'account.deleted',
			targetType: 'user',
			targetId: user.id,
			details: { username: user.username, projects: result.deletedProjects.length },
			ipHash: locals.ipHash
		});
		clearSessionCookie(cookies);
		redirect(303, '/login?notice=deleted');
	}
};
