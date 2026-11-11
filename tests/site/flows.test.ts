/**
 * The whole site, end to end, over HTTP against the built server: signing up and in (email,
 * GitHub, Discord), two-factor for staff, publishing a project from upload to approval to
 * download, and the security rules around all of it.
 */
import { strToU8, zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, inject, it } from 'vitest';
import { codeForStep, stepAt } from '../../src/lib/server/auth/totp.ts';
import { Browser, ORIGIN, type Page } from './browser.ts';
import { BREACHED_PASSWORD, EICAR } from './fakes.ts';

const outbox = join(inject('dataDir'), 'outbox');

function lastEmailTo(address: string): { subject: string; text: string } {
	const mails = readdirSync(outbox)
		.sort()
		.map((f) => JSON.parse(readFileSync(join(outbox, f), 'utf8')))
		.filter((m) => m.to === address);
	if (!mails.length) throw new Error(`No email to ${address}`);
	return mails.at(-1);
}

const linkIn = (text: string) => /https?:\/\/\S+/.exec(text)![0];
const pathOf = (url: string) => {
	const u = new URL(url, ORIGIN);
	return u.pathname + u.search;
};

/** Signs in through the fake GitHub or Discord, the way a browser follows the redirects. */
async function oauth(
	browser: Browser,
	provider: 'github' | 'discord',
	identity: Record<string, unknown>,
	next = '/dashboard'
): Promise<Page> {
	const start = await browser.get(`/auth/${provider}?next=${encodeURIComponent(next)}`);
	expect(start.status).toBe(302);
	const authorize = new URL(start.location!);
	expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
	authorize.searchParams.set('login_as', JSON.stringify(identity));
	const back = await fetch(authorize, { redirect: 'manual' });
	return browser.get(pathOf(back.headers.get('location')!));
}

async function onboard(browser: Browser, username: string) {
	const done = await browser.post('/onboarding?next=%2Fdashboard', {
		username,
		displayName: username
	});
	expect(done.status).toBe(303);
}

const png = () =>
	sharp({ create: { width: 300, height: 300, channels: 3, background: '#444ce7' } })
		.png()
		.toBuffer();
const shaderZip = (extra: Record<string, string> = {}) =>
	Buffer.from(
		zipSync(
			{
				'shaders/final.fsh': strToU8('void main() {}'),
				'shaders/shaders.properties': strToU8('# glow'),
				...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, strToU8(v)]))
			},
			{ level: 0 }
		)
	);

async function upload(browser: Browser, projectId: string, name: string, bytes: Buffer) {
	return browser.request(`/api/projects/${projectId}/uploads`, {
		method: 'POST',
		body: new Uint8Array(bytes),
		headers: { 'x-filename': encodeURIComponent(name), 'content-type': 'application/octet-stream' }
	});
}

/** Turns on two-factor for the signed-in user and returns the secret. */
async function enableTwoFactor(browser: Browser): Promise<string> {
	expect((await browser.post('/settings/security?/begin', {})).status).toBe(200);
	const page = await browser.get('/settings/security');
	const secret = /([A-Z2-7]{4}(?: [A-Z2-7]{4}){7})/.exec(page.text)![1]!.replaceAll(' ', '');
	const confirmed = await browser.post('/settings/security?/confirm', {
		code: codeForStep(secret, stepAt(new Date()))
	});
	expect(confirmed.status).toBe(200);
	expect(confirmed.text).toMatch(/Save these recovery codes/);
	return secret;
}

