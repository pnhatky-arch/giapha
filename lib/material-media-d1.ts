import { getDatabase } from '@/db';

export const MATERIAL_MEDIA_D1_PREFIX = 'material_media';
export const MATERIAL_MEDIA_MAX_BYTES = 20 * 1024 * 1024;
const CHUNK_BYTES = 48 * 1024;
const BATCH_SIZE = 60;

export type MaterialMediaScope = 'sample' | 'official';
export type StoredMaterialMediaMeta = {
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  uploadedAt: number;
  uploadedBy: string;
};

export type MaterialMediaRecord = StoredMaterialMediaMeta & {
  key: string;
  itemId: string;
  mediaId: string;
  url: string;
};

function scopeName(sampleMode: boolean): MaterialMediaScope {
  return sampleMode ? 'sample' : 'official';
}

function safePart(value: string) {
  return /^[A-Za-z0-9._-]{1,220}$/.test(value);
}

function mediaPrefix(scope: MaterialMediaScope, itemId: string, mediaId?: string) {
  return `${MATERIAL_MEDIA_D1_PREFIX}:${scope}:${itemId}:${mediaId ? `${mediaId}:` : ''}`;
}

function metaKey(scope: MaterialMediaScope, itemId: string, mediaId: string) {
  return `${mediaPrefix(scope, itemId, mediaId)}meta`;
}

function chunkKey(scope: MaterialMediaScope, itemId: string, mediaId: string, index: number) {
  return `${mediaPrefix(scope, itemId, mediaId)}chunk:${String(index).padStart(6, '0')}`;
}

export function parseMaterialMediaKey(key: string) {
  const parts = key.split(':');
  if (parts.length !== 5 || parts[0] !== MATERIAL_MEDIA_D1_PREFIX || (parts[1] !== 'sample' && parts[1] !== 'official') || parts[4] !== 'meta') return null;
  const [, scope, itemId, mediaId] = parts;
  if (!safePart(itemId) || !safePart(mediaId)) return null;
  return { scope: scope as MaterialMediaScope, itemId, mediaId };
}

function cleanFileName(value: string) {
  return (value.trim().slice(0, 180) || 'media').replace(/[\\/\u0000-\u001f\u007f]+/g, '-');
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function mediaUrl(key: string) {
  return `/api/materials/media?key=${encodeURIComponent(key)}`;
}

async function runBatched(statements: D1PreparedStatement[]) {
  const db = getDatabase();
  for (let index = 0; index < statements.length; index += BATCH_SIZE) {
    await db.batch(statements.slice(index, index + BATCH_SIZE));
  }
}

export async function saveMaterialMedia(input: {
  sampleMode: boolean;
  itemId: string;
  file: File;
  userId: string;
  username: string;
}): Promise<MaterialMediaRecord> {
  const { sampleMode, itemId, file, userId, username } = input;
  if (!safePart(itemId)) throw new Error('Mã tư liệu không hợp lệ.');
  if (file.size <= 0 || file.size > MATERIAL_MEDIA_MAX_BYTES) throw new Error('Tệp vượt quá giới hạn lưu trữ.');

  const scope = scopeName(sampleMode);
  const mediaId = crypto.randomUUID();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) chunks.push(bytes.subarray(offset, Math.min(offset + CHUNK_BYTES, bytes.length)));

  const uploadedAt = Date.now();
  const meta: StoredMaterialMediaMeta = {
    name: cleanFileName(file.name),
    type: file.type || 'application/octet-stream',
    size: file.size,
    chunkCount: chunks.length,
    uploadedAt,
    uploadedBy: username,
  };
  const db = getDatabase();
  const statements: D1PreparedStatement[] = [
    db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(metaKey(scope, itemId, mediaId), JSON.stringify(meta), uploadedAt, userId),
    ...chunks.map((chunk, index) => db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(chunkKey(scope, itemId, mediaId, index), bytesToBase64(chunk), uploadedAt, userId)),
  ];

  try {
    await runBatched(statements);
  } catch (error) {
    await db.prepare('DELETE FROM app_settings WHERE key LIKE ?').bind(`${mediaPrefix(scope, itemId, mediaId)}%`).run().catch(() => undefined);
    throw error;
  }

  const key = metaKey(scope, itemId, mediaId);
  return { key, itemId, mediaId, ...meta, url: mediaUrl(key) };
}

