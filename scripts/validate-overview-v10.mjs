import { readFile } from 'node:fs/promises';

const data = await readFile('components/overview-hero-data.generated.ts', 'utf8');
const tune = await readFile('components/overview-v5-tune.tsx', 'utf8');
const overview = await readFile('components/overview-premium-redesign.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readConst(name) {
  const match = data.match(new RegExp(`export const ${name}\\s*=\\s*(["'])(.*?)\\1;`, 's'));
  return match?.[2] ?? '';
}

const day = readConst('DAY_HERO_DATA');
const night = readConst('NIGHT_HERO_DATA');

assert(day.startsWith('data:image/jpeg;base64,'), 'DAY hero must be an in-bundle JPEG data URL');
assert(night.startsWith('data:image/jpeg;base64,'), 'NIGHT hero must be an in-bundle JPEG data URL');
assert(day.length > 12000, `DAY hero payload too small: ${day.length}`);
assert(night.length > 9000, `NIGHT hero payload too small: ${night.length}`);
assert(!tune.includes("url('/overview/hero-"), 'V10 must not request standalone overview hero assets');
assert(tune.includes('.pg4-hero{height:292px!important'), 'V10 hero geometry contract missing');
assert(tune.includes('.pg4-stat{min-height:96px!important'), 'V10 stat-card geometry contract missing');
assert(tune.includes('.pg4-quote{min-height:88px!important'), 'V10 quote geometry contract missing');
assert(overview.includes('Dữ liệu thử nghiệm'), 'Sample-data banner missing');
assert(overview.includes('TỔNG QUAN DÒNG HỌ'), 'Overview title missing');
assert(overview.includes('Cây gia phả'), 'Family-tree CTA missing');
assert(overview.includes('Uống nước nhớ nguồn'), 'Ancestral quote missing');
for (const label of ['Tổng quan', 'Cây gia phả', 'Thành viên', 'Sự kiện', 'Tư liệu', 'Cài đặt']) {
  assert(overview.includes(label), `Bottom navigation label missing: ${label}`);
}

console.log(`Overview V10 contract OK · day=${day.length} · night=${night.length} · inline assets · compact mobile geometry`);
