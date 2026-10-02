import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';

const TREE_ID = 'primary';
const BACKUP_VERSION = 2;
const MAX_SETTINGS = 20000;
const MAX_MATERIALS = 5000;
const MAX_AUDIT_LOGS = 10000;

const SETTINGS_KEYS = new Set([
  'project_name',
  'show_brand_banner',
  'generations',
  'legends',
  'menu_tabs',
  'login_notice',
  'enabled_languages',
  'family_data_mode',
  'tomb_sweeping_events',
  'sample_tomb_sweeping_events_v1',
  'family_work_events',
  'sample_family_work_events_v1',
  'sample_material_fixture_version',
]);

function isBackupSetting(key: string) {
  return SETTINGS_KEYS.has(key) || key.startsWith('event_media:') || key.startsWith('material_media_d1:');
}

type BackupSetting = { key: string; value: string; updated_at?: number };
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
type BackupAudit = {
  id: string;
  actor_username: string;
  action: string;
  entity: string;
  details: string;
  created_at: number;
};
type SystemBackup = {
  application: string;
  scope: 'genealogy-system';
  version: number;
  exportedAt: string;
  familyTree: { id: string; data: string; updated_at?: number } | null;
  settings: BackupSetting[];
  materials: BackupMaterial[];
  auditLogs: BackupAudit[];
};

function validMaterial(value: unknown): value is BackupMaterial {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<BackupMaterial>;
  return typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 220
    && (item.parent_id === null || typeof item.parent_id === 'string')
    && (item.kind === 'folder' || item.kind === 'note' || item.kind === 'link')
    && typeof item.title === 'string' && item.title.length <= 120
    && typeof item.content === 'string' && item.content.length <= 12000
    && typeof item.created_by_username === 'string' && typeof item.updated_by_username === 'string'
    && typeof item.created_at === 'number' && typeof item.updated_at === 'number';
}

function validAudit(value: unknown): value is BackupAudit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const log = value as Partial<BackupAudit>;
  return typeof log.id === 'string' && log.id.length > 0
    && typeof log.actor_username === 'string'
    && typeof log.action === 'string' && log.action.length <= 80
    && typeof log.entity === 'string' && log.entity.length <= 80
    && typeof log.details === 'string' && log.details.length <= 300
    && typeof log.created_at === 'number';
}

function validSetting(value: unknown): value is BackupSetting {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const setting = value as Partial<BackupSetting>;
  return typeof setting.key === 'string' && isBackupSetting(setting.key)
    && typeof setting.value === 'string';
}

function validTreeRow(value: unknown): value is NonNullable<SystemBackup['familyTree']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const tree = value as { id?: unknown; data?: unknown; updated_at?: unknown };
  if (tree.id !== TREE_ID || typeof tree.data !== 'string' || tree.data.length > 8_000_000) return false;
  if (tree.data !== 'null') {
    try { JSON.parse(tree.data); } catch { return false; }
  }
  return tree.updated_at === undefined || typeof tree.updated_at === 'number';
}

async function runBatches(statements: D1PreparedStatement[], size = 60) {
  const db = getDatabase();
  for (let index = 0; index < statements.length; index += size) {
    const chunk = statements.slice(index, index + size);
    if (chunk.length) await db.batch(chunk);
  }
}

