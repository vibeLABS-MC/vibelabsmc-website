import { createServer, type AddressInfo, type Server } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseReply, scanStream } from './clamd.ts';

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
let server: Server;
let target: string;
let received: Buffer[] = [];

/** A minimal clamd: collects the INSTREAM chunks and reports EICAR. */
beforeAll(async () => {
	server = createServer((socket) => {
		let buffer = Buffer.alloc(0);
		let data = Buffer.alloc(0);
		let started = false;
		socket.on('data', (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]);
			if (!started) {
				const end = buffer.indexOf(0);
				if (end < 0) return;
				expect(buffer.subarray(0, end).toString()).toBe('zINSTREAM');
				started = true;
				buffer = buffer.subarray(end + 1);
			}
			while (buffer.length >= 4) {
				const length = buffer.readUInt32BE(0);
				if (length === 0) {
					received.push(data);
					socket.end(
						data.includes(EICAR) ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0'
					);
					return;
				}
				if (buffer.length < 4 + length) return;
				data = Buffer.concat([data, buffer.subarray(4, 4 + length)]);
				buffer = buffer.subarray(4 + length);
			}
		});
	});
	await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
	target = `tcp://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function* pieces(...parts: (string | Buffer)[]) {
	for (const part of parts) yield Buffer.from(part);
}

describe('scanStream', () => {
	it('sends every byte in chunks and reports a clean file', async () => {
		received = [];
		const big = Buffer.alloc(200_000, 7);

		expect(await scanStream(target, pieces('hello ', big))).toEqual({ status: 'clean' });
		expect(received[0]).toEqual(Buffer.concat([Buffer.from('hello '), big]));
	});

	it('names the signature of an infected file', async () => {
		expect(await scanStream(target, pieces('prefix', EICAR))).toEqual({
			status: 'infected',
			signature: 'Eicar-Test-Signature'
		});
	});

	it('reports a scanner that is not there, without throwing', async () => {
		const verdict = await scanStream('tcp://127.0.0.1:1', pieces('x'));
		expect(verdict.status).toBe('error');
	});

	it('times out a scanner that never answers', async () => {
		const silent = createServer(() => {});
		await new Promise<void>((r) => silent.listen(0, '127.0.0.1', r));
		const port = (silent.address() as AddressInfo).port;

		expect(await scanStream(`tcp://127.0.0.1:${port}`, pieces('x'), 200)).toEqual({
			status: 'error',
			detail: 'The virus scanner timed out.'
		});
		silent.close();
	});
});

describe('parseReply', () => {
	it('reads clamd replies', () => {
		expect(parseReply('stream: OK\0')).toEqual({ status: 'clean' });
		expect(parseReply('stream: Win.Test.EICAR_HDB-1 FOUND\0')).toEqual({
			status: 'infected',
			signature: 'Win.Test.EICAR_HDB-1'
		});
		expect(parseReply('INSTREAM size limit exceeded. ERROR\0')).toEqual({
			status: 'error',
			detail: 'INSTREAM size limit exceeded. ERROR'
		});
		expect(parseReply('')).toEqual({ status: 'error', detail: 'No reply from the virus scanner.' });
	});
});