export async function listMaterialMedia(sampleMode: boolean, itemId?: string): Promise<MaterialMediaRecord[]> {
  const scope = scopeName(sampleMode);
  if (itemId && !safePart(itemId)) return [];
  const prefix = itemId ? mediaPrefix(scope, itemId) : `${MATERIAL_MEDIA_D1_PREFIX}:${scope}:`;
  const result = await getDatabase().prepare(`SELECT key, value FROM app_settings
    WHERE key LIKE ? AND key LIKE '%:meta' ORDER BY updated_at ASC`).bind(`${prefix}%`).all<{ key: string; value: string }>();
  const records: MaterialMediaRecord[] = [];
  for (const row of result.results) {
    const parsedKey = parseMaterialMediaKey(row.key);
    if (!parsedKey || parsedKey.scope !== scope || (itemId && parsedKey.itemId !== itemId)) continue;
    try {
      const meta = JSON.parse(row.value) as Partial<StoredMaterialMediaMeta>;
      if (typeof meta.name !== 'string' || typeof meta.type !== 'string' || typeof meta.size !== 'number' || typeof meta.chunkCount !== 'number' || typeof meta.uploadedAt !== 'number' || typeof meta.uploadedBy !== 'string') continue;
      records.push({
        key: row.key,
        itemId: parsedKey.itemId,
        mediaId: parsedKey.mediaId,
        name: meta.name,
        type: meta.type,
        size: meta.size,
        chunkCount: meta.chunkCount,
        uploadedAt: meta.uploadedAt,
        uploadedBy: meta.uploadedBy,
        url: mediaUrl(row.key),
      });
    } catch {
      // Ignore malformed legacy rows instead of breaking the whole material library.
    }
  }
  return records;
}

export async function readMaterialMedia(sampleMode: boolean, key: string) {
  const parsed = parseMaterialMediaKey(key);
  const scope = scopeName(sampleMode);
  if (!parsed || parsed.scope !== scope) return null;
  const db = getDatabase();
  const row = await db.prepare('SELECT value FROM app_settings WHERE key = ?').bind(key).first<{ value: string }>();
  if (!row?.value) return null;
  let meta: StoredMaterialMediaMeta;
  try {
    meta = JSON.parse(row.value) as StoredMaterialMediaMeta;
  } catch {
    return null;
  }
  if (!Number.isInteger(meta.chunkCount) || meta.chunkCount < 1 || meta.chunkCount > 1000 || typeof meta.type !== 'string' || typeof meta.name !== 'string') return null;

  const prefix = `${mediaPrefix(scope, parsed.itemId, parsed.mediaId)}chunk:`;
  const chunks = await db.prepare('SELECT value FROM app_settings WHERE key LIKE ? ORDER BY key ASC').bind(`${prefix}%`).all<{ value: string }>();
  if (chunks.results.length !== meta.chunkCount) return null;
  const decoded = chunks.results.map((chunk) => base64ToBytes(chunk.value));
  const size = decoded.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of decoded) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (meta.size !== size) return null;
  return { meta, bytes, itemId: parsed.itemId, mediaId: parsed.mediaId };
}

export async function deleteMaterialMediaKey(sampleMode: boolean, key: string) {
  const parsed = parseMaterialMediaKey(key);
  const scope = scopeName(sampleMode);
  if (!parsed || parsed.scope !== scope) return false;
  await getDatabase().prepare('DELETE FROM app_settings WHERE key LIKE ?').bind(`${mediaPrefix(scope, parsed.itemId, parsed.mediaId)}%`).run();
  return true;
}

export async function deleteMaterialMedia(itemIds: string[]) {
  const db = getDatabase();
  for (const itemId of itemIds) {
    if (!safePart(itemId)) continue;
    const scope: MaterialMediaScope = itemId.startsWith('sample-') ? 'sample' : 'official';
    await db.prepare('DELETE FROM app_settings WHERE key LIKE ?').bind(`${mediaPrefix(scope, itemId)}%`).run();
  }
}

export async function clearMaterialMediaScope(scope: MaterialMediaScope) {
  await getDatabase().prepare('DELETE FROM app_settings WHERE key LIKE ?').bind(`${MATERIAL_MEDIA_D1_PREFIX}:${scope}:%`).run();
}
