import { cookies } from 'next/headers';
import { ensureAuthSchema, getDatabase } from '@/db';

export const SESSION_COOKIE = 'gia_pha_session';
export const REMEMBER_SESSION_COOKIE = 'gia_pha_remember';
const SESSION_SECONDS = 60 * 60 * 12;
const REMEMBER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

export const SYSTEM_PERMISSIONS = ['manage_accounts', 'project_name', 'generations', 'legends', 'menus', 'notifications'] as const;
export type SystemPermission = typeof SYSTEM_PERMISSIONS[number];
export type InternalUser = { id: string; displayName: string; username: string; role: 'super_admin' | 'member'; permissions: SystemPermission[] };

export async function getInternalUser(): Promise<InternalUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    await ensureAuthSchema();
    const tokenHash = await sha256(token);
    const row = await getDatabase().prepare(`SELECT users.id, users.full_name, users.username, users.role, users.permissions
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.active = 1`).bind(tokenHash, Date.now()).first<{ id: string; full_name: string; username: string; role: 'super_admin' | 'member'; permissions: string }>();
    if (!row) return null;
    let permissions: SystemPermission[] = [];
    try { permissions = JSON.parse(row.permissions); } catch { permissions = []; }
    return { id: row.id, displayName: row.full_name, username: row.username, role: row.role, permissions };
  } catch { return null; }
}

export function hasPermission(user: InternalUser, permission: SystemPermission) { return user.role === 'super_admin' || user.permissions.includes(permission); }

export function sessionCookieOptions(remember = false) {
  const maxAge = remember ? REMEMBER_SESSION_SECONDS : SESSION_SECONDS;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(remember ? { maxAge } : {}),
  };
}

export async function createSession(userId: string, remember = false) {
  const token = randomHex(32);
  const now = Date.now();
  const sessionSeconds = remember ? REMEMBER_SESSION_SECONDS : SESSION_SECONDS;
  await getDatabase().prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now + sessionSeconds * 1000, now).run();
  return { token, remember };
}

export async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PASSWORD_ITERATIONS }, key, 256);
  return toHex(new Uint8Array(bits));
}

export function randomHex(bytes: number) { return toHex(crypto.getRandomValues(new Uint8Array(bytes))); }
export function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
export async function sha256(value: string) { return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
function toHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function fromHex(hex: string) { return new Uint8Array(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []); }
