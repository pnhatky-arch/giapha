import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';

const MAX_ITEMS = 600;
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 12_000;
const kinds = ['folder', 'note', 'link'] as const;
type MaterialKind = typeof kinds[number];

type MaterialItem = {
  id: string;
  parent_id: string | null;
  kind: MaterialKind;
  title: string;
  content: string;
  created_by_username: string;
  updated_by_username: string;
  created_at: number;
  updated_at: number;
};

type MaterialPayload = { kind?: unknown; title?: unknown; content?: unknown; parentId?: unknown };

function isKind(value: unknown): value is MaterialKind {
  return typeof value === 'string' && kinds.includes(value as MaterialKind);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizePayload(payload: MaterialPayload) {
  if (!isKind(payload.kind)) return { error: 'Loại tư liệu không hợp lệ.' } as const;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const parentId = payload.parentId === null || payload.parentId === undefined || payload.parentId === '' ? null : typeof payload.parentId === 'string' ? payload.parentId : undefined;
  if (!title || title.length > MAX_TITLE_LENGTH) return { error: `Tiêu đề cần có từ 1 đến ${MAX_TITLE_LENGTH} ký tự.` } as const;
  if (content.length > MAX_CONTENT_LENGTH) return { error: `Nội dung không được vượt quá ${MAX_CONTENT_LENGTH.toLocaleString('vi-VN')} ký tự.` } as const;
  if (payload.kind === 'link' && !isHttpUrl(content)) return { error: 'Liên kết phải bắt đầu bằng http:// hoặc https://.' } as const;
  if (parentId === undefined) return { error: 'Thư mục chứa không hợp lệ.' } as const;
  return { value: { kind: payload.kind, title, content, parentId } } as const;
}

async function items() {
  const result = await getDatabase().prepare(`SELECT id, parent_id, kind, title, content, created_by_username, updated_by_username, created_at, updated_at
    FROM material_items ORDER BY updated_at DESC, title COLLATE NOCASE ASC`).all<MaterialItem>();
  return result.results;
}

function descendantIds(allItems: MaterialItem[], rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of allItems) {
      if (item.parent_id && ids.has(item.parent_id) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
    }
  }
  return ids;
}

function activityFor(kind: MaterialKind) {
  return kind === 'folder' ? 'thư mục' : kind === 'note' ? 'nội dung' : 'liên kết';
}

export async function GET() {
  try {
    return NextResponse.json({ items: await items() });
  } catch {
    return NextResponse.json({ message: 'Không thể tải tư liệu lúc này.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để tạo tư liệu.' }, { status: 401 });
  const body = await request.json().catch(() => null) as MaterialPayload | null;
  const normalized = normalizePayload(body ?? {});
  if ('error' in normalized) return NextResponse.json({ message: normalized.error }, { status: 400 });
  const { kind, title, content, parentId } = normalized.value;
  const allItems = await items();
  if (allItems.length >= MAX_ITEMS) return NextResponse.json({ message: `Kho tư liệu đã đạt giới hạn ${MAX_ITEMS} mục.` }, { status: 409 });
  if (parentId && !allItems.some((item) => item.id === parentId && item.kind === 'folder')) return NextResponse.json({ message: 'Thư mục chứa không còn tồn tại.' }, { status: 400 });
  const id = crypto.randomUUID();
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO material_items
    (id, parent_id, kind, title, content, created_by_username, updated_by_username, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, parentId, kind, title, content, user.username, user.username, now, now).run();
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Thêm tư liệu', entity: 'Tư liệu gia phả', details: `Đã tạo ${activityFor(kind)} “${title}”` });
  return NextResponse.json({ item: { id, parent_id: parentId, kind, title, content, created_by_username: user.username, updated_by_username: user.username, created_at: now, updated_at: now } });
}

export async function PATCH(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để sửa tư liệu.' }, { status: 401 });
  const body = await request.json().catch(() => null) as (MaterialPayload & { id?: unknown }) | null;
  if (!body || typeof body.id !== 'string' || !body.id) return NextResponse.json({ message: 'Thiếu mục tư liệu cần sửa.' }, { status: 400 });
  const normalized = normalizePayload(body);
  if ('error' in normalized) return NextResponse.json({ message: normalized.error }, { status: 400 });
  const { kind, title, content, parentId } = normalized.value;
  const allItems = await items();
  const current = allItems.find((item) => item.id === body.id);
  if (!current) return NextResponse.json({ message: 'Không tìm thấy mục tư liệu.' }, { status: 404 });
  if (current.kind === 'folder' && kind !== 'folder' && allItems.some((item) => item.parent_id === current.id)) {
    return NextResponse.json({ message: 'Thư mục đang chứa tư liệu nên không thể đổi loại. Hãy chuyển hoặc xóa các mục bên trong trước.' }, { status: 409 });
  }
  if (parentId) {
    const parent = allItems.find((item) => item.id === parentId);
    if (!parent || parent.kind !== 'folder') return NextResponse.json({ message: 'Thư mục chứa không còn tồn tại.' }, { status: 400 });
    if (parentId === current.id || descendantIds(allItems, current.id).has(parentId)) return NextResponse.json({ message: 'Không thể đặt mục vào chính nó hoặc thư mục con của nó.' }, { status: 400 });
  }
  const now = Date.now();
  await getDatabase().prepare(`UPDATE material_items SET parent_id = ?, kind = ?, title = ?, content = ?, updated_by_username = ?, updated_at = ? WHERE id = ?`)
    .bind(parentId, kind, title, content, user.username, now, current.id).run();
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Sửa tư liệu', entity: 'Tư liệu gia phả', details: `Đã cập nhật ${activityFor(kind)} “${title}”` });
  return NextResponse.json({ item: { ...current, parent_id: parentId, kind, title, content, updated_by_username: user.username, updated_at: now } });
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để xóa tư liệu.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (!body || typeof body.id !== 'string' || !body.id) return NextResponse.json({ message: 'Thiếu mục tư liệu cần xóa.' }, { status: 400 });
  const allItems = await items();
  const current = allItems.find((item) => item.id === body.id);
  if (!current) return NextResponse.json({ message: 'Không tìm thấy mục tư liệu.' }, { status: 404 });
  const ids = [...descendantIds(allItems, current.id)];
  const db = getDatabase();
  await db.batch(ids.map((id) => db.prepare('DELETE FROM material_items WHERE id = ?').bind(id)));
  const countText = ids.length > 1 ? ` cùng ${ids.length - 1} mục bên trong` : '';
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa tư liệu', entity: 'Tư liệu gia phả', details: `Đã xóa ${activityFor(current.kind)} “${current.title}”${countText}` });
  return NextResponse.json({ ok: true, deletedIds: ids });
}
