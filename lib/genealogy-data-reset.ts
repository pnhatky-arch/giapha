import { getDatabase } from '@/db';
import { MATERIAL_MEDIA_PREFIX } from '@/lib/material-media';

export type GenealogyDataScope = 'sample' | 'official';

const SAMPLE_EVENT_KEYS = ['sample_tomb_sweeping_events_v1', 'sample_family_work_events_v1'];
const OFFICIAL_EVENT_KEYS = ['tomb_sweeping_events', 'family_work_events'];
const SAMPLE_FIXTURE_KEYS = ['sample_material_fixture_version'];

function eventMediaPattern(scope: GenealogyDataScope) {
  return `event_media:${scope}:%`;
}

function materialScopeClause(scope: GenealogyDataScope) {
  return scope === 'sample' ? "id LIKE 'sample-%'" : "id NOT LIKE 'sample-%'";
}

function materialMediaPattern(scope: GenealogyDataScope) {
  // Sample material IDs always start with sample-. Official material IDs are generated UUIDs.
  return scope === 'sample' ? `${MATERIAL_MEDIA_PREFIX}sample-*` : `${MATERIAL_MEDIA_PREFIX}[!s]*`;
}

export async function clearScopedGenealogyData(scope: GenealogyDataScope) {
  const db = getDatabase();
  const eventKeys = scope === 'sample' ? SAMPLE_EVENT_KEYS : OFFICIAL_EVENT_KEYS;
  const statements: D1PreparedStatement[] = [
    ...eventKeys.map((key) => db.prepare('DELETE FROM app_settings WHERE key = ?').bind(key)),
    db.prepare('DELETE FROM app_settings WHERE key LIKE ?').bind(eventMediaPattern(scope)),
    db.prepare(`DELETE FROM material_items WHERE ${materialScopeClause(scope)}`),
  ];
  if (scope === 'sample') statements.push(...SAMPLE_FIXTURE_KEYS.map((key) => db.prepare('DELETE FROM app_settings WHERE key = ?').bind(key)));
  await db.batch(statements);

  // Media chunks live in app_settings. GLOB lets us clear the matching material namespace
  // without scanning media payloads in JavaScript.
  if (scope === 'sample') {
    await db.prepare('DELETE FROM app_settings WHERE key GLOB ?').bind(`${MATERIAL_MEDIA_PREFIX}sample-*`).run();
  } else {
    // Official material IDs are UUID-like and never use the reserved sample- prefix.
    const rows = await db.prepare(`SELECT id FROM material_items WHERE id NOT LIKE 'sample-%'`).all<{ id: string }>();
    // The rows are normally empty because material_items were removed above. Clear any
    // remaining official media by excluding the reserved sample namespace instead.
    await db.prepare('DELETE FROM app_settings WHERE key LIKE ? AND key NOT LIKE ?')
      .bind(`${MATERIAL_MEDIA_PREFIX}%`, `${MATERIAL_MEDIA_PREFIX}sample-%`).run();
    void rows;
  }
}

export async function clearAllGenealogyData() {
  const db = getDatabase();
  await db.batch([
    ...SAMPLE_EVENT_KEYS.map((key) => db.prepare('DELETE FROM app_settings WHERE key = ?').bind(key)),
    ...OFFICIAL_EVENT_KEYS.map((key) => db.prepare('DELETE FROM app_settings WHERE key = ?').bind(key)),
    ...SAMPLE_FIXTURE_KEYS.map((key) => db.prepare('DELETE FROM app_settings WHERE key = ?').bind(key)),
    db.prepare("DELETE FROM app_settings WHERE key LIKE 'event_media:%'"),
    db.prepare(`DELETE FROM app_settings WHERE key LIKE '${MATERIAL_MEDIA_PREFIX}%'`),
    db.prepare('DELETE FROM material_items'),
  ]);
}
