import { NextResponse } from 'next/server';
import { ensureAuthSchema, getDatabase } from '@/db';
import { createSession, hashPassword, REMEMBER_SESSION_COOKIE, safeEqual, SESSION_COOKIE, sessionCookieOptions } from '@/app/internal-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string; remember?: boolean };
    const username = body.username?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';
    if (!username || !password) return error();
    await ensureAuthSchema();
    const row = await getDatabase().prepare('SELECT id, password_hash, password_salt FROM users WHERE username = ?')
      .bind(username).first<{ id: string; password_hash: string; password_salt: string }>();
    if (!row || !safeEqual(await hashPassword(password, row.password_salt), row.password_hash)) return error();
    const session = await createSession(row.id, body.remember === true);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.remember));
    response.cookies.set(REMEMBER_SESSION_COOKIE, session.remember ? session.token : '', { ...sessionCookieOptions(true), ...(session.remember ? {} : { maxAge: 0 }) });
    return response;
  } catch (error) {
    console.error('Internal login failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, message: 'Không thể đăng nhập lúc này.' }, { status: 500 });
  }
}

function error() { return NextResponse.json({ ok: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, { status: 401 }); }
