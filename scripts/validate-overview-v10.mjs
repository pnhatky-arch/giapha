import { readFile } from 'node:fs/promises';

const data = await readFile('components/overview-hero-data.generated.ts', 'utf8');
const tune = await readFile('components/overview-v5-tune.tsx', 'utf8');
const polish = await readFile('components/overview-v13-polish.tsx', 'utf8');
const overview = await readFile('components/overview-premium-redesign.tsx', 'utf8');
const page = await readFile('app/page.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readConst(name) {
  const match = data.match(new RegExp(`export const ${name}\\s*=\\s*(["'])(.*?)\\1;`, 's'));
  return match?.[2] ?? '';
}

function jpegDimensions(dataUrl) {
  const payload = dataUrl.split(',', 2)[1] ?? '';
  const buf = Buffer.from(payload, 'base64');
  assert(buf.length > 1024 && buf[0] === 0xff && buf[1] === 0xd8, 'Hero payload is not a valid JPEG');
  const sofMarkers = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  const scanLimit = Math.min(buf.length - 8, 65536);
  for (let i = 2; i < scanLimit; i += 1) {
    if (buf[i] !== 0xff || !sofMarkers.has(buf[i + 1])) continue;
    const h = buf.readUInt16BE(i + 5);
    const w = buf.readUInt16BE(i + 7);
    if (w > 0 && h > 0) return { width: w, height: h, bytes: buf.length };
  }
  throw new Error('JPEG dimensions could not be parsed');
}

function ratio(actual, expected, tolerance, label) {
  const drift = Math.abs(actual - expected);
  assert(drift <= tolerance, `${label} ratio drift too large: actual=${actual.toFixed(4)} expected=${expected.toFixed(4)} drift=${drift.toFixed(4)}`);
  return drift;
}

const day = readConst('DAY_HERO_DATA');
const night = readConst('NIGHT_HERO_DATA');

assert(day.startsWith('data:image/jpeg;base64,'), 'DAY hero must be an in-bundle JPEG data URL');
assert(night.startsWith('data:image/jpeg;base64,'), 'NIGHT hero must be an in-bundle JPEG data URL');
assert(day.length > 12000, `DAY hero payload too small: ${day.length}`);
assert(night.length > 9000, `NIGHT hero payload too small: ${night.length}`);
const dayDim = jpegDimensions(day);
const nightDim = jpegDimensions(night);
assert(dayDim.width >= 460 && dayDim.height >= 270, `DAY hero dimensions too small: ${dayDim.width}x${dayDim.height}`);
assert(nightDim.width >= 450 && nightDim.height >= 270, `NIGHT hero dimensions too small: ${nightDim.width}x${nightDim.height}`);

assert(!tune.includes("url('/overview/hero-"), 'V13 must not request standalone overview hero assets');
assert(tune.includes('.pg4-hero{height:107vw!important;min-height:390px!important;max-height:430px!important'), 'V13 hero geometry contract missing');
assert(tune.includes('.pg4-logo{width:96px!important;height:96px!important'), 'V13 crest geometry contract missing');
assert(tune.includes('.pg4-sample{min-height:80px!important'), 'V13 sample-banner geometry contract missing');
assert(tune.includes('.pg4-overview{padding:62px 9px 12px!important'), 'V13 overview geometry contract missing');
assert(tune.includes('.pg4-stat{min-height:145px!important'), 'V13 stat-card geometry contract missing');
assert(tune.includes('.pg4-tree{width:calc(100% - 8px)!important;height:74px!important'), 'V13 family-tree CTA geometry contract missing');
assert(tune.includes('.pg4-quote{min-height:140px!important'), 'V13 quote geometry contract missing');
assert(tune.includes('.pg4-nav{height:calc(72px + env(safe-area-inset-bottom))!important'), 'V13 nav geometry contract missing');
assert(tune.includes('appearance:none!important'), 'V13 native language-select chrome must be removed');
assert(tune.includes(".pg4-language:after{content:'⌄'!important"), 'V13 custom language chevron missing');

assert(page.includes("import OverviewV13Polish from '@/components/overview-v13-polish';"), 'V13 polish component import missing');
assert(page.includes('<OverviewV13Polish/>'), 'V13 polish component is not mounted last');
assert(polish.includes("html:not([data-hue-mode='dark']) .pg4-title h1{color:#761a12!important"), 'V13 day-title color contract missing');
assert(polish.includes('.pg4-bell{width:30px!important;height:41px!important;border:0!important'), 'V13 standalone bell contract missing');
assert(polish.includes('background:linear-gradient(145deg,#a51e14,#6a0c08)!important'), 'V13 sample database medallion contract missing');
assert(polish.includes(".pg4-lotus:after{content:'🪷'!important"), 'V13 lotus artwork contract missing');
assert(polish.includes('bottom:calc(1px + env(safe-area-inset-bottom))!important'), 'V13 active-nav indicator must be at bottom');
assert(polish.includes('border-radius:19px 19px 0 0!important'), 'V13 rounded nav frame missing');

const refWidth = 480;
const cssWidth = 390;
const scale = cssWidth / refWidth;
const target = {
  hero: 514 * scale,
  sample: 97 * scale,
  card: 180 * scale,
  cta: 90 * scale,
  quote: 175 * scale,
  nav: 90 * scale,
  preNav: 1170 * scale,
};
const actual = {
  hero: 417,
  sample: 80,
  card: 145,
  cta: 74,
  quote: 140,
  nav: 72,
  preNav: 417 + 80 + 8 + 62 + 145 + 12 + 74 + 12 + 8 + 140,
};
const drifts = {
  hero: ratio(actual.hero / cssWidth, target.hero / cssWidth, 0.015, 'hero'),
  sample: ratio(actual.sample / cssWidth, target.sample / cssWidth, 0.015, 'sample'),
  card: ratio(actual.card / cssWidth, target.card / cssWidth, 0.015, 'stat card'),
  cta: ratio(actual.cta / cssWidth, target.cta / cssWidth, 0.015, 'CTA'),
  quote: ratio(actual.quote / cssWidth, target.quote / cssWidth, 0.015, 'quote'),
  nav: ratio(actual.nav / cssWidth, target.nav / cssWidth, 0.015, 'nav'),
};
assert(Math.abs(actual.preNav - target.preNav) <= 16, `V13 pre-nav vertical drift too large: actual=${actual.preNav}px target=${target.preNav.toFixed(1)}px`);

assert(overview.includes('Dữ liệu thử nghiệm'), 'Sample-data banner missing');
assert(overview.includes('TỔNG QUAN DÒNG HỌ'), 'Overview title missing');
assert(overview.includes('Cây gia phả'), 'Family-tree CTA missing');
assert(overview.includes('Uống nước nhớ nguồn'), 'Ancestral quote missing');
for (const label of ['Tổng quan', 'Cây gia phả', 'Thành viên', 'Sự kiện', 'Tư liệu', 'Cài đặt']) {
  assert(overview.includes(label), `Bottom navigation label missing: ${label}`);
}

console.log(`Overview V13 contract OK · day=${dayDim.width}x${dayDim.height}/${dayDim.bytes}B · night=${nightDim.width}x${nightDim.height}/${nightDim.bytes}B · preNav=${actual.preNav}px/${target.preNav.toFixed(1)}px · maxSectionDrift=${Math.max(...Object.values(drifts)).toFixed(4)} · detail polish mounted · inline assets`);
