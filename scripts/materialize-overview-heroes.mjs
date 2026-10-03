import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const targets = [
  ['public/overview/hero-day.svg', 'public/overview/hero-day.jpg'],
  ['public/overview/hero-night.svg', 'public/overview/hero-night.jpg'],
];

for (const [sourcePath, outputPath] of targets) {
  const source = resolve(sourcePath);
  const output = resolve(outputPath);
  const svg = await readFile(source, 'utf8');
  const match = svg.match(/href="data:image\/jpeg;base64,([^"]+)"/);
  if (!match) throw new Error(`Embedded JPEG not found in ${sourcePath}`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(match[1], 'base64'));
  console.log(`materialized ${outputPath}`);
}
