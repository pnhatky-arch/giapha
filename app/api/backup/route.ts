import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { getFamilyDataMode } from '@/lib/family-data-mode';
import { initialFamily, type FamilyDataMode, type FamilyPerson } from '@/lib/family-tree';

const TREE_ID = 'primary';
const BACKUP_SCHEMA = 'giapha-content-v2';
const APP_NAME = 'GIA PHẢ HỌ PHẠM VĂN';
const MAX_SETTINGS_ROWS = 50_000;
const MAX_MATERIAL_ROWS = 2_000;
const BATCH_SIZE = 60;

const SETTING_KEYS = new Set([
  'project_name', 'show_brand_banner', 'generations', 'legends', 'menu_tabs', 'login_notice', 'enabled_languages',
  'family_data_mode', 'tomb_sweeping_events', 'sample_tomb_sweeping_events_v1',
  'family_work_events', 'sample_family_work_events_v1', 'sample_material_fixture_version',
]);
const SETTING_PREFIXES = ['event_media:', 'material_media_d1:'];

type BackupSetting = { key: string; value: string };
type BackupMaterial = {
  id: string;
  parent_id: string | null;
  kind: 'folder' | 'note' | 'link';
  title: string;
  content: string;
  created_by_username: string;
  updated_by_username: string;
  created_at: number;
  updated_at: number;
};

type BackupPayload = {
  application: string;
  schema: string;
  exportedAt: string;
  dataMode: FamilyDataMode;
  family: FamilyPerson | null;
  appSettings: BackupSetting[];
  materials: BackupMaterial[];
};

function allowedSettingKey(key: string) {
  return SETTING_KEYS.has(key) || SETTING_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function validDataMode(value: unknown): value is FamilyDataMode {
  return value === 'sample' || value === 'official' || value === 'empty';
}

function validFamily(value: unknown): value is FamilyPerson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ids = new Set<number>();
  let count = 0;
  const visit = (node: unknown, generation: number): boolean => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
    const person = node as Partial<FamilyPerson>;
    if (!Number.isInteger(person.id) || person.id! < 1 || ids.has(person.id!)) return false;
    if (typeof person.name !== 'string' || !person.name.trim() || person.name.length > 100) return false;
    if (person.generation !== generation || generation > 20) return false;
    if (person.children !== undefined && !Array.isArray(person.children)) return false;
    ids.add(person.id!);
    count += 1;
    if (count > 500) return false;
    return (person.children ?? []).every((child) => visit(child, generation + 1));
  };
  return visit(value, 1);
}

function validMaterial(value: unknown): value is BackupMaterial {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Partial<BackupMaterial>;
  return typeof row.id === 'string' && row.id.length > 0 && row.id.length <= 220
    && (row.parent_id === null || typeof row.parent_id === 'string')
    && (row.kind === 'folder' || row.kind === 'note' || row.kind === 'link')
    && typeof row.title === 'string' && row.title.length > 0 && row.title.length <= 120
    && typeof row.content === 'string' && row.content.length <= 12_000
    && typeof row.created_by_username === 'string'
    && typeof row.updated_by_username === 'string'
    && typeof row.created_at === 'number' && typeof row.updated_at === 'number';
}

async function runBatches(statements: D1PreparedStatement[]) {
  const db = getDatabase();
  for (let index = 0; index < statements.length; index += BATCH_SIZE) {
    await db.batch(statements.slice(index, index + BATCH_SIZE));
  }
}

