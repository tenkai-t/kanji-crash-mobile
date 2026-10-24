import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {build} from 'esbuild';

// Run from the package directory. This command only builds; it never deploys
// or applies SQL. Require a real binding ID instead of publishing placeholders.
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(databaseId || '') ||
    databaseId === '00000000-0000-0000-0000-000000000000') {
  throw Error('Set CLOUDFLARE_D1_DATABASE_ID to the test D1 database UUID (not an API token).');
}
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {stdio: 'inherit'});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

await build({entryPoints: ['server/cloudflare.mjs'], outfile: 'dist/server/cloudflare.js',
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true});
writeFileSync('dist/server/wrangler.cloudflare.json', JSON.stringify({
  name: 'kanji-crash',
  main: 'cloudflare.js',
  compatibility_date: '2026-10-01',
  workers_dev: true,
  preview_urls: false,
  assets: {directory: '../client', binding: 'ASSETS', run_worker_first: ['/api/*']},
  d1_databases: [{binding: 'DB', database_name: 'kanji-crash-mobile-test-db',
    database_id: databaseId, migrations_dir: '../../drizzle'}],
}, null, 2) + '\n');
console.log('Cloudflare TEST build ready; no deployment or remote database operation performed.');
