import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ensureAuthSchema, getDatabase } from '@/db';
import { REMEMBER_SESSION_COOKIE, SESSION_COOKIE, sessionCookieOptions, sha256 } from '@/app/internal-auth';

type RememberedAccount = { username: string };

async function getRememberedAccount(): Promise<RememberedAccount | null> {
  const token = (await cookies()).get(REMEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureAuthSchema();
  return getDatabase().prepare(`SELECT users.username
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.active = 1`)
    .bind(await sha256(token), Date.now()).first<RememberedAccount>();
}

export async function GET() {
  try {
    const account = await getRememberedAccount();
    return NextResponse.json({ available: Boolean(account), username: account?.username });
  } catch {
    return NextResponse.json({ available: false });
  }
}

export async function POST() {
  try {
    const account = await getRememberedAccount();
    const token = (await cookies()).get(REMEMBER_SESSION_COOKIE)?.value;
    if (!account || !token) return NextResponse.json({ ok: false, message: 'Thông tin đăng nhập đã lưu không còn hiệu lực.' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(true));
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: 'Không thể khôi phục đăng nhập trên thiết bị này.' }, { status: 500 });
  }
}
