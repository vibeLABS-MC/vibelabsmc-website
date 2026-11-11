import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createMailer } from './mailer.ts';
import {
	alreadyRegistered,
	passwordChanged,
	resetPassword,
	securityNotice,
	verifyEmail
} from './templates.ts';

const outbox = mkdtempSync(join(tmpdir(), 'outbox-'));
afterAll(() => rmSync(outbox, { recursive: true, force: true }));

describe('templates', () => {
	it('puts the link in both the text and the HTML, escaped in the HTML', () => {
		const email = verifyEmail('a@b.org', 'https://x/verify?token=a&b=<c>');

		expect(email.to).toBe('a@b.org');
		expect(email.subject).toBe('Confirm your email address');
		expect(email.text).toContain('Confirm email address: https://x/verify?token=a&b=<c>');
		expect(email.html).toContain('href="https://x/verify?token=a&amp;b=&lt;c&gt;"');
		expect(email.html).not.toContain('<c>');
	});

	it('covers resets, repeat sign-ups and security changes', () => {
		expect(resetPassword('a@b.org', 'https://x/r').text).toContain('expires in 30 minutes');
		expect(alreadyRegistered('a@b.org', 'https://x/login', 'https://x/forgot').text).toContain(
			'sign in at https://x/login, or reset your password at https://x/forgot'
		);
		expect(passwordChanged('a@b.org').text).toContain('every other device was signed out');
		expect(securityNotice('a@b.org', 'two-factor sign-in was turned off').text).toContain(
			'On your vibeLABS account: two-factor sign-in was turned off.'
		);
	});
});

describe('createMailer', () => {
	it('writes development mail to the outbox folder', async () => {
		const mailer = createMailer({
			smtpUrl: null,
			mailFrom: 'vibeLABS <x@y>',
			mailOutbox: outbox,
			production: false
		});

		expect(mailer.available).toBe(true);
		await mailer.send(verifyEmail('a@b.org', 'https://x/v'));
		const [file] = readdirSync(outbox);
		const saved = JSON.parse(readFileSync(join(outbox, file!), 'utf8'));
		expect(saved).toMatchObject({
			from: 'vibeLABS <x@y>',
			to: 'a@b.org',
			subject: 'Confirm your email address'
		});
	});

	it('is unavailable in production until SMTP is set, and never pretends to send', async () => {
		const mailer = createMailer({
			smtpUrl: null,
			mailFrom: 'x',
			mailOutbox: outbox,
			production: true
		});

		expect(mailer.available).toBe(false);
		await expect(mailer.send(verifyEmail('a@b.org', 'l'))).rejects.toThrow(
			'Email is not configured'
		);
	});

	it('uses SMTP when a URL is set', () => {
		const mailer = createMailer({
			smtpUrl: 'smtp://localhost:2525',
			mailFrom: 'x',
			mailOutbox: outbox,
			production: true
		});

		expect(mailer.available).toBe(true);
	});
});
