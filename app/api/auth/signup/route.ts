import { NextResponse } from 'next/server';
import { ensureAuthSchema, getDatabase, writeAuditLog } from '@/db';
import { createSession, hashPassword, randomHex, REMEMBER_SESSION_COOKIE, SESSION_COOKIE, sessionCookieOptions } from '@/app/internal-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { fullName?: string; username?: string; password?: string };
    const fullName = body.fullName?.trim() ?? '';
    const username = body.username?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';
    if (fullName.length < 2 || fullName.length > 80) return error('Họ tên phải có từ 2 đến 80 ký tự.');
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return error('Tên đăng nhập cần 3–30 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.');
    if (password.length < 8 || password.length > 128) return error('Mật khẩu phải có từ 8 đến 128 ký tự.');
    await ensureAuthSchema();
    const db = getDatabase();
    if (await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()) return error('Tên đăng nhập này đã được sử dụng.', 409);
    const id = crypto.randomUUID();
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    await db.prepare(`INSERT INTO users (id, full_name, username, password_hash, password_salt, role, permissions, active, created_at)
      VALUES (?, ?, ?, ?, ?, 'member', '[]', 1, ?)`)
      .bind(id, fullName, username, passwordHash, salt, Date.now()).run();
    await writeAuditLog({ actorId: id, actorUsername: username, action: 'Tạo tài khoản', entity: 'Tài khoản', details: `Đã tạo tài khoản nội bộ @${username}` });
    const session = await createSession(id, true);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.remember));
    response.cookies.set(REMEMBER_SESSION_COOKIE, session.token, sessionCookieOptions(true));
    return response;
  } catch (caught) {
    console.error('Internal account creation failed', caught instanceof Error ? caught.message : caught);
    return error('Không thể tạo tài khoản lúc này. Vui lòng thử lại.', 500);
  }
}

function error(message: string, status = 400) { return NextResponse.json({ ok: false, message }, { status }); }
