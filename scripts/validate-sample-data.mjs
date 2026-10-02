import {
  initialFamily,
  flattenFamily,
  SAMPLE_GENERATION_COUNTS,
  SAMPLE_MEMBER_COUNT,
} from '../lib/family-tree.ts';
import {
  sampleFamilyWorkEvents,
  sampleMaterialItems,
  sampleTombSweepingEvents,
} from '../lib/sample-fixtures.ts';

function assert(condition, message) {
  if (!condition) throw new Error(`Sample fixture invalid: ${message}`);
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const people = flattenFamily(initialFamily);
assert(people.length === SAMPLE_MEMBER_COUNT, `expected ${SAMPLE_MEMBER_COUNT} members, got ${people.length}`);

const ids = new Set(people.map((person) => person.id));
assert(ids.size === people.length, 'member IDs must be unique');
assert(people.every((person) => person.name.trim().length > 0), 'every member must have a name');
assert(people.every((person) => validIsoDate(person.birthDate)), 'every member must have a valid birth date');

const generationCounts = SAMPLE_GENERATION_COUNTS.map((_, index) => people.filter((person) => person.generation === index + 1).length);
assert(
  generationCounts.every((count, index) => count === SAMPLE_GENERATION_COUNTS[index]),
  `generation distribution must be ${SAMPLE_GENERATION_COUNTS.join('/')}, got ${generationCounts.join('/')}`,
);
assert(Math.max(...people.map((person) => person.generation)) === 6, 'tree must contain exactly 6 generations');

let edges = 0;
let relationshipErrors = 0;
const walk = (parent) => {
  for (const child of parent.children ?? []) {
    edges += 1;
    assert(child.generation === parent.generation + 1, `${parent.name} -> ${child.name} skips a generation`);
    if (child.relationship !== `Con của ${parent.name}`) relationshipErrors += 1;
    walk(child);
  }
};
walk(initialFamily);
assert(edges === SAMPLE_MEMBER_COUNT - 1, `tree with ${SAMPLE_MEMBER_COUNT} members must contain ${SAMPLE_MEMBER_COUNT - 1} parent-child edges, got ${edges}`);
assert(relationshipErrors === 0, `${relationshipErrors} direct relationships do not match “Con của …”`);

const names = new Set(people.map((person) => person.name));
assert(names.size === people.length, 'sample member names must be unique so search/profile tests are unambiguous');

const memorials = people.filter((person) => person.memorialDate);
assert(memorials.length >= 10, `need at least 10 memorial events, got ${memorials.length}`);
assert(memorials.every((person) => validIsoDate(person.deathDate) && validIsoDate(person.memorialDate)), 'every memorial fixture needs valid death and memorial dates');

const birthdayMonths = new Set(people.map((person) => Number(person.birthDate.slice(5, 7))));
assert(birthdayMonths.size === 12, `birthdays must cover all 12 months, got ${birthdayMonths.size}`);

const anchor = new Date('2026-10-02T12:00:00+07:00');
const tombEvents = sampleTombSweepingEvents(anchor);
const familyWorkEvents = sampleFamilyWorkEvents(anchor);
assert(tombEvents.length >= 8, `need at least 8 Chạp mộ events, got ${tombEvents.length}`);
assert(familyWorkEvents.length >= 10, `need at least 10 Việc họ events, got ${familyWorkEvents.length}`);
assert(tombEvents.every((event) => validIsoDate(event.date) && event.location.trim()), 'every Chạp mộ event needs a valid date and location');
assert(familyWorkEvents.every((event) => validIsoDate(event.date) && event.title.trim()), 'every Việc họ event needs a valid date and title');
assert(tombEvents.some((event) => event.repeatYearly) && tombEvents.some((event) => !event.repeatYearly), 'Chạp mộ fixtures must test recurring and one-time events');
assert(familyWorkEvents.some((event) => event.repeatYearly) && familyWorkEvents.some((event) => !event.repeatYearly), 'Việc họ fixtures must test recurring and one-time events');

const eventIds = [...tombEvents, ...familyWorkEvents].map((event) => event.id);
assert(new Set(eventIds).size === eventIds.length, 'sample event IDs must be unique');

assert(sampleMaterialItems.length >= 12, `need at least 12 material items, got ${sampleMaterialItems.length}`);
const materialKinds = new Set(sampleMaterialItems.map((item) => item.kind));
assert(['folder', 'note', 'link'].every((kind) => materialKinds.has(kind)), 'materials must cover folder, note and link');
const materialsById = new Map(sampleMaterialItems.map((item) => [item.id, item]));
assert(materialsById.size === sampleMaterialItems.length, 'sample material IDs must be unique');
assert(sampleMaterialItems.every((item) => item.id.startsWith('sample-')), 'all sample material IDs must stay in the sample namespace');
assert(sampleMaterialItems.some((item) => item.parent_id && materialsById.get(item.parent_id)?.parent_id), 'materials need at least two nested folder levels');
for (const item of sampleMaterialItems) {
  if (!item.parent_id) continue;
  const parent = materialsById.get(item.parent_id);
  assert(parent, `${item.title} references a missing parent folder`);
  assert(parent.kind === 'folder', `${item.title} parent must be a folder`);
}
for (const item of sampleMaterialItems.filter((entry) => entry.kind === 'link')) {
  const url = new URL(item.content);
  assert(url.protocol === 'https:' || url.protocol === 'http:', `${item.title} contains an invalid link`);
}

console.log([
  'Sample fixture OK',
  `${people.length} members / ${SAMPLE_GENERATION_COUNTS.length} generations`,
  `${people.length} birthdays`,
  `${memorials.length} memorials`,
  `${tombEvents.length} Chạp mộ`,
  `${familyWorkEvents.length} Việc họ`,
  `${sampleMaterialItems.length} materials`,
].join(' · '));
