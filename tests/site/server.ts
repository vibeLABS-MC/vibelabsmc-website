/**
 * Vitest global setup for the `site` project: runs the real built server (`build/`) with a fresh in-memory Postgres (PGlite), plus fake GitHub, Discord and ClamAV
 * services, so tests exercise the whole app over HTTP exactly as a browser would.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';
import { startFakes } from './fakes.ts';

const ROOT = join(import.meta.dirname, '..', '..');

async function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			server.close(() => resolve(port));
		});
	});
}

async function waitFor(url: string, child: ChildProcess, log: () => string): Promise<void> {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) throw new Error(`The server exited early:\n${log()}`);
		try {
			const response = await fetch(url, { headers: { 'x-real-ip': '127.0.0.1' } });
			if (response.status < 500) return;
		} catch {
			// not listening yet
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`The server did not start:\n${log()}`);
}

export default async function setup(project: TestProject) {
	if (!existsSync(join(ROOT, 'build', 'index.js')))
		throw new Error('Run `bun run build` before `bun run test:site`.');

	const fakes = await startFakes();
	const port = await freePort();
	const origin = `http://127.0.0.1:${port}`;
	const dataDir = mkdtempSync(join(tmpdir(), 'vibelabs-site-'));
	let output = '';
	// Node, not Bun: PGlite's extensions (pg_trgm) only load under Node. Production runs the same
	// build under Bun against real Postgres, checked by the deploy's health check.
	const child = spawn(process.execPath, ['build/index.js'], {
		cwd: ROOT,
		env: {
			...process.env,
			NODE_ENV: 'test',
			PORT: String(port),
			HOST: '127.0.0.1',
			ORIGIN: origin,
			ADDRESS_HEADER: 'x-real-ip',
			BODY_SIZE_LIMIT: '110M',
			// Postgres in the server's own process (PGlite), fresh and migrated for this run.
			DATABASE_URL: 'pglite:memory',
			APP_SECRET: 'ab'.repeat(32),
			GITHUB_CLIENT_ID: 'gh-client',
			GITHUB_CLIENT_SECRET: 'gh-secret',
			DISCORD_CLIENT_ID: 'dc-client',
			DISCORD_CLIENT_SECRET: 'dc-secret',
			GITHUB_AUTH_URL: fakes.url,
			GITHUB_API_URL: fakes.url,
			DISCORD_AUTH_URL: fakes.url,
			DISCORD_API_URL: fakes.url,
			GITHUB_AVATAR_URL: fakes.url,
			DISCORD_CDN_URL: fakes.url,
			MOJANG_MANIFEST_URL: `${fakes.url}/mojang/version_manifest_v2.json`,
			HIBP_URL: fakes.url,
			ADMIN_GITHUB_IDS: '1001,1002',
			MAIL_OUTBOX: join(dataDir, 'outbox'),
			STORAGE_DIR: join(dataDir, 'storage'),
			CLAMD: `tcp://127.0.0.1:${fakes.clamdPort}`,
			ACCOUNT_ORIGINS: 'https://docs.example.org',
			NOINDEX: '1'
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});
	child.stdout!.on('data', (chunk) => (output += chunk));
	child.stderr!.on('data', (chunk) => (output += chunk));
	await waitFor(`${origin}/`, child, () => output);

	project.provide('origin', origin);
	project.provide('dataDir', dataDir);

	return async () => {
		child.kill();
		await fakes.close();
		if (process.env.SITE_TEST_LOG) console.log(output);
		rmSync(dataDir, { recursive: true, force: true });
	};
}

declare module 'vitest' {
	export interface ProvidedContext {
		origin: string;
		dataDir: string;
	}
}
