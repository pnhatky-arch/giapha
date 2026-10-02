import { NextResponse } from 'next/server';
import { GENEALOGY_AUDIT_ENTITIES, getDatabase } from '@/db';
import { getInternalUser } from '@/app/internal-auth';

const genealogyEntityPlaceholders = GENEALOGY_AUDIT_ENTITIES.map(() => '?').join(', ');

export async function GET() {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập.' }, { status: 401 });
  const result = await getDatabase().prepare(`SELECT id, actor_username, action, entity, details, created_at FROM audit_logs
    WHERE entity IN (${genealogyEntityPlaceholders}) ORDER BY created_at DESC LIMIT 300`).bind(...GENEALOGY_AUDIT_ENTITIES).all();
  return NextResponse.json({ logs: result.results });
}

export async function PATCH(request: Request) {
  const user = await getInternalUser();
  if (!user || user.role !== 'super_admin') return denied();
  const body = await request.json().catch(() => null) as { id?: string; details?: string } | null;
  const details = body?.details?.trim() ?? '';
  if (!body?.id || !details || details.length > 300) return NextResponse.json({ message: 'Nội dung nhật ký không hợp lệ.' }, { status: 400 });
  const result = await getDatabase().prepare(`UPDATE audit_logs SET details = ? WHERE id = ? AND entity IN (${genealogyEntityPlaceholders})`)
    .bind(details, body.id, ...GENEALOGY_AUDIT_ENTITIES).run();
  if (!result.meta.changes) return NextResponse.json({ message: 'Không tìm thấy bản ghi.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user || user.role !== 'super_admin') return denied();
  const body = await request.json().catch(() => null) as { id?: string; clearAll?: boolean } | null;
  if (body?.clearAll) {
    const result = await getDatabase().prepare(`DELETE FROM audit_logs WHERE entity IN (${genealogyEntityPlaceholders})`).bind(...GENEALOGY_AUDIT_ENTITIES).run();
    return NextResponse.json({ ok: true, deleted: result.meta.changes ?? 0 });
  }
  if (!body?.id) return NextResponse.json({ message: 'Thiếu bản ghi cần xóa.' }, { status: 400 });
  const result = await getDatabase().prepare(`DELETE FROM audit_logs WHERE id = ? AND entity IN (${genealogyEntityPlaceholders})`)
    .bind(body.id, ...GENEALOGY_AUDIT_ENTITIES).run();
  if (!result.meta.changes) return NextResponse.json({ message: 'Không tìm thấy bản ghi.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

function denied() { return NextResponse.json({ message: 'Chỉ quản trị cấp cao được sửa hoặc xóa nhật ký.' }, { status: 403 }); }
