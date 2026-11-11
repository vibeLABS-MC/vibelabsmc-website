/**
 * A ClamAV client speaking clamd's INSTREAM protocol over its Unix socket (production) or TCP
 * (tests). Bytes are sent in chunks: `zINSTREAM\0`, then `<4-byte length><data>`..., then a
 * zero length; clamd answers `stream: OK` or `stream: <signature> FOUND`.
 */
import { connect, type Socket } from 'node:net';

export type ScanVerdict =
	| { status: 'clean' }
	| { status: 'infected'; signature: string }
	| { status: 'error'; detail: string };

/** clamd refuses streams over its StreamMaxLength (25 MB on the server); bigger parts go to review. */
export const STREAM_LIMIT = 25 * 1024 * 1024;
const CHUNK = 64 * 1024;

function open(target: string): Socket {
	const tcp = /^tcp:\/\/([^:]+):(\d+)$/.exec(target);
	return tcp ? connect(Number(tcp[2]), tcp[1]) : connect(target);
}

export function parseReply(reply: string): ScanVerdict {
	const text = reply.replace(/\0/g, '').trim();
	if (/^stream: OK$/.test(text)) return { status: 'clean' };
	const found = /^stream: (.+) FOUND$/.exec(text);
	if (found) return { status: 'infected', signature: found[1]! };
	return { status: 'error', detail: text || 'No reply from the virus scanner.' };
}

/** Scans one stream of bytes. Never throws: problems come back as an `error` verdict. */
export function scanStream(
	target: string,
	source: AsyncIterable<Buffer | Uint8Array>,
	timeoutMs = 60_000
): Promise<ScanVerdict> {
	return new Promise((resolve) => {
		const socket = open(target);
		let reply = '';
		let settled = false;
		const finish = (verdict: ScanVerdict) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(verdict);
		};
		socket.setTimeout(timeoutMs, () =>
			finish({ status: 'error', detail: 'The virus scanner timed out.' })
		);
		socket.on('error', (cause) =>
			finish({ status: 'error', detail: `Virus scanner unavailable: ${cause.message}` })
		);
		socket.on('data', (data) => {
			reply += data.toString('utf8');
			if (reply.includes('\0')) finish(parseReply(reply));
		});
		socket.on('end', () => finish(parseReply(reply)));

		socket.once('connect', () =>
			sendStream(socket, source).catch((cause: Error) =>
				finish({ status: 'error', detail: `Sending to the virus scanner failed: ${cause.message}` })
			)
		);
	});
}

/** `zINSTREAM\0`, then each piece as `<4-byte length><bytes>` chunks, then a zero length. */
async function sendStream(
	socket: Socket,
	source: AsyncIterable<Buffer | Uint8Array>
): Promise<void> {
	const write = (bytes: Uint8Array) =>
		new Promise<void>((done, fail) =>
			socket.write(bytes, (cause) => (cause ? fail(cause) : done()))
		);
	await write(Buffer.from('zINSTREAM\0'));
	for await (const piece of source) {
		const buffer = Buffer.from(piece);
		for (let offset = 0; offset < buffer.length; offset += CHUNK) {
			const chunk = buffer.subarray(offset, offset + CHUNK);
			const header = Buffer.alloc(4);
			header.writeUInt32BE(chunk.length);
			await write(Buffer.concat([header, chunk]));
		}
	}
	await write(Buffer.alloc(4));
}
