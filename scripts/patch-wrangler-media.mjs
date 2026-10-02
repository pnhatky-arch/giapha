import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../dist/server/wrangler.json', import.meta.url);
const raw = await readFile(path, 'utf8');
const config = JSON.parse(raw);
const buckets = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
const nextBuckets = buckets.filter((bucket) => bucket?.binding !== 'MEDIA');
nextBuckets.push({ binding: 'MEDIA', bucket_name: 'giapha-media' });
config.r2_buckets = nextBuckets;
await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Patched dist/server/wrangler.json with R2 binding MEDIA -> giapha-media');
