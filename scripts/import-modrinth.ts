/**
 * Imports a project from Modrinth into the marketplace (see src/lib/server/import/modrinth.ts):
 * its page, icon, gallery and newest versions, every file checked and virus-scanned like an
 * upload. Run it again later to add the versions it is missing.
 *
 *   bun run import:modrinth <slug> [--versions 10|all] [--owner <username>] [--keep-downloads]
 *
 * Locally it uses .env (and Node, for PGlite). On the server, `bun run build` bundles it into
 * build/tools, and it runs as the website's own user with the website's settings:
 *
 *   cd /opt/vibelabs-web/current && umask 0027 && nice -n 10 ionice -c3 \
 *     runuser -u vibelabs-web -- /opt/vibelabs-web/bun/bun \
 *     --env-file=/etc/vibelabs-web/web.env build/tools/import-modrinth.js <slug> ...
 */
import { parseArgs } from 'node:util';
import { parseConfig } from '../src/lib/server/config.ts';
import { openDatabase } from '../src/lib/server/db/index.ts';
import { importFromModrinth, MODRINTH_API } from '../src/lib/server/import/modrinth.ts';

const USAGE =
	'usage: import-modrinth <slug> [--versions 10|all] [--owner <username>] [--keep-downloads]';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		versions: { type: 'string', default: '10' },
		owner: { type: 'string' },
		'keep-downloads': { type: 'boolean', default: false }
	}
});
const slug = positionals[0];
const count = values.versions === 'all' ? 'all' : Number(values.versions);
if (!slug || (count !== 'all' && !(Number.isInteger(count) && count > 0))) {
	console.error(USAGE);
	process.exit(2);
}

const config = parseConfig(process.env);
const { db, close } = await openDatabase(config.databaseUrl, 2);
try {
	const report = await importFromModrinth(
		{
			db,
			storageDir: config.storageDir,
			clamd: config.clamd,
			http: fetch,
			api: MODRINTH_API,
			log: (line) => console.log(line)
		},
		slug,
		{ versions: count, owner: values.owner, keepDownloads: values['keep-downloads'] }
	);
	console.log(`\n${report.created ? 'Created' : 'Updated'} ${report.path} (owner ${report.owner})`);
	for (const v of report.versions)
		console.log(`  ${v.result.padEnd(8)} ${v.number}${v.detail ? `: ${v.detail}` : ''}`);
	console.log(`  pictures: ${report.images.imported} imported`);
	for (const failed of report.images.failed) console.log(`  picture skipped: ${failed}`);
	if (report.versions.some((v) => v.result === 'failed')) process.exitCode = 1;
} finally {
	await close();
}
