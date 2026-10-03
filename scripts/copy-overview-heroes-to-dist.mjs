import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const targets = [
  ['public/overview/hero-day.jpg', 'dist/client/overview/hero-day.jpg'],
  ['public/overview/hero-night.jpg', 'dist/client/overview/hero-night.jpg'],
];

for (const [sourcePath, outputPath] of targets) {
  const source = resolve(sourcePath);
  const output = resolve(outputPath);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(source, output);

  const info = await stat(output);
  if (!info.isFile() || info.size < 1024) {
    throw new Error(`Overview hero asset was not copied correctly: ${outputPath}`);
  }

  console.log(`copied ${sourcePath} -> ${outputPath} (${info.size} bytes)`);
}
