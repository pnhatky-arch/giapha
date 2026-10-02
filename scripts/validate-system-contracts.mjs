import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`System contract invalid: ${message}`);
};
const has = (path, text, message = `${path} is missing required contract: ${text}`) => {
  assert(read(path).includes(text), message);
};
const lacks = (path, text, message = `${path} contains forbidden contract: ${text}`) => {
  assert(!read(path).includes(text), message);
};

// Repository hygiene: local credentials and generated runtime output must never be source-controlled again.
assert(!existsSync(resolve(root, '.dev.vars')), '.dev.vars must not be committed');
const gitignore = read('.gitignore');
for (const rule of ['.dev.vars', '.env', '.next/', '.vinext/', '.wrangler/', 'dist/']) {
  assert(gitignore.includes(rule), `.gitignore must include ${rule}`);
}

// Administrator bootstrap must fail closed and audit logs must include account/system operations.
const dbIndex = read('db/index.ts');
assert(dbIndex.includes("'Tài khoản'") && dbIndex.includes("'Hệ thống'"), 'audit entity allowlist must include Tài khoản and Hệ thống');
assert(!dbIndex.includes('|| DEFAULT_ADMIN_USERNAME'), 'administrator bootstrap must never fall back to the username as a password');
assert(dbIndex.includes('DEFAULT_ADMIN_PASSWORD must be configured'), 'administrator bootstrap must require an explicit secure password');

// R2 is intentionally disabled. Shared material media must therefore use D1 chunk storage end-to-end.
has('scripts/patch-wrangler-media.mjs', 'delete config.r2_buckets', 'generated Worker config must keep R2 disabled');
lacks('lib/material-media.ts', 'R2Bucket', 'material media library must not depend on R2');
has('lib/material-media.ts', 'MATERIAL_MEDIA_CHUNK_BYTES', 'material media must use chunked D1 storage');
has('app/api/materials/media/route.ts', "storage: 'd1-chunked'", 'material media API must report D1 chunk storage');
lacks('app/api/materials/media/route.ts', 'getMaterialMediaBucket', 'material media API must not call R2');

// Custom events must clean their images when deleted and media uploads must reference a real parent event.
has('app/api/events/family/route.ts', 'event_media:', 'Việc họ deletion must clean event media');
has('app/api/events/chapa/route.ts', 'event_media:', 'Chạp mộ deletion must clean event media');
has('app/api/events/media/route.ts', 'validIds.has(eventId)', 'event media upload/read must validate the parent event');
has('app/api/events/media/route.ts', "file.type === 'image/svg+xml'", 'event media must reject active SVG uploads');

// Guest/event UI guards and media UI must be mounted in the real page tree.
const page = read('app/page.tsx');
for (const component of ['EventsMediaEnhancements', 'EventsEditPermissionFix', 'EventsCardLayoutFix', 'TombSweepingEvents', 'SystemBackupEnhancements', 'DynamicLanguageData']) {
  assert(page.includes(`<${component}`), `app/page.tsx must mount ${component}`);
}

// Newly created or edited descriptive data must follow the active language without
// storing translated copies in genealogy data. Workers AI is the translation fallback
// for values that are not part of the static i18n dictionary.
has('app/api/translate/route.ts', "@cf/meta/m2m100-1.2b", 'dynamic translation API must use the translation model');
has('app/api/translate/route.ts', "source_lang: SOURCE_LANGUAGE", 'dynamic translation must preserve Vietnamese as canonical source data');
has('scripts/patch-wrangler-media.mjs', "config.ai = { binding: 'AI' }", 'generated Worker config must retain the Workers AI binding');
has('wrangler.production.jsonc', '"binding": "AI"', 'production config must expose the Workers AI binding');
has('components/dynamic-language-data.tsx', "fetch('/api/translate'", 'dynamic language client must translate uncatalogued values');
has('components/dynamic-language-data.tsx', 'MutationObserver', 'dynamic language client must react to newly rendered or edited data');

// Deleting/switching genealogy modes must reset dependent events, materials and media.
has('app/api/family/route.ts', 'clearAllGenealogyData', 'family delete must clear dependent data');
has('app/api/family/route.ts', 'clearScopedGenealogyData', 'data-mode switch must clear scoped dependent data');
has('lib/genealogy-data-reset.ts', "DELETE FROM material_items", 'data reset must clear materials');
has('lib/genealogy-data-reset.ts', "event_media:", 'data reset must clear event media');

// Backup must cover genealogy-domain data while deliberately excluding credentials and sessions.
has('app/api/system-backup/route.ts', "scope: 'genealogy-system'", 'system backup must have a versioned genealogy-system scope');
has('app/api/system-backup/route.ts', 'FROM material_items', 'system backup must include shared materials');
has('app/api/system-backup/route.ts', 'FROM audit_logs', 'system backup must include audit history');
has('app/api/system-backup/route.ts', "key.startsWith('event_media:')", 'system backup must include event images');
has('app/api/system-backup/route.ts', "key.startsWith('material_media_d1:')", 'system backup must include material images/video');
lacks('app/api/system-backup/route.ts', 'password_hash', 'system backup must not export password hashes');
lacks('app/api/system-backup/route.ts', 'FROM sessions', 'system backup must not export active sessions');

// Sample fixture expectations remain the load/stress baseline used by the UI.
has('scripts/validate-sample-data.mjs', 'SAMPLE_MEMBER_COUNT', 'sample fixture validator must verify member count');
has('scripts/validate-sample-data.mjs', "=== 6", 'sample fixture validator must enforce 6 generations');

console.log('System contracts OK · secrets · auth · audit · D1 media · events · permissions · dynamic i18n · reset · backup');
