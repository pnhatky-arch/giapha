import { mkdir, readFile, writeFile } from 'node:fs/promises';

const generatedConfigPath = new URL('../dist/server/wrangler.json', import.meta.url);
const deployRedirectDir = new URL('../.wrangler/deploy/', import.meta.url);
const deployRedirectPath = new URL('../.wrangler/deploy/config.json', import.meta.url);

const raw = await readFile(generatedConfigPath, 'utf8');
const config = JSON.parse(raw);

// Production traffic is served by https://giapha.p-nhatky.workers.dev.
// Force the generated Vinext config to target that Worker instead of a
// framework/project-derived name such as "sites-project".
config.name = 'giapha';

const buckets = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
const nextBuckets = buckets.filter((bucket) => bucket?.binding !== 'MEDIA');
nextBuckets.push({ binding: 'MEDIA', bucket_name: 'giapha-media' });
config.r2_buckets = nextBuckets;

await writeFile(generatedConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

// Cloudflare Workers Builds runs `npx wrangler deploy` after the build by
// default. Wrangler officially follows this redirect file to a generated
// deployment config, so automatic Git deployments use Vinext's current
// dist/server output rather than auto-configuring or targeting stale output.
await mkdir(deployRedirectDir, { recursive: true });
await writeFile(
  deployRedirectPath,
  `${JSON.stringify({ configPath: '../../dist/server/wrangler.json' }, null, 2)}\n`,
  'utf8',
);

console.log('Prepared Cloudflare auto deploy: Worker giapha, R2 MEDIA -> giapha-media, config -> dist/server/wrangler.json');