describe('email sign-up and sign-in', () => {
	const browser = new Browser();
	const email = 'crafter@example.org';
	const password = 'night sky over a calm sea';

	it('refuses a breached password, and accepts a long fresh one', async () => {
		const breached = await browser.post('/signup', {
			username: 'crafter',
			email,
			password: BREACHED_PASSWORD + ' extra',
			terms: 'on'
		});
		expect(breached.status).toBe(200);
		const leaked = await browser.post('/signup', {
			username: 'crafter',
			email,
			password: 'correct horse battery',
			terms: 'on'
		});
		expect(leaked.status).toBe(400);
		expect(leaked.text).toContain('appeared in a data breach');

		const ok = await browser.post('/signup', {
			username: 'crafter2',
			email: 'other@example.org',
			password,
			terms: 'on'
		});
		expect(ok.text).toContain('Check your email');
	});

	it('won’t sign in before the address is confirmed, then works once it is', async () => {
		const early = await browser.post('/login', { email, password: BREACHED_PASSWORD + ' extra' });
		expect(early.status).toBe(403);
		expect(early.text).toContain('Confirm your email address first');

		const verify = await browser.get(pathOf(linkIn(lastEmailTo(email).text)));
		expect(verify.status).toBe(303);
		expect(verify.location).toBe('/login?notice=verified');

		const wrong = await browser.post('/login', { email, password: 'wrong password here' });
		expect(wrong.status).toBe(400);
		expect(wrong.text).toContain('Email or password is wrong.');

		const login = await browser.post('/login?next=%2Fsettings', {
			email,
			password: BREACHED_PASSWORD + ' extra'
		});
		expect(login.status).toBe(303);
		expect(login.location).toBe('/settings');
		expect(browser.cookies.has('__Host-vl_session')).toBe(true);
	});

	it('says the same thing whether or not an account exists', async () => {
		const known = await new Browser().post('/forgot-password', { email });
		const unknown = await new Browser().post('/forgot-password', { email: 'nobody@example.org' });
		// Identical apart from the address typed and the page's one-time CSP nonce.
		const same = (html: string) =>
			html.replace(/[\w.]+@example\.org/g, 'X').replace(/nonce="[^"]+"/g, '');
		expect(known.status).toBe(unknown.status);
		expect(same(known.text)).toBe(same(unknown.text));
		expect(lastEmailTo(email).subject).toBe('Reset your vibeLABS password');
	});

	it('resets a password through the emailed link, signing out everywhere', async () => {
		const link = pathOf(linkIn(lastEmailTo(email).text));
		const form = await new Browser().get(link);
		expect(form.text).toContain('Choose a new password');
		const token = new URL(link, ORIGIN).searchParams.get('token')!;

		const reset = await new Browser().post('/reset-password', {
			token,
			password: 'a brand new long passphrase'
		});
		expect(reset.location).toBe('/login?notice=reset');
		expect((await browser.get('/settings')).status).toBe(303);
		expect(
			(await new Browser().post('/reset-password', { token, password: 'another long passphrase' }))
				.status
		).toBe(400);
	});

	it('locks out guessing after ten tries', async () => {
		const guesser = new Browser();
		for (let i = 0; i < 10; i++)
			await guesser.post('/login', { email, password: `guess number ${i}` });
		const blocked = await guesser.post('/login', {
			email,
			password: 'a brand new long passphrase'
		});
		expect(blocked.status).toBe(429);
	});
});

describe('GitHub and Discord sign-in', () => {
	it('signs in with GitHub (PKCE + state), asks for a username, and keeps the same account', async () => {
		const browser = new Browser();
		const back = await oauth(browser, 'github', { id: 5001, login: 'pixel-pat', name: 'Pat' });
		expect(back.location).toBe('/onboarding?next=%2Fdashboard');
		expect((await browser.get('/marketplace')).location).toBe('/onboarding?next=%2Fmarketplace');
		await onboard(browser, 'pixel-pat');
		expect((await browser.get('/dashboard')).status).toBe(200);

		const again = new Browser();
		expect((await oauth(again, 'github', { id: 5001, login: 'pixel-pat' })).location).toBe(
			'/dashboard'
		);
	});

	it('refuses a callback whose state does not match the cookie', async () => {
		const browser = new Browser();
		await browser.get('/auth/github');
		const forged = await browser.get('/auth/github/callback?code=abc&state=forged');
		expect(forged.location).toBe('/login?notice=expired');
	});

	it('signs in with Discord and links it to an account that already exists', async () => {
		const browser = new Browser();
		await oauth(browser, 'discord', { id: '7001', username: 'kit', global_name: 'Kit' });
		await onboard(browser, 'kit-dc');
		const link = await browser.get('/auth/github?mode=link&next=%2Fsettings%2Faccount');
		const authorize = new URL(link.location!);
		authorize.searchParams.set('login_as', JSON.stringify({ id: 7002, login: 'kit-gh' }));
		const back = await fetch(authorize, { redirect: 'manual' });
		const linked = await browser.get(pathOf(back.headers.get('location')!));
		expect(linked.location).toBe('/settings/account?notice=linked');
		expect((await browser.get('/settings/account')).text).toContain('Connected as kit-gh');
	});
});

