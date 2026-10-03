import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const targets = [
  ['public/overview/hero-day.svg', 'DAY_HERO_DATA'],
  ['public/overview/hero-night.svg', 'NIGHT_HERO_DATA'],
];

const exports = [];
for (const [sourcePath, exportName] of targets) {
  const svg = await readFile(resolve(sourcePath), 'utf8');
  const match = svg.match(/href="data:image\/jpeg;base64,([^"]+)"/);
  if (!match) throw new Error(`Embedded JPEG not found in ${sourcePath}`);
  exports.push(`export const ${exportName} = ${JSON.stringify(`data:image/jpeg;base64,${match[1]}`)};`);
}

const output = `${exports.join('\n')}\n`;
await writeFile(resolve('components/overview-hero-data.generated.ts'), output, 'utf8');
console.log(`generated components/overview-hero-data.generated.ts (${Buffer.byteLength(output)} bytes)`);