async function currentFamily(mode: FamilyDataMode) {
  if (mode === 'empty') return null;
  if (mode === 'sample') return structuredClone(initialFamily);
  const row = await getDatabase().prepare('SELECT data FROM family_tree WHERE id = ?').bind(TREE_ID).first<{ data: string }>();
  if (!row?.data || row.data === 'null') return null;
  try {
    const parsed = JSON.parse(row.data) as unknown;
    return validFamily(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập để sao lưu dữ liệu.' }, { status: 401 });
  const db = getDatabase();
  const dataMode = await getFamilyDataMode();
  const [settingsResult, materialsResult, family] = await Promise.all([
    db.prepare('SELECT key, value FROM app_settings ORDER BY key ASC').all<BackupSetting>(),
    db.prepare(`SELECT id, parent_id, kind, title, content, created_by_username, updated_by_username, created_at, updated_at
      FROM material_items ORDER BY created_at ASC`).all<BackupMaterial>(),
    currentFamily(dataMode),
  ]);
  const appSettings = settingsResult.results.filter((row) => allowedSettingKey(row.key));
  const payload: BackupPayload = {
    application: APP_NAME,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    dataMode,
    family,
    appSettings,
    materials: materialsResult.results,
  };
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Disposition': `attachment; filename="gia-pha-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user || user.role !== 'super_admin') return NextResponse.json({ message: 'Chỉ quản trị cấp cao được phục hồi toàn bộ dữ liệu.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Partial<BackupPayload> | null;
  if (!body || body.application !== APP_NAME || body.schema !== BACKUP_SCHEMA || !validDataMode(body.dataMode)) {
    return NextResponse.json({ message: 'Tệp sao lưu toàn hệ thống không hợp lệ hoặc không đúng phiên bản.' }, { status: 400 });
  }
  if (body.dataMode !== 'empty' && !validFamily(body.family)) return NextResponse.json({ message: 'Cây gia phả trong bản sao lưu không hợp lệ.' }, { status: 400 });
  if (body.dataMode === 'empty' && body.family !== null) return NextResponse.json({ message: 'Trạng thái dữ liệu trống không khớp bản sao lưu.' }, { status: 400 });
  if (!Array.isArray(body.appSettings) || body.appSettings.length > MAX_SETTINGS_ROWS) return NextResponse.json({ message: 'Dữ liệu cài đặt/media trong bản sao lưu không hợp lệ.' }, { status: 400 });
  if (!Array.isArray(body.materials) || body.materials.length > MAX_MATERIAL_ROWS || !body.materials.every(validMaterial)) return NextResponse.json({ message: 'Kho tư liệu trong bản sao lưu không hợp lệ.' }, { status: 400 });

  const settings = body.appSettings.filter((row): row is BackupSetting => Boolean(row)
    && typeof row.key === 'string' && typeof row.value === 'string' && allowedSettingKey(row.key) && row.key !== 'family_data_mode');
  if (settings.length !== body.appSettings.filter((row) => row?.key !== 'family_data_mode').length) return NextResponse.json({ message: 'Bản sao lưu chứa khóa dữ liệu không được phép phục hồi.' }, { status: 400 });

  const materialIds = new Set(body.materials.map((row) => row.id));
  if (materialIds.size !== body.materials.length) return NextResponse.json({ message: 'Kho tư liệu có mã bị trùng.' }, { status: 400 });
  for (const row of body.materials) {
    if (row.parent_id && !materialIds.has(row.parent_id)) return NextResponse.json({ message: `Tư liệu “${row.title}” tham chiếu thư mục không tồn tại.` }, { status: 400 });
  }

  const db = getDatabase();
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM material_items'),
    db.prepare("DELETE FROM app_settings WHERE key IN ('tomb_sweeping_events','sample_tomb_sweeping_events_v1','family_work_events','sample_family_work_events_v1','sample_material_fixture_version')"),
    db.prepare("DELETE FROM app_settings WHERE key LIKE 'event_media:%'"),
    db.prepare("DELETE FROM app_settings WHERE key LIKE 'material_media_d1:%'"),
    ...['project_name','show_brand_banner','generations','legends','menu_tabs','login_notice','enabled_languages'].map((key) => db.prepare('DELETE FROM app_settings WHERE key = ?').bind(key)),
  ]);

  await runBatches(body.materials.map((row) => db.prepare(`INSERT INTO material_items
    (id, parent_id, kind, title, content, created_by_username, updated_by_username, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(row.id, row.parent_id, row.kind, row.title, row.content, row.created_by_username, row.updated_by_username, row.created_at, row.updated_at)));

  await runBatches(settings.map((row) => db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(row.key, row.value, now, user.id)));

  await db.batch([
    db.prepare(`INSERT INTO family_tree (id, data, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(TREE_ID, body.dataMode === 'empty' ? 'null' : JSON.stringify(body.family), now, user.id),
    db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES ('family_data_mode', ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(body.dataMode, now, user.id),
  ]);

  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Phục hồi dữ liệu', entity: 'Gia phả', details: `Đã phục hồi bản sao lưu toàn hệ thống (${body.dataMode})` });
  return NextResponse.json({ ok: true, dataMode: body.dataMode });
}