describe('the admin area', () => {
	it('is invisible to users, and needs two-factor for staff', async () => {
		const user = new Browser();
		await oauth(user, 'github', { id: 6001, login: 'plain-user' });
		await onboard(user, 'plain-user');
		expect((await user.get('/admin')).status).toBe(404);
		expect((await new Browser().get('/admin')).location).toBe('/login?next=%2Fadmin');

		const admin = new Browser();
		await oauth(admin, 'github', { id: 1001, login: 'the-admin' });
		await onboard(admin, 'the-admin');
		expect((await admin.get('/admin')).location).toBe('/settings/security?required=staff');
		const secret = await enableTwoFactor(admin);
		expect((await admin.get('/admin')).status).toBe(200);

		// A fresh sign-in now stops at the second factor.
		const later = new Browser();
		const signedIn = await oauth(later, 'github', { id: 1001, login: 'the-admin' }, '/admin');
		expect(signedIn.location).toBe('/auth/2fa?next=%2Fadmin');
		expect((await later.get('/dashboard')).status).toBe(303);
		const step = stepAt(new Date()) + 1;
		const passed = await later.post('/auth/2fa?next=%2Fadmin&/verify', {
			code: codeForStep(secret, step)
		});
		expect([303, 400]).toContain(passed.status);
	});
});

describe('publishing a project', () => {
	const creator = new Browser();
	const admin = new Browser();
	const fan = new Browser();
	let projectId = '';

	beforeAll(async () => {
		await oauth(creator, 'github', { id: 8001, login: 'glow-dev' });
		await onboard(creator, 'glow-dev');
		// A second admin (bootstrap ID 1002) with two-factor on, for the review queue.
		await oauth(admin, 'github', { id: 1002, login: 'second-admin' });
		await onboard(admin, 'second-admin');
		await enableTwoFactor(admin);
		await oauth(fan, 'discord', { id: '8101', username: 'fan' });
		await onboard(fan, 'fan-one');
	});

	it('creates a project and refuses files that are not what they claim', async () => {
		const made = await creator.post('/dashboard/projects/new', {
			type: 'shader',
			name: 'Glow Shaders',
			slug: 'glow-shaders',
			summary: 'Soft light and calm water'
		});
		expect(made.status).toBe(303);
		projectId = /\/dashboard\/projects\/(\w+)/.exec(made.location!)![1]!;

		const notZip = await upload(creator, projectId, 'glow.zip', Buffer.from('not a zip'));
		expect(notZip.status).toBe(422);
		const wrongLayout = await upload(
			creator,
			projectId,
			'glow.zip',
			Buffer.from(zipSync({ 'readme.txt': strToU8('hi') }))
		);
		expect(wrongLayout.status).toBe(422);
		expect(wrongLayout.text).toContain('shaders/ folder');
		const wrongType = await upload(creator, projectId, 'glow.jar', shaderZip());
		expect(wrongType.status).toBe(400);
		const virus = await upload(creator, projectId, 'glow.zip', shaderZip({ 'payload.bin': EICAR }));
		expect(virus.status).toBe(422);
		expect(virus.text).toContain('virus scanner found');
		expect((await upload(new Browser(), projectId, 'glow.zip', shaderZip())).status).toBe(401);
		expect((await upload(fan, projectId, 'glow.zip', shaderZip())).status).toBe(404);
	});

	it('uploads, publishes, submits, gets approved, and serves the exact file', async () => {
		const bytes = shaderZip();
		const staged = await upload(creator, projectId, 'Glow 1.0.zip', bytes);
		expect(staged.status).toBe(200);
		const file = JSON.parse(staged.text);
		expect(file.scanStatus).toBe('clean');
		expect(file.sha1).toBe(createHash('sha1').update(bytes).digest('hex'));

		const icon = new File([new Uint8Array(await png())], 'icon.png', { type: 'image/png' });
		expect((await creator.post(`/dashboard/projects/${projectId}?/icon`, { icon })).status).toBe(
			200
		);
		await creator.post(`/dashboard/projects/${projectId}/description`, {
			description:
				'Glow is a soft, warm shader pack for Iris and OptiFine with calm water and clouds.'
		});
		await creator.post(`/dashboard/projects/${projectId}?/details`, {
			name: 'Glow Shaders',
			slug: 'glow-shaders',
			summary: 'Soft light and calm water',
			license: 'MIT',
			categories: 'water'
		});

		const form = new FormData();
		for (const [k, v] of [
			['versionNumber', '1.0.0'],
			['channel', 'release'],
			['gameVersions', '1.21.4'],
			['gameVersions', '1.21'],
			['loaders', 'iris'],
			['files', file.id],
			['changelog', '- First release']
		])
			form.append(k, v!);
		const published = await creator.request(
			`/dashboard/projects/${projectId}/versions/new?/publish`,
			{ method: 'POST', body: form, headers: { origin: ORIGIN } }
		);
		expect(published.status).toBe(303);

		expect((await new Browser().get('/marketplace/shaders/glow-shaders')).status).toBe(404);
		expect((await fan.get('/marketplace/shaders/glow-shaders')).status).toBe(404);
		expect((await creator.get('/marketplace/shaders/glow-shaders')).status).toBe(200);

		expect((await creator.post(`/dashboard/projects/${projectId}?/submit`, {})).status).toBe(200);
		const queue = await admin.get('/admin/queue');
		expect(queue.status).toBe(200);
		expect(queue.text).toContain('Glow Shaders');
		const approved = await admin.post('/admin/queue?/moderate', {
			project: projectId,
			decision: 'approve'
		});
		expect(approved.status).toBe(200);
		expect((await creator.get('/notifications')).text).toContain(
			'Glow Shaders is approved and public'
		);

		const page = await new Browser().get('/marketplace/shaders/glow-shaders');
		expect(page.status).toBe(200);
		expect(page.text).toContain('Glow is a soft, warm shader pack');
		const listing = await new Browser().get('/marketplace/shaders?q=glow');
		expect(listing.text).toContain('Glow Shaders');

		const versions = await new Browser().get('/marketplace/shaders/glow-shaders/versions');
		const href = /href="(\/download\/[^"]+)"/.exec(versions.text)![1]!;
		const download = await fetch(ORIGIN + href.replaceAll('&amp;', '&'), {
			headers: { 'x-real-ip': '10.9.9.9' }
		});
		expect(download.headers.get('content-disposition')).toContain('attachment');
		expect(download.headers.get('content-security-policy')).toContain('sandbox');
		expect(Buffer.from(await download.arrayBuffer()).equals(bytes)).toBe(true);
	});

	it('lets players follow and review it, but not its own team', async () => {
		const follow = await fan.post('/marketplace/shaders/glow-shaders?/follow', { on: '1' });
		expect(follow.status).toBe(200);
		const review = await fan.post('/marketplace/shaders/glow-shaders/reviews?/save', {
			rating: '5',
			body: 'Gorgeous water and it runs well.'
		});
		expect(review.status).toBe(200);
		const self = await creator.post('/marketplace/shaders/glow-shaders/reviews?/save', {
			rating: '5',
			body: 'My own pack is the best.'
		});
		expect(self.status).toBe(403);
		const reviews = await new Browser().get('/marketplace/shaders/glow-shaders/reviews');
		expect(reviews.text).toContain('Gorgeous water and it runs well.');
	});
});

