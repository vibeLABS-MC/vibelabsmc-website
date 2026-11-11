/**
 * The emails the site sends. Plain text first (it always renders and is never marked as
 * spam for being image-heavy), with a simple HTML version alongside.
 */

export interface Email {
	to: string;
	subject: string;
	text: string;
	html: string;
}

const escape = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

function html(paragraphs: string[], action?: { label: string; href: string }): string {
	const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${escape(p)}</p>`).join('');
	const button = action
		? `<p style="margin:24px 0"><a href="${escape(action.href)}" style="background:#444ce7;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${escape(action.label)}</a></p><p style="margin:0 0 16px;color:#535862;font-size:13px">Or paste this link into your browser:<br>${escape(action.href)}</p>`
		: '';
	return `<!doctype html><html><body style="margin:0;background:#fafafa"><div style="max-width:520px;margin:0 auto;padding:32px 24px;font:15px/1.6 -apple-system,'Segoe UI',sans-serif;color:#181d27"><p style="margin:0 0 24px;font-weight:700;font-size:18px">vibeLABS</p>${body}${button}<p style="margin:32px 0 0;color:#717680;font-size:13px">You get this email because of an action on your vibeLABS account. If it wasn't you, you can ignore it.</p></div></body></html>`;
}

function text(paragraphs: string[], action?: { label: string; href: string }): string {
	return [...paragraphs, ...(action ? [`${action.label}: ${action.href}`] : []), '— vibeLABS'].join(
		'\n\n'
	);
}

function email(
	to: string,
	subject: string,
	paragraphs: string[],
	action?: { label: string; href: string }
): Email {
	return { to, subject, text: text(paragraphs, action), html: html(paragraphs, action) };
}

/** Emails that carry a one-time link: what they say and what the button says. */
const LINK_EMAILS = {
	verify: {
		subject: 'Confirm your email address',
		paragraphs: [
			'Confirm this email address to finish setting up your vibeLABS account.',
			'The link works once and expires in 30 minutes.'
		],
		label: 'Confirm email address'
	},
	reset: {
		subject: 'Reset your vibeLABS password',
		paragraphs: [
			'Someone asked to reset the password for the vibeLABS account that uses this email address.',
			'The link works once and expires in 30 minutes. If you didn’t ask for it, ignore this email: your password stays the same.'
		],
		label: 'Choose a new password'
	}
};

const linkEmail = (kind: keyof typeof LINK_EMAILS) => (to: string, link: string) => {
	const { subject, paragraphs, label } = LINK_EMAILS[kind];
	return email(to, subject, paragraphs, { label, href: link });
};

export const verifyEmail = linkEmail('verify');
export const resetPassword = linkEmail('reset');

/** Sent when someone signs up with an address that already has an account. */
export const alreadyRegistered = (to: string, loginLink: string, resetLink: string) =>
	email(to, 'You already have a vibeLABS account', [
		'Someone tried to create a vibeLABS account with this email address, but it already has one.',
		`If it was you, sign in at ${loginLink}, or reset your password at ${resetLink}.`
	]);

export const passwordChanged = (to: string) =>
	email(to, 'Your vibeLABS password was changed', [
		'The password for your vibeLABS account was just changed, and every other device was signed out.',
		'If you didn’t do this, reset your password straight away and contact the vibeLABS team.'
	]);

export const securityNotice = (to: string, what: string) =>
	email(to, 'Security change on your vibeLABS account', [
		`On your vibeLABS account: ${what}.`,
		'If you didn’t do this, reset your password straight away and contact the vibeLABS team.'
	]);
