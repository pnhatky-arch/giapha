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

  if (scope === 'sample') {
    await db.prepare('DELETE FROM app_settings WHERE key GLOB ?').bind(`${MATERIAL_MEDIA_PREFIX}sample-*`).run();
  } else {
    await db.prepare('DELETE FROM app_settings WHERE key LIKE ? AND key NOT LIKE ?')
      .bind(`${MATERIAL_MEDIA_PREFIX}%`, `${MATERIAL_MEDIA_PREFIX}sample-%`).run();
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