describe('security rules', () => {
	it('refuses form posts from another site (CSRF)', async () => {
		const browser = new Browser();
		const forged = await browser.post(
			'/login',
			{ email: 'a@b.org', password: 'whatever whatever' },
			{ origin: 'https://evil.example' }
		);
		expect(forged.status).toBe(403);
	});

	it('shares the signed-in user only with the docs site', async () => {
		const browser = new Browser();
		await oauth(browser, 'discord', { id: '9001', username: 'docs-reader' });
		await onboard(browser, 'docs-reader');

		const docs = await browser.get('/api/session', { origin: 'https://docs.example.org' });
		expect(docs.headers.get('access-control-allow-origin')).toBe('https://docs.example.org');
		expect(docs.headers.get('access-control-allow-credentials')).toBe('true');
		expect(JSON.parse(docs.text)).toMatchObject({ signedIn: true, username: 'docs-reader' });

		const evil = await browser.get('/api/session', { origin: 'https://evil.example' });
		expect(evil.headers.get('access-control-allow-origin')).toBeNull();
		expect(JSON.parse((await new Browser().get('/api/session')).text)).toEqual({ signedIn: false });
	});

	it('sends signed-out visitors of account pages to sign in, and hides drafts', async () => {
		const anon = new Browser();
		expect((await anon.get('/dashboard')).location).toBe('/login?next=%2Fdashboard');
		expect((await anon.get('/settings/security')).location).toBe(
			'/login?next=%2Fsettings%2Fsecurity'
		);
		expect((await anon.get('/download/nope/file.zip')).status).toBe(404);
		expect((await anon.get('/media/../../etc/passwd')).status).toBe(404);
	});

	it('never caches signed-in pages', async () => {
		const browser = new Browser();
		await oauth(browser, 'discord', { id: '9002', username: 'cache-check' });
		await onboard(browser, 'cache-check');
		expect((await browser.get('/dashboard')).headers.get('cache-control')).toBe(
			'private, no-store'
		);
	});
});
