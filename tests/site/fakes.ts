/**
 * Stand-ins for the outside services the server talks to: GitHub and Discord OAuth, the
 * Have I Been Pwned range API, Mojang's version list, avatar CDNs and ClamAV. They follow the
 * real protocols closely enough that the server cannot tell the difference.
 */
import { createHash, randomBytes } from 'node:crypto';
import { createServer as createHttp, type IncomingMessage, type ServerResponse } from 'node:http';
import { createServer as createTcp, type AddressInfo } from 'node:net';

/** A 1x1 PNG, for avatars. */
export const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);
export const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
/** A password the fake breach API reports as leaked. */
export const BREACHED_PASSWORD = 'correct horse battery';

interface Grant {
	challenge: string;
	redirectUri: string;
	identity: Record<string, unknown>;
	clientId: string;
}

const sha1 = (text: string) => createHash('sha1').update(text).digest('hex').toUpperCase();
const s256 = (text: string) => createHash('sha256').update(text).digest('base64url');

async function body(req: IncomingMessage): Promise<string> {
	let text = '';
	for await (const chunk of req) text += chunk;
	return text;
}

function json(res: ServerResponse, status: number, value: unknown) {
	res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(value));
}

const MOJANG = {
	latest: { release: '1.21.4', snapshot: '25w02a' },
	versions: [
		{ id: '25w02a', type: 'snapshot', releaseTime: '2025-01-08T00:00:00+00:00' },
		{ id: '1.21.4', type: 'release', releaseTime: '2024-12-03T00:00:00+00:00' },
		{ id: '1.21.1', type: 'release', releaseTime: '2024-08-08T00:00:00+00:00' },
		{ id: '1.21', type: 'release', releaseTime: '2024-06-13T00:00:00+00:00' },
		{ id: '1.20.1', type: 'release', releaseTime: '2023-06-12T00:00:00+00:00' },
		{ id: 'b1.7.3', type: 'old_beta', releaseTime: '2011-07-08T00:00:00+00:00' }
	]
};

export async function startFakes() {
	const grants = new Map<string, Grant>();
	const tokens = new Map<string, Record<string, unknown>>();

	async function authorize(url: URL, res: ServerResponse) {
		const code = randomBytes(12).toString('hex');
		grants.set(code, {
			challenge: url.searchParams.get('code_challenge') ?? '',
			redirectUri: url.searchParams.get('redirect_uri') ?? '',
			clientId: url.searchParams.get('client_id') ?? '',
			identity: JSON.parse(url.searchParams.get('login_as') ?? '{}')
		});
		const back = new URL(url.searchParams.get('redirect_uri')!);
		back.searchParams.set('code', code);
		back.searchParams.set('state', url.searchParams.get('state') ?? '');
		res.writeHead(302, { location: back.toString() }).end();
	}

	async function exchange(req: IncomingMessage, res: ServerResponse, secret: string) {
		const form = new URLSearchParams(await body(req));
		const basic = req.headers.authorization?.replace(/^Basic /, '');
		const [id, given] = basic
			? Buffer.from(basic, 'base64').toString().split(':')
			: [form.get('client_id'), form.get('client_secret')];
		const grant = grants.get(form.get('code') ?? '');
		grants.delete(form.get('code') ?? '');
		const valid =
			grant &&
			given === secret &&
			id === grant.clientId &&
			form.get('redirect_uri') === grant.redirectUri &&
			s256(form.get('code_verifier') ?? '') === grant.challenge;
		if (!valid) return json(res, 400, { error: 'invalid_grant' });
		const token = randomBytes(16).toString('hex');
		tokens.set(token, grant.identity);
		json(res, 200, { access_token: token, token_type: 'bearer', scope: '' });
	}

	function profile(req: IncomingMessage, res: ServerResponse) {
		const identity = tokens.get(req.headers.authorization?.replace(/^Bearer /, '') ?? '');
		if (!identity) return json(res, 401, { message: 'Bad credentials' });
		json(res, 200, identity);
	}

	const http = createHttp(async (req, res) => {
		const url = new URL(req.url!, 'http://fake');
		const path = url.pathname;
		if (path === '/login/oauth/authorize' || path === '/oauth2/authorize')
			return authorize(url, res);
		if (path === '/login/oauth/access_token') return exchange(req, res, 'gh-secret');
		if (path === '/oauth2/token') return exchange(req, res, 'dc-secret');
		if (path === '/user' || path === '/users/@me') return profile(req, res);
		if (path.startsWith('/range/')) {
			const leaked = sha1(BREACHED_PASSWORD);
			const prefix = path.slice('/range/'.length).toUpperCase();
			const lines = prefix === leaked.slice(0, 5) ? [`${leaked.slice(5)}:42`] : [];
			return res.end([...lines, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0'].join('\r\n'));
		}
		if (path === '/mojang/version_manifest_v2.json') return json(res, 200, MOJANG);
		if (path.startsWith('/u/') || path.startsWith('/avatars/'))
			return res.writeHead(200, { 'content-type': 'image/png' }).end(PNG);
		res.writeHead(404).end();
	});

	/** ClamAV's INSTREAM protocol: zINSTREAM\0, then <len><bytes>... chunks, then a zero length. */
	const clamd = createTcp((socket) => {
		let buffer = Buffer.alloc(0);
		let data = Buffer.alloc(0);
		let started = false;
		socket.on('data', (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]);
			if (!started) {
				const end = buffer.indexOf(0);
				if (end < 0) return;
				started = buffer.subarray(0, end).toString() === 'zINSTREAM';
				buffer = buffer.subarray(end + 1);
			}
			while (buffer.length >= 4) {
				const length = buffer.readUInt32BE(0);
				if (length === 0) {
					const found = data.includes(EICAR);
					socket.end(found ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
					return;
				}
				if (buffer.length < 4 + length) return;
				data = Buffer.concat([data, buffer.subarray(4, 4 + length)]);
				buffer = buffer.subarray(4 + length);
			}
		});
	});

	await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
	await new Promise<void>((r) => clamd.listen(0, '127.0.0.1', r));
	return {
		url: `http://127.0.0.1:${(http.address() as AddressInfo).port}`,
		clamdPort: (clamd.address() as AddressInfo).port,
		close: async () => {
			http.closeAllConnections();
			await new Promise((r) => http.close(r));
			await new Promise((r) => clamd.close(r));
		}
	};
}
