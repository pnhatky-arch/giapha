import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser, hashPassword, randomHex, SYSTEM_PERMISSIONS, type SystemPermission } from '@/app/internal-auth';

const ROOT_ADMIN_USERNAME = 'devphamgia';

export async function GET() {
  const actor = await getInternalUser();
  if (!actor || actor.role !== 'super_admin') return denied();
  const result = await getDatabase().prepare('SELECT id, full_name, username, role, permissions, active, created_at FROM users ORDER BY created_at ASC').all();
  return NextResponse.json({ accounts: result.results });
}

export async function PATCH(request: Request) {
  const actor = await getInternalUser();
  if (!actor || actor.role !== 'super_admin') return denied();
  const body = await request.json() as { id?: string; role?: string; permissions?: string[]; active?: boolean; resetPassword?: string };
  if (!body.id) return bad('Thiếu tài khoản cần cập nhật.');
  const target = await getDatabase().prepare('SELECT id, role, username, permissions, active FROM users WHERE id = ?').bind(body.id).first<{ id: string; role: 'super_admin' | 'member'; username: string; permissions: string; active: number }>();
  if (!target) return bad('Không tìm thấy tài khoản.', 404);
  if (target.username === ROOT_ADMIN_USERNAME && actor.username !== ROOT_ADMIN_USERNAME) return bad('Tài khoản quản trị gốc chỉ do chính tài khoản đó quản lý.', 403);
  if (typeof body.resetPassword === 'string') {
    if (body.resetPassword.length < 8 || body.resetPassword.length > 128) return bad('Mật khẩu mới cần có từ 8 đến 128 ký tự.');
    const salt = randomHex(16);
    await getDatabase().batch([
      getDatabase().prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(await hashPassword(body.resetPassword, salt), salt, target.id),
      getDatabase().prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id),
    ]);
    await writeAuditLog({ actorId: actor.id, actorUsername: actor.username, action: 'Đặt lại mật khẩu', entity: 'Tài khoản', details: `Đã đặt lại mật khẩu cho @${target.username} và hủy các phiên đăng nhập cũ` });
    return NextResponse.json({ ok: true });
  }
  const role = body.role === 'super_admin' || body.role === 'member' ? body.role : target.role;
  const active = typeof body.active === 'boolean' ? body.active : Boolean(target.active);
  let currentPermissions: string[] = [];
  try { currentPermissions = JSON.parse(target.permissions); } catch { currentPermissions = []; }
  const permissions = Array.isArray(body.permissions)
    ? body.permissions.filter((item): item is SystemPermission => SYSTEM_PERMISSIONS.includes(item as SystemPermission))
    : currentPermissions.filter((item): item is SystemPermission => SYSTEM_PERMISSIONS.includes(item as SystemPermission));
  if (target.username === ROOT_ADMIN_USERNAME && (!active || role === 'member')) return bad('Không thể hạ quyền hoặc vô hiệu hóa tài khoản quản trị gốc.');
  if (body.id === actor.id && (!active || role === 'member')) return bad('Bạn không thể tự hạ quyền hoặc vô hiệu hóa tài khoản đang dùng.');
  if (target.role === 'super_admin' && (role === 'member' || !active)) {
    const administrators = await getDatabase().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND active = 1").first<{ count: number }>();
    if ((administrators?.count ?? 0) <= 1) return bad('Hệ thống phải luôn có ít nhất một Quản trị cấp cao đang hoạt động.');
  }
  await getDatabase().prepare('UPDATE users SET role = ?, permissions = ?, active = ? WHERE id = ?')
    .bind(role, JSON.stringify(permissions), active ? 1 : 0, body.id).run();
  await writeAuditLog({ actorId: actor.id, actorUsername: actor.username, action: 'Cập nhật tài khoản', entity: 'Tài khoản', details: `Đã cập nhật @${target.username}: ${role}, ${active ? 'hoạt động' : 'tạm ngưng'}` });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const actor = await getInternalUser();
  if (!actor || actor.role !== 'super_admin') return denied();
  const body = await request.json() as { id?: string };
  if (!body.id) return bad('Thiếu tài khoản cần xóa.');
  if (body.id === actor.id) return bad('Bạn không thể tự xóa tài khoản đang dùng.');
  const db = getDatabase();
  const target = await db.prepare('SELECT id, role, username FROM users WHERE id = ?').bind(body.id).first<{ id: string; role: string; username: string }>();
  if (!target) return bad('Không tìm thấy tài khoản.', 404);
  if (target.username === ROOT_ADMIN_USERNAME) return bad('Không thể xóa tài khoản quản trị gốc.');
  if (target.role === 'super_admin') {
    const administrators = await db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND active = 1").first<{ count: number }>();
    if ((administrators?.count ?? 0) <= 1) return bad('Hệ thống phải luôn có ít nhất một Quản trị cấp cao đang hoạt động.');
  }
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id),
    db.prepare('UPDATE audit_logs SET actor_id = NULL WHERE actor_id = ?').bind(target.id),
    db.prepare('UPDATE family_tree SET updated_by = NULL WHERE updated_by = ?').bind(target.id),
    db.prepare('UPDATE app_settings SET updated_by = NULL WHERE updated_by = ?').bind(target.id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(target.id),
  ]);
  await writeAuditLog({ actorId: actor.id, actorUsername: actor.username, action: 'Xóa tài khoản', entity: 'Tài khoản', details: `Đã xóa tài khoản @${target.username} và hủy toàn bộ phiên đăng nhập` });
  return NextResponse.json({ ok: true });
}

function denied() { return NextResponse.json({ message: 'Bạn không có quyền quản lý tài khoản.' }, { status: 403 }); }
function bad(message: string, status = 400) { return NextResponse.json({ message }, { status }); }