export async function GET() {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập để sao lưu dữ liệu.' }, { status: 401 });
  const db = getDatabase();
  const [tree, settingsResult, materialsResult, auditResult] = await Promise.all([
    db.prepare('SELECT id, data, updated_at FROM family_tree WHERE id = ?').bind(TREE_ID).first<{ id: string; data: string; updated_at: number }>(),
    db.prepare('SELECT key, value, updated_at FROM app_settings ORDER BY key ASC').all<BackupSetting>(),
    db.prepare(`SELECT id, parent_id, kind, title, content, created_by_username, updated_by_username, created_at, updated_at
      FROM material_items ORDER BY created_at ASC`).all<BackupMaterial>(),
    db.prepare(`SELECT id, actor_username, action, entity, details, created_at
      FROM audit_logs ORDER BY created_at ASC LIMIT ?`).bind(MAX_AUDIT_LOGS).all<BackupAudit>(),
  ]);

  const settings = settingsResult.results.filter((row) => isBackupSetting(row.key));
  if (settings.length > MAX_SETTINGS || materialsResult.results.length > MAX_MATERIALS) {
    return NextResponse.json({ message: 'Dữ liệu hiện có vượt giới hạn đóng gói sao lưu JSON.' }, { status: 413 });
  }

  const backup: SystemBackup = {
    application: 'GIA PHẢ HỌ PHẠM VĂN',
    scope: 'genealogy-system',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    familyTree: tree ?? null,
    settings,
    materials: materialsResult.results,
    auditLogs: auditResult.results,
  };
  return NextResponse.json(backup, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Disposition': `attachment; filename="gia-pha-system-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user || user.role !== 'super_admin') return NextResponse.json({ message: 'Chỉ quản trị cấp cao được phục hồi toàn bộ dữ liệu.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Tệp sao lưu không phải JSON hợp lệ.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ message: 'Tệp sao lưu không hợp lệ.' }, { status: 400 });
  const backup = body as Partial<SystemBackup>;
  if (backup.scope !== 'genealogy-system' || backup.version !== BACKUP_VERSION) return NextResponse.json({ message: 'Đây không phải bản sao lưu hệ thống phiên bản được hỗ trợ.' }, { status: 400 });
  if (backup.familyTree !== null && !validTreeRow(backup.familyTree)) return NextResponse.json({ message: 'Dữ liệu cây gia phả trong bản sao lưu không hợp lệ.' }, { status: 400 });
  if (!Array.isArray(backup.settings) || backup.settings.length > MAX_SETTINGS || !backup.settings.every(validSetting)) return NextResponse.json({ message: 'Cài đặt trong bản sao lưu không hợp lệ.' }, { status: 400 });
  if (!Array.isArray(backup.materials) || backup.materials.length > MAX_MATERIALS || !backup.materials.every(validMaterial)) return NextResponse.json({ message: 'Kho tư liệu trong bản sao lưu không hợp lệ.' }, { status: 400 });
  if (!Array.isArray(backup.auditLogs) || backup.auditLogs.length > MAX_AUDIT_LOGS || !backup.auditLogs.every(validAudit)) return NextResponse.json({ message: 'Lịch sử trong bản sao lưu không hợp lệ.' }, { status: 400 });

  const db = getDatabase();
  const now = Date.now();

  // Clear only genealogy-domain content. Accounts, password hashes and sessions are intentionally preserved.
  await db.batch([
    db.prepare('DELETE FROM family_tree WHERE id = ?').bind(TREE_ID),
    db.prepare('DELETE FROM material_items'),
    db.prepare('DELETE FROM audit_logs'),
  ]);
  await db.prepare(`DELETE FROM app_settings WHERE
    key IN ('project_name','show_brand_banner','generations','legends','menu_tabs','login_notice','enabled_languages','family_data_mode','tomb_sweeping_events','sample_tomb_sweeping_events_v1','family_work_events','sample_family_work_events_v1','sample_material_fixture_version')
    OR key LIKE 'event_media:%' OR key LIKE 'material_media_d1:%'`).run();

  if (backup.familyTree) {
    await db.prepare('INSERT INTO family_tree (id, data, updated_at, updated_by) VALUES (?, ?, ?, NULL)')
      .bind(TREE_ID, backup.familyTree.data, Number(backup.familyTree.updated_at ?? now)).run();
  }

  await runBatches(backup.settings.map((setting) => db.prepare('INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, NULL)')
    .bind(setting.key, setting.value, Number(setting.updated_at ?? now))));

  await runBatches(backup.materials.map((item) => db.prepare(`INSERT INTO material_items
    (id, parent_id, kind, title, content, created_by_username, updated_by_username, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.id, item.parent_id, item.kind, item.title, item.content, item.created_by_username, item.updated_by_username, item.created_at, item.updated_at)));

  await runBatches(backup.auditLogs.map((log) => db.prepare(`INSERT INTO audit_logs
    (id, actor_id, actor_username, action, entity, details, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)`)
    .bind(log.id, log.actor_username, log.action, log.entity, log.details, log.created_at)));

  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Phục hồi dữ liệu', entity: 'Gia phả', details: 'Đã phục hồi bản sao lưu hệ thống; tài khoản và phiên đăng nhập được giữ nguyên.' });
  return NextResponse.json({ ok: true, restored: { settings: backup.settings.length, materials: backup.materials.length, auditLogs: backup.auditLogs.length } });
}
