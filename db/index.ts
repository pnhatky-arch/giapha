import { env } from 'cloudflare:workers';

export function getDatabase(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

let defaultAdministratorPromise: Promise<void> | undefined;

export const GENEALOGY_AUDIT_ENTITIES = ['Gia phả', 'Thành viên', 'Sự kiện', 'Tư liệu gia phả'] as const;

export function isGenealogyAuditEntity(entity: string) {
  return (GENEALOGY_AUDIT_ENTITIES as readonly string[]).includes(entity);
}

export async function ensureAuthSchema() {
  // Database structure is managed only by Drizzle migrations during deployment.
  // Keep the one-time administrator seed separate from schema work so a request
  // never attempts DDL against the production D1 database.
  if (!defaultAdministratorPromise) {
    defaultAdministratorPromise = ensureDefaultAdministrator(getDatabase()).catch((error) => {
      defaultAdministratorPromise = undefined;
      throw error;
    });
  }
  await defaultAdministratorPromise;
}

export async function writeAuditLog(entry: { actorId?: string; actorUsername: string; action: string; entity: string; details: string }) {
  if (!isGenealogyAuditEntity(entry.entity) || entry.action === 'Sao lưu dữ liệu') return;
  const db = getDatabase();
  await db.prepare('INSERT INTO audit_logs (id, actor_id, actor_username, action, entity, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), entry.actorId ?? null, entry.actorUsername, entry.action.slice(0, 80), entry.entity.slice(0, 80), entry.details.slice(0, 300), Date.now()).run();
}

const DEFAULT_ADMIN_USERNAME = 'devphamgia';
const DEFAULT_ADMIN_SEED_VERSION = 'default_admin_v2';
const ALL_ADMIN_PERMISSIONS = JSON.stringify(['manage_accounts', 'project_name', 'generations', 'legends', 'menus', 'notifications']);
const PASSWORD_ITERATIONS = 100_000;

async function ensureDefaultAdministrator(db: D1Database) {
  const seeded = await db.prepare('SELECT value FROM app_settings WHERE key = ?').bind(DEFAULT_ADMIN_SEED_VERSION).first();
  if (seeded) {
    await db.prepare(`UPDATE users SET role = 'super_admin', permissions = ?, active = 1 WHERE username = ?`)
      .bind(ALL_ADMIN_PERMISSIONS, DEFAULT_ADMIN_USERNAME).run();
    return;
  }
  const password = (env as unknown as { DEFAULT_ADMIN_PASSWORD?: string }).DEFAULT_ADMIN_PASSWORD;
  if (!password) return;
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const now = Date.now();
  await db.prepare(`INSERT INTO users (id, full_name, username, password_hash, password_salt, role, permissions, active, created_at)
    VALUES (?, ?, ?, ?, ?, 'super_admin', ?, 1, ?)
    ON CONFLICT(username) DO UPDATE SET full_name = excluded.full_name, password_hash = excluded.password_hash,
    password_salt = excluded.password_salt, role = 'super_admin', permissions = excluded.permissions, active = 1`)
    .bind(crypto.randomUUID(), DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_USERNAME, passwordHash, salt, ALL_ADMIN_PERMISSIONS, now).run();
  await db.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, 'complete', ?)
    ON CONFLICT(key) DO UPDATE SET value = 'complete', updated_at = excluded.updated_at`)
    .bind(DEFAULT_ADMIN_SEED_VERSION, now).run();
}

async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PASSWORD_ITERATIONS }, key, 256);
  return toHex(new Uint8Array(bits));
}

function randomHex(bytes: number) { return toHex(crypto.getRandomValues(new Uint8Array(bytes))); }
function toHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function fromHex(hex: string) { return new Uint8Array(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []); }
