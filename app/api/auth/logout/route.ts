import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatabase } from '@/db';
import { REMEMBER_SESSION_COOKIE, SESSION_COOKIE, sessionCookieOptions, sha256 } from '@/app/internal-auth';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const rememberedToken = jar.get(REMEMBER_SESSION_COOKIE)?.value;
  if (token && token !== rememberedToken) {
    try { await getDatabase().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run(); } catch { /* cookie is still cleared */ }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(false), maxAge: 0 });
  return response;
}
