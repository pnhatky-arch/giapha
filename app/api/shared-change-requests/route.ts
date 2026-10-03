import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';

const MAX_PAYLOAD = 4_000_000;
const allowedKinds = new Set(['family','member','event','material','media','settings']);

type Change = { id: string; kind: string; action: 'create'|'update'|'delete'; label: string; before?: unknown; after?: unknown };

function validChanges(value: unknown): value is Change[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 500 && value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const row = item as Partial<Change>;
    return typeof row.id === 'string' && row.id.length <= 160 && typeof row.kind === 'string' && allowedKinds.has(row.kind)
      && (row.action === 'create' || row.action === 'update' || row.action === 'delete')
      && typeof row.label === 'string' && row.label.length <= 200;
  });
}

export async function GET() {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập.' }, { status: 401 });
  const db = getDatabase();
  const query = user.role === 'super_admin'
    ? db.prepare(`SELECT id, requester_username, device_label, summary, payload, status, reviewer_username, review_note, created_at, reviewed_at FROM shared_change_requests ORDER BY created_at DESC LIMIT 100`)
    : db.prepare(`SELECT id, requester_username, device_label, summary, payload, status, reviewer_username, review_note, created_at, reviewed_at FROM shared_change_requests WHERE requester_id = ? ORDER BY created_at DESC LIMIT 50`).bind(user.id);
  const result = await query.all();
  return NextResponse.json({ requests: result.results });
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { changes?: unknown; deviceLabel?: unknown } | null;
  if (!body || !validChanges(body.changes)) return NextResponse.json({ message: 'Danh sách thay đổi không hợp lệ.' }, { status: 400 });
  const payload = JSON.stringify(body.changes);
  if (payload.length > MAX_PAYLOAD) return NextResponse.json({ message: 'Gói dữ liệu vượt giới hạn.' }, { status: 413 });
  const counts = body.changes.reduce<Record<string, number>>((acc, item) => { acc[item.kind] = (acc[item.kind] || 0) + 1; return acc; }, {});
  const summary = Object.entries(counts).map(([kind,count]) => `${count} ${kind}`).join(' · ');
  const id = crypto.randomUUID();
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO shared_change_requests (id, requester_id, requester_username, device_label, summary, payload, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
    .bind(id, user.id, user.username, typeof body.deviceLabel === 'string' ? body.deviceLabel.slice(0,120) : '', summary, payload, now).run();
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Gửi duyệt dữ liệu', entity: 'Dữ liệu chung', details: `Yêu cầu ${id}: ${summary}` });
  return NextResponse.json({ ok: true, id, status: 'pending', summary });
}

export async function PATCH(request: Request) {
  const user = await getInternalUser();
  if (!user || user.role !== 'super_admin') return NextResponse.json({ message: 'Chỉ quản trị viên được duyệt dữ liệu chung.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; decision?: 'approved'|'rejected'; note?: string } | null;
  if (!body?.id || !['approved','rejected'].includes(body.decision || '')) return NextResponse.json({ message: 'Yêu cầu xử lý không hợp lệ.' }, { status: 400 });
  const db = getDatabase();
  const row = await db.prepare(`SELECT id, requester_username, payload, status FROM shared_change_requests WHERE id = ?`).bind(body.id).first<{id:string;requester_username:string;payload:string;status:string}>();
  if (!row || row.status !== 'pending') return NextResponse.json({ message: 'Yêu cầu không còn ở trạng thái chờ duyệt.' }, { status: 409 });

  // Approval is the only server-side gate allowed to mutate shared data. Domain-specific
  // application is intentionally explicit; unsupported change kinds stay rejected rather than bypassing review.
  const changes = JSON.parse(row.payload) as Change[];
  if (body.decision === 'approved') {
    for (const change of changes) {
      if (change.kind === 'family' && change.action !== 'delete') {
        const data = JSON.stringify(change.after ?? null);
        await db.prepare(`INSERT INTO family_tree (id, data, updated_at, updated_by) VALUES ('primary', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, updated_by=excluded.updated_by`).bind(data, Date.now(), user.id).run();
      }
    }
  }
  const now = Date.now();
  await db.prepare(`UPDATE shared_change_requests SET status=?, reviewer_id=?, reviewer_username=?, review_note=?, reviewed_at=? WHERE id=? AND status='pending'`)
    .bind(body.decision, user.id, user.username, String(body.note || '').slice(0,1000), now, body.id).run();
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: body.decision === 'approved' ? 'Duyệt dữ liệu' : 'Từ chối dữ liệu', entity: 'Dữ liệu chung', details: `Yêu cầu ${body.id} từ ${row.requester_username}` });
  return NextResponse.json({ ok: true, status: body.decision });
}
