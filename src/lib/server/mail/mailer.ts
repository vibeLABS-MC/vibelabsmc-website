/**
 * Sends email over SMTP (any provider: Resend, Postmark, Brevo, ...), or, in development and
 * tests, writes each email as a JSON file into the outbox folder so it can be read back.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import type { Config } from '../config.ts';
import { newId } from '../security/crypto.ts';
import type { Email } from './templates.ts';

export interface Mailer {
	/** False in production without SMTP: email sign-up is then switched off. */
	readonly available: boolean;
	send(email: Email): Promise<void>;
}

export function createMailer(
	config: Pick<Config, 'smtpUrl' | 'mailFrom' | 'mailOutbox' | 'production'>
): Mailer {
	if (config.smtpUrl) {
		const transport = nodemailer.createTransport(config.smtpUrl);
		return {
			available: true,
			async send(email) {
				await transport.sendMail({ from: config.mailFrom, ...email });
			}
		};
	}
	if (config.production)
		return {
			available: false,
			async send() {
				throw new Error('Email is not configured (SMTP_URL).');
			}
		};
	return {
		available: true,
		async send(email) {
			await mkdir(config.mailOutbox, { recursive: true });
			const name = `${Date.now()}-${newId(6)}.json`;
			await writeFile(
				join(config.mailOutbox, name),
				JSON.stringify({ from: config.mailFrom, ...email }, null, 2)
			);
		}
	};
}
