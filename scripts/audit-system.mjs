import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const failures = [];
const checks = [];

function read(path) {
  const full = resolve(root, path);
  if (!existsSync(full)) {
    failures.push(`${path}: missing`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

function ok(label, condition, detail = '') {
  checks.push({ label, condition });
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

const familyTree = read('lib/family-tree.ts');
ok('Sample fixture is 168 members', familyTree.includes('SAMPLE_MEMBER_COUNT = 168'));
ok('Sample fixture exposes six generations', familyTree.includes('SAMPLE_GENERATION_COUNTS = [1, 3, 9, 27, 64, 64]'));

const fixtureValidator = read('scripts/validate-sample-data.mjs');
ok('Fixture validator covers member count and parent/child edges', includesAll(fixtureValidator, ['SAMPLE_MEMBER_COUNT', 'Parent/child edges', 'Direct child relationship labels'])) ;

const familyRoute = read('app/api/family/route.ts');
ok('Family API has read/update/delete handlers', includesAll(familyRoute, ['export async function GET', 'export async function PUT', 'export async function DELETE']));
ok('Guest family data strips identity numbers', includesAll(familyRoute, ['withoutPrivateIdentity', 'delete person.identityNumber']));
ok('Family mode changes reset dependent sample/official data', includesAll(familyRoute, ['clearScopedGenealogyData', "clearScopedGenealogyData('sample')", "clearScopedGenealogyData('official')"]));
ok('Full family deletion clears dependent genealogy data', familyRoute.includes('clearAllGenealogyData'));

for (const [path, kind] of [['app/api/events/chapa/route.ts', 'Chạp mộ'], ['app/api/events/family/route.ts', 'Việc họ']]) {
  const source = read(path);
  ok(`${kind} API supports full CRUD`, includesAll(source, ['export async function GET', 'export async function POST', 'export async function PUT', 'export async function DELETE']));
  ok(`${kind} mutations require internal authentication`, source.split('getInternalUser').length >= 4);
  ok(`${kind} deletion removes attached event media`, includesAll(source, ['event_media:', "DELETE FROM app_settings WHERE key LIKE ?"]));
}

const eventMedia = read('app/api/events/media/route.ts');
ok('Event media validates that target events still exist', includesAll(eventMedia, ['eventIds(', 'validIds.has(eventId)']));
ok('Event media stores FK-safe updated_by user id', eventMedia.includes('JSON.stringify(stored), now, user.id'));
ok('Event media rejects SVG upload payloads', eventMedia.includes("file.type === 'image/svg+xml'"));

const materials = read('app/api/materials/route.ts');
ok('Materials support create/edit/delete', includesAll(materials, ['export async function POST', 'export async function PATCH', 'export async function DELETE']));
ok('Sample material fixture marker does not forge a user foreign key', materials.includes('SAMPLE_FIXTURE_VERSION, Date.now(), null'));
ok('Deleting materials also deletes D1 media chunks', materials.includes('deleteMaterialMedia(ids)'));

const materialMedia = read('app/api/materials/media/route.ts');
ok('Material media uses D1 chunk storage instead of R2', includesAll(materialMedia, ['putMaterialMedia', "storage: 'd1-chunked'"]) && !materialMedia.includes('getMaterialMediaBucket'));
ok('Material media is scoped to the active sample/official dataset', includesAll(materialMedia, ['materialExists(parsed.itemId, sampleMode)', 'visibleMaterialIds(sampleMode)']));
ok('Material media has a per-file safety limit', materialMedia.includes('MAX_MEDIA_BYTES'));

const mediaStore = read('lib/material-media.ts');
ok('Material media is chunked for D1', includesAll(mediaStore, ['MATERIAL_MEDIA_CHUNK_BYTES', 'chunkKey(', 'readMaterialMediaBytes'])) ;
ok('D1 media writes use a real user id for updated_by', mediaStore.includes('input.updatedById'));

const systemBackup = read('app/api/system-backup/route.ts');
ok('System backup includes family, events/settings, materials, media and audit history', includesAll(systemBackup, ['familyTree', 'settings', 'materials', 'auditLogs', "key.startsWith('event_media:')", "key.startsWith('material_media_d1:')"]));
ok('System restore preserves accounts and sessions', systemBackup.includes('Accounts, password hashes and sessions are intentionally preserved'));
ok('System restore is super-admin only', systemBackup.includes("user.role !== 'super_admin'"));

const backupClient = read('components/system-backup-enhancements.tsx');
const page = read('app/page.tsx');
ok('System backup UI is mounted', includesAll(page, ['SystemBackupEnhancements', '<SystemBackupEnhancements />']) && backupClient.includes('/api/system-backup'));
ok('Guest event controls are guarded', includesAll(page, ['EventsEditPermissionFix', 'EventsMediaEnhancements']));

const settingsRoute = read('app/api/admin/settings/route.ts');
ok('Default settings contain six generation labels', settingsRoute.includes("'Đời thứ 6'"));

const adminBootstrap = read('db/index.ts');
ok('Default admin no longer falls back to username as password', adminBootstrap.includes('DEFAULT_ADMIN_PASSWORD?.trim()') && !adminBootstrap.includes('DEFAULT_ADMIN_PASSWORD || DEFAULT_ADMIN_USERNAME'));
ok('Account and system changes are included in audit history', includesAll(adminBootstrap, ["'Tài khoản'", "'Hệ thống'"]));

const wranglerPatch = read('scripts/patch-wrangler-media.mjs');
ok('R2 remains disabled in generated Wrangler config', includesAll(wranglerPatch, ['delete config.r2_buckets', 'R2 disabled']));

const gitignore = read('.gitignore');
ok('Local secrets are ignored', includesAll(gitignore, ['.dev.vars', '.env']));
ok('Generated Wrangler/build state is ignored', includesAll(gitignore, ['.wrangler/', '.vinext/', '.next/', 'dist/']));
ok('Tracked .dev.vars secret file is absent', !existsSync(resolve(root, '.dev.vars')));

const packageJson = JSON.parse(read('package.json'));
ok('Build runs fixture validation', String(packageJson.scripts?.build ?? '').includes('test:fixtures'));
ok('Build runs whole-system audit', String(packageJson.scripts?.build ?? '').includes('test:system'));

if (failures.length) {
  console.error(`System audit FAILED (${failures.length}/${checks.length} checks failed)`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log(`System audit PASS — ${checks.length}/${checks.length} checks passed.`);
