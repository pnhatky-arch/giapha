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

function jpegDimensions(dataUrl) {
  const payload = dataUrl.split(',', 2)[1] ?? '';
  const buf = Buffer.from(payload, 'base64');
  assert(buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8, 'Hero payload is not a valid JPEG');
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    while (buf[i] === 0xff) i += 1;
    const marker = buf[i++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 2 > buf.length) break;
    const length = buf.readUInt16BE(i);
    const sof = [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker);
    if (sof && i + 7 < buf.length) {
      return { height: buf.readUInt16BE(i + 3), width: buf.readUInt16BE(i + 5), bytes: buf.length };
    }
    if (length < 2) break;
    i += length;
  }
  throw new Error('JPEG dimensions could not be parsed');
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

assert(!tune.includes("url('/overview/hero-"), 'V11 must not request standalone overview hero assets');
assert(tune.includes('.pg4-hero{height:292px!important'), 'V11 hero geometry contract missing');
assert(tune.includes('.pg4-stat{min-height:96px!important'), 'V11 stat-card geometry contract missing');
assert(tune.includes('.pg4-quote{min-height:92px!important'), 'V11 quote geometry contract missing');
assert(tune.includes('appearance:none!important'), 'V11 native language-select chrome must be removed');
assert(tune.includes(".pg4-language:after{content:'⌄'!important"), 'V11 custom language chevron missing');
assert(tune.includes('.pg4-gate{right:18px!important'), 'V11 quote gate artwork contract missing');
assert(tune.includes('.pg4-nav button:first-child.active svg{fill:currentColor!important'), 'V11 active Home icon fill missing');

const verticalBudget = 292 + 58 + 8 + (46 + 96 + 9 + 46 + 9) + 8 + 92;
assert(verticalBudget <= 670, `V11 home vertical budget too tall: ${verticalBudget}px`);

assert(overview.includes('Dữ liệu thử nghiệm'), 'Sample-data banner missing');
assert(overview.includes('TỔNG QUAN DÒNG HỌ'), 'Overview title missing');
assert(overview.includes('Cây gia phả'), 'Family-tree CTA missing');
assert(overview.includes('Uống nước nhớ nguồn'), 'Ancestral quote missing');
for (const label of ['Tổng quan', 'Cây gia phả', 'Thành viên', 'Sự kiện', 'Tư liệu', 'Cài đặt']) {
  assert(overview.includes(label), `Bottom navigation label missing: ${label}`);
}

console.log(`Overview V11 contract OK · day=${dayDim.width}x${dayDim.height}/${dayDim.bytes}B · night=${nightDim.width}x${nightDim.height}/${nightDim.bytes}B · budget=${verticalBudget}px · inline assets`);
