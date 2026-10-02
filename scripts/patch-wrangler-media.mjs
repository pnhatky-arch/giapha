import { mkdir, readFile, writeFile } from 'node:fs/promises';

const generatedConfigPath = new URL('../dist/server/wrangler.json', import.meta.url);
const deployRedirectDir = new URL('../.wrangler/deploy/', import.meta.url);
const deployRedirectPath = new URL('../.wrangler/deploy/config.json', import.meta.url);

const raw = await readFile(generatedConfigPath, 'utf8');
const config = JSON.parse(raw);

// Production traffic is served by https://giapha.p-nhatky.workers.dev.
// Force the generated Vinext config to target that Worker.
config.name = 'giapha';

// R2 is intentionally disabled for this project. Remove any R2 bindings that
// may have been inherited or generated so Cloudflare can deploy without R2.
delete config.r2_buckets;

await writeFile(generatedConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

// Cloudflare Workers Builds runs `npx wrangler deploy` after the build.
// Point Wrangler to Vinext's generated deployment config.
await mkdir(deployRedirectDir, { recursive: true });
await writeFile(
  deployRedirectPath,
  `${JSON.stringify({ configPath: '../../dist/server/wrangler.json' }, null, 2)}\n`,
  'utf8',
);

console.log('Prepared Cloudflare auto deploy: Worker giapha, R2 disabled, config -> dist/server/wrangler.json');
