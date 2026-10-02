import { NextResponse } from 'next/server';
import { ensureAuthSchema, getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { cloneFamily, flattenFamily, initialFamily, type FamilyDataMode, type FamilyPerson } from '@/lib/family-tree';

const TREE_ID = 'primary';
const DATA_MODE_KEY = 'family_data_mode';
const MAX_GENERATION = 20;
const MAX_MEMBERS = 500;
const SAMPLE_TREE_COUNTS = new Set([16, 68, 168]);

function isDataMode(value: unknown): value is FamilyDataMode {
  return value === 'sample' || value === 'official' || value === 'empty';
}

function auditEntityFor(action: string) {
  if (/thành viên/i.test(action)) return 'Thành viên';
  if (/sự kiện/i.test(action)) return 'Sự kiện';
  return 'Gia phả';
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isLegacySampleTree(value: FamilyPerson): boolean {
  return value.id === 1 && value.name === 'Phạm Văn An' && SAMPLE_TREE_COUNTS.has(flattenFamily(value).length);
}

async function getStoredDataMode(): Promise<FamilyDataMode | null> {
  const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').bind(DATA_MODE_KEY).first<{ value: string }>();
  return isDataMode(row?.value) ? row.value : null;
}

async function getEffectiveDataMode(): Promise<FamilyDataMode> {
  const savedMode = await getStoredDataMode();
  if (savedMode) return savedMode;
  const row = await getDatabase().prepare('SELECT data FROM family_tree WHERE id = ?').bind(TREE_ID).first<{ data: string }>();
  if (!row) return 'sample';
  if (row.data === 'null') return 'empty';
  try {
    const family = JSON.parse(row.data) as unknown;
    return validTree(family) && !isLegacySampleTree(family) ? 'official' : 'sample';
  } catch {
    return 'sample';
  }
}

function validTree(value: unknown): value is FamilyPerson {
  const ids = new Set<number>();
  let count = 0;
  const visit = (person: unknown, expectedGeneration: number): boolean => {
    if (!person || typeof person !== 'object' || Array.isArray(person)) return false;
    const member = person as Partial<FamilyPerson>;
    if (!Number.isInteger(member.id) || member.id! < 1 || ids.has(member.id!)) return false;
    if (typeof member.name !== 'string' || !member.name.trim() || member.name.trim().length > 100) return false;
    if (member.role !== undefined && (typeof member.role !== 'string' || member.role.length > 80)) return false;
    if (member.relationship !== undefined && (typeof member.relationship !== 'string' || member.relationship.length > 80)) return false;
    if (member.identityNumber !== undefined && (typeof member.identityNumber !== 'string' || member.identityNumber.length > 32)) return false;
    if (member.birthDate !== undefined && !isValidIsoDate(member.birthDate)) return false;
    if (member.deathDate !== undefined && !isValidIsoDate(member.deathDate)) return false;
    if (member.memorialDate !== undefined && !isValidIsoDate(member.memorialDate)) return false;
    if (member.avatar !== undefined && (typeof member.avatar !== 'string' || member.avatar.length > 350_000 || !/^(data:image\/(png|jpe?g|webp);base64,|https?:\/\/)/.test(member.avatar))) return false;
    if (member.generation !== expectedGeneration || expectedGeneration > MAX_GENERATION) return false;
    if (member.children !== undefined && !Array.isArray(member.children)) return false;
    ids.add(member.id!);
    count += 1;
    if (count > MAX_MEMBERS) return false;
    return (member.children ?? []).every((child) => visit(child, expectedGeneration + 1));
  };
  return visit(value, 1);
}

function withoutPrivateIdentity(root: FamilyPerson): FamilyPerson {
  const publicPerson = cloneFamily(root);
  const visit = (person: FamilyPerson) => {
    delete person.identityNumber;
    person.children?.forEach(visit);
  };
  visit(publicPerson);
  return publicPerson;
}

export async function GET() {
  try {
    await ensureAuthSchema();
    const user = await getInternalUser();
    const [row, savedMode] = await Promise.all([
      getDatabase().prepare('SELECT data FROM family_tree WHERE id = ?').bind(TREE_ID).first<{ data: string }>(),
      getStoredDataMode(),
    ]);
    if (!row) return NextResponse.json({ family: cloneFamily(initialFamily), dataMode: 'sample' satisfies FamilyDataMode });
    if (row.data === 'null') return NextResponse.json({ family: null, dataMode: savedMode ?? 'empty' });
    if (savedMode === 'sample') return NextResponse.json({ family: cloneFamily(initialFamily), dataMode: 'sample' satisfies FamilyDataMode });
    const stored = JSON.parse(row.data) as unknown;
    if (!validTree(stored)) return NextResponse.json({ family: cloneFamily(initialFamily), dataMode: 'sample' satisfies FamilyDataMode });
    if (isLegacySampleTree(stored)) return NextResponse.json({ family: cloneFamily(initialFamily), dataMode: 'sample' satisfies FamilyDataMode });
    return NextResponse.json({ family: user ? stored : withoutPrivateIdentity(stored), dataMode: savedMode ?? 'official' });
  } catch {
    return NextResponse.json({ family: cloneFamily(initialFamily), dataMode: 'sample' satisfies FamilyDataMode });
  }
}

export async function PUT(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ.' }, { status: 401 });
  let body: { family?: unknown; activity?: { action?: unknown; details?: unknown }; dataMode?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }
  const family = body.family;
  if (!validTree(family)) return NextResponse.json({ message: 'Dữ liệu gia phả không hợp lệ.' }, { status: 400 });
  await ensureAuthSchema();
  if (body.dataMode !== undefined && !isDataMode(body.dataMode)) return NextResponse.json({ message: 'Trạng thái dữ liệu không hợp lệ.' }, { status: 400 });
  if (body.dataMode !== undefined && user.role !== 'super_admin') return NextResponse.json({ message: 'Chỉ quản trị cấp cao được thay đổi trạng thái dữ liệu.' }, { status: 403 });
  const savedMode = await getEffectiveDataMode();
  if (savedMode === 'sample' && body.dataMode === undefined) return NextResponse.json({ message: 'Dữ liệu thử nghiệm chỉ để tham khảo. Quản trị cấp cao cần bắt đầu dữ liệu chính thức trước khi chỉnh sửa.' }, { status: 409 });
  const dataMode = body.dataMode ?? (savedMode === 'empty' ? 'official' : savedMode);
  const db = getDatabase();
  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO family_tree (id, data, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(TREE_ID, JSON.stringify(family), now, user.id),
    ...(body.dataMode !== undefined || savedMode === 'empty' ? [db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(DATA_MODE_KEY, dataMode, now, user.id)] : []),
  ]);
  const action = typeof body.activity?.action === 'string' ? body.activity.action : 'Cập nhật gia phả';
  const details = typeof body.activity?.details === 'string' ? body.activity.details : 'Đã cập nhật dữ liệu gia phả';
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action, entity: auditEntityFor(action), details });
  return NextResponse.json({ ok: true, family, dataMode });
}

export async function DELETE() {
  const user = await getInternalUser();
  if (!user || user.role !== 'super_admin') return NextResponse.json({ message: 'Chỉ quản trị cấp cao được xóa toàn bộ dữ liệu gia phả.' }, { status: 403 });
  await ensureAuthSchema();
  const db = getDatabase();
  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO family_tree (id, data, updated_at, updated_by) VALUES (?, 'null', ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = 'null', updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(TREE_ID, now, user.id),
    db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, 'empty', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = 'empty', updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(DATA_MODE_KEY, now, user.id),
  ]);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa dữ liệu', entity: 'Gia phả', details: 'Đã xóa toàn bộ dữ liệu gia phả khỏi hệ thống' });
  return NextResponse.json({ ok: true });
}
