import { fail } from '@sveltejs/kit';
import { and, desc, eq, like, or } from 'drizzle-orm';
import QRCode from 'qrcode';
import { audit } from '#lib/server/audit.ts';
import { describeAgent } from '#lib/server/auth/agent.ts';
import { requireUser, sudoFailure } from '#lib/server/auth/guards.ts';
import { deleteSession, deleteUserSessions, hasSudo } from '#lib/server/auth/session.ts';
import { otpauthUri } from '#lib/server/auth/totp.ts';
import {
	beginEnrollment,
	confirmEnrollment,
	disableTwoFactor,
	pendingSecret,
	regenerateRecoveryCodes,
	remainingRecoveryCodes
} from '#lib/server/auth/two-factor.ts';
import { auditLog, sessions } from '#lib/server/db/schema.ts';
import { field, limitAction } from '#lib/server/http.ts';
import { securityNotice } from '#lib/server/mail/templates.ts';
import type { Actions, PageServerLoad } from './$types';

const HERE = '/settings/security';

const ACTIVITY: Record<string, string> = {
	'auth.sign_in': 'Signed in',
	'auth.sign_in.pending_2fa': 'Signed in (waiting for two-factor)',
	'auth.2fa.passed': 'Passed two-factor check',
	'auth.2fa.recovery_code_used': 'Used a recovery code',
	'auth.2fa.enabled': 'Turned on two-factor',
	'auth.2fa.disabled': 'Turned off two-factor',
	'auth.2fa.codes_regenerated': 'Made new recovery codes',
	'auth.password_changed': 'Changed password',
	'auth.password_set': 'Added a password',
	'auth.password_reset': 'Reset password by email',
	'auth.provider_linked': 'Connected a sign-in method',
	'auth.provider_unlinked': 'Disconnected a sign-in method',
	'auth.sessions_revoked': 'Signed out other devices',
	'auth.sign_up': 'Created the account',
	'auth.email_verified': 'Confirmed an email address',
	'account.email_change_requested': 'Asked to change email'
};

async function qrFor(secret: string, account: string): Promise<string> {
	// An SVG with only paths and fills: nothing the CSP would block.
	return QRCode.toString(otpauthUri(secret, account), {
		type: 'svg',
		margin: 0,
		errorCorrectionLevel: 'M'
	});
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, session } = requireUser(locals, url);
	const [devices, activity, remaining, pending] = await Promise.all([
		locals.db
			.select()
			.from(sessions)
			.where(and(eq(sessions.userId, user.id), eq(sessions.pendingTwoFactor, false)))
			.orderBy(desc(sessions.lastSeenAt)),
		locals.db
			.select({ action: auditLog.action, at: auditLog.createdAt, details: auditLog.details })
			.from(auditLog)
			.where(
				and(
					eq(auditLog.targetId, user.id),
					or(like(auditLog.action, 'auth.%'), like(auditLog.action, 'account.%'))
				)
			)
			.orderBy(desc(auditLog.createdAt))
			.limit(15),
		user.totpEnabled ? remainingRecoveryCodes(locals.db, user.id) : 0,
		user.totpEnabled ? null : pendingSecret(locals.db, locals.keys.totp, user.id)
	]);
	return {
		sudo: hasSudo(session),
		required: url.searchParams.get('required') === 'staff',
		twoFactor: { enabled: user.totpEnabled, remaining },
		setup: pending
			? { secret: pending, qr: await qrFor(pending, user.username ?? user.displayName) }
			: null,
		devices: devices.map((d) => ({
			id: d.id,
			current: d.id === session.id,
			device: describeAgent(d.userAgent),
			createdAt: d.createdAt,
			lastSeenAt: d.lastSeenAt
		})),
		activity: activity.map((a) => ({
			label: ACTIVITY[a.action] ?? a.action,
			at: a.at,
			method: (a.details as { method?: string }).method ?? null
		}))
	};
};

async function notice(locals: App.Locals, what: string) {
	if (locals.user?.email && locals.user.emailVerified)
		await locals.mailer.send(securityNotice(locals.user.email, what)).catch(() => {});
}

async function record(locals: App.Locals, action: string) {
	await audit(locals.db, {
		actorId: locals.user!.id,
		action,
		targetType: 'user',
		targetId: locals.user!.id,
		ipHash: locals.ipHash
	});
}

export const actions: Actions = {
	begin: async ({ locals, url }) => {
		const { user } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		if (user.totpEnabled) return fail(400, { message: 'Two-factor is already on.' });
		await beginEnrollment(locals.db, locals.keys.totp, user.id);
		return { started: true };
	},

	confirm: async ({ request, locals, url }) => {
		const { user, session } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		const limited = limitAction(locals, 'twoFactor', user.id);
		if (limited) return limited;
		const codes = await confirmEnrollment(
			locals.db,
			locals.keys.totp,
			user.id,
			field(await request.formData(), 'code')
		);
		if (!codes)
			return fail(400, {
				message: 'That code didn’t match. Scan the code again and enter the newest 6 digits.'
			});
		// This session just proved the new factor; every other session must pass it afresh.
		await locals.db
			.update(sessions)
			.set({ twoFactorVerified: true })
			.where(eq(sessions.id, session.id));
		await record(locals, 'auth.2fa.enabled');
		await notice(locals, 'two-factor sign-in was turned on');
		return { codes };
	},

	cancelSetup: async ({ locals, url }) => {
		const { user } = requireUser(locals, url);
		if (!user.totpEnabled) await disableTwoFactor(locals.db, user.id);
		return { cancelled: true };
	},

	disable: async ({ locals, url }) => {
		const { user } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		if (user.role !== 'user')
			return fail(400, { message: 'Moderators and admins must keep two-factor on.' });
		await disableTwoFactor(locals.db, user.id);
		await record(locals, 'auth.2fa.disabled');
		await notice(locals, 'two-factor sign-in was turned off');
		return { disabled: true };
	},

	regenerate: async ({ locals, url }) => {
		const { user } = requireUser(locals, url);
		const sudo = sudoFailure(locals, HERE);
		if (sudo) return sudo;
		if (!user.totpEnabled) return fail(400, { message: 'Turn on two-factor first.' });
		const codes = await regenerateRecoveryCodes(locals.db, user.id);
		await record(locals, 'auth.2fa.codes_regenerated');
		return { codes };
	},

	revoke: async ({ request, locals, url }) => {
		const { user, session } = requireUser(locals, url);
		const id = field(await request.formData(), 'id');
		const [owned] = await locals.db
			.select({ id: sessions.id })
			.from(sessions)
			.where(and(eq(sessions.id, id), eq(sessions.userId, user.id)));
		if (!owned || id === session.id)
			return fail(400, { message: 'Use “Sign out” to end this session.' });
		await deleteSession(locals.db, id);
		await record(locals, 'auth.sessions_revoked');
		return { revoked: 1 };
	},

	revokeOthers: async ({ locals, url }) => {
		const { user, session } = requireUser(locals, url);
		await deleteUserSessions(locals.db, user.id, session.id);
		await record(locals, 'auth.sessions_revoked');
		return { revoked: 'all' };
	}
};
