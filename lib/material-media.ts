import { getDatabase } from '@/db';

export const MATERIAL_MEDIA_PREFIX = 'material_media_d1:';
export const MATERIAL_MEDIA_CHUNK_BYTES = 96 * 1024;
const WRITE_BATCH_SIZE = 40;

export type MaterialMediaMeta = {
  itemId: string;
  mediaId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  uploadedBy: string;
  chunks: number;
  chunkBytes: number;
};

export type MaterialMediaRecord = MaterialMediaMeta & {
  key: string;
  url: string;
};

function cleanSegment(value: string) {
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{1,220}$/.test(normalized) ? normalized : '';
}

function baseKey(itemId: string, mediaId: string) {
  return `${MATERIAL_MEDIA_PREFIX}${itemId}:${mediaId}`;
}

function metaKey(itemId: string, mediaId: string) {
  return `${baseKey(itemId, mediaId)}:meta`;
}

function chunkKey(itemId: string, mediaId: string, index: number) {
  return `${baseKey(itemId, mediaId)}:chunk:${String(index).padStart(6, '0')}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const block = 0x8000;
  for (let index = 0; index < bytes.length; index += block) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + block, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function materialMediaUrl(key: string) {
  return `/api/materials/media?key=${encodeURIComponent(key)}`;
}

export function parseMaterialMediaKey(key: string) {
  if (!key.startsWith(MATERIAL_MEDIA_PREFIX) || key.includes('..')) return null;
  const rest = key.slice(MATERIAL_MEDIA_PREFIX.length);
  const separator = rest.indexOf(':');
  if (separator < 1) return null;
  const itemId = cleanSegment(rest.slice(0, separator));
  const mediaId = cleanSegment(rest.slice(separator + 1));
  if (!itemId || !mediaId || mediaId.includes(':')) return null;
  return { itemId, mediaId };
}

export function isMaterialMediaKey(key: string) {
  return Boolean(parseMaterialMediaKey(key));
}

function parseMeta(value: string): MaterialMediaMeta | null {
  try {
    const parsed = JSON.parse(value) as Partial<MaterialMediaMeta>;
    if (!parsed || typeof parsed.itemId !== 'string' || typeof parsed.mediaId !== 'string') return null;
    if (typeof parsed.name !== 'string' || typeof parsed.type !== 'string') return null;
    if (typeof parsed.size !== 'number' || parsed.size < 0) return null;
    if (typeof parsed.uploadedAt !== 'number' || typeof parsed.uploadedBy !== 'string') return null;
    if (!Number.isInteger(parsed.chunks) || parsed.chunks! < 1) return null;
    if (!Number.isInteger(parsed.chunkBytes) || parsed.chunkBytes! < 1) return null;
    return parsed as MaterialMediaMeta;
  } catch {
    return null;
  }
}

export async function listMaterialMedia(itemId?: string): Promise<MaterialMediaRecord[]> {
  const db = getDatabase();
  const safeItemId = itemId ? cleanSegment(itemId) : '';
  if (itemId && !safeItemId) return [];
  const pattern = safeItemId
    ? `${MATERIAL_MEDIA_PREFIX}${safeItemId}:*:meta`
    : `${MATERIAL_MEDIA_PREFIX}*:*:meta`;
  const result = await db.prepare('SELECT key, value FROM app_settings WHERE key GLOB ? ORDER BY updated_at ASC')
    .bind(pattern).all<{ key: string; value: string }>();
  return result.results.flatMap((row) => {
    const meta = parseMeta(row.value);
    if (!meta) return [];
    const key = baseKey(meta.itemId, meta.mediaId);
    return [{ ...meta, key, url: materialMediaUrl(key) }];
  });
}

export async function getMaterialMediaMeta(key: string): Promise<MaterialMediaMeta | null> {
  const parsed = parseMaterialMediaKey(key);
  if (!parsed) return null;
  const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?')
    .bind(metaKey(parsed.itemId, parsed.mediaId)).first<{ value: string }>();
  return row?.value ? parseMeta(row.value) : null;
}

export async function putMaterialMedia(input: {
  itemId: string;
  file: File;
  uploadedBy: string;
  updatedById: string;
}) {
  const itemId = cleanSegment(input.itemId);
  if (!itemId) throw new Error('Mã tư liệu không hợp lệ.');
  const mediaId = crypto.randomUUID();
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const chunks = Math.max(1, Math.ceil(bytes.byteLength / MATERIAL_MEDIA_CHUNK_BYTES));
  const now = Date.now();
  const meta: MaterialMediaMeta = {
    itemId,
    mediaId,
    name: input.file.name.trim().slice(0, 180) || 'media',
    type: input.file.type || 'application/octet-stream',
    size: bytes.byteLength,
    uploadedAt: now,
    uploadedBy: input.uploadedBy,
    chunks,
    chunkBytes: MATERIAL_MEDIA_CHUNK_BYTES,
  };
  const db = getDatabase();

  try {
    for (let offset = 0; offset < chunks; offset += WRITE_BATCH_SIZE) {
      const statements = [];
      for (let index = offset; index < Math.min(chunks, offset + WRITE_BATCH_SIZE); index += 1) {
        const start = index * MATERIAL_MEDIA_CHUNK_BYTES;
        const end = Math.min(bytes.byteLength, start + MATERIAL_MEDIA_CHUNK_BYTES);
        const value = bytesToBase64(bytes.subarray(start, end));
        statements.push(db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
          .bind(chunkKey(itemId, mediaId, index), value, now, input.updatedById));
      }
      if (statements.length) await db.batch(statements);
    }
    await db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(metaKey(itemId, mediaId), JSON.stringify(meta), now, input.updatedById).run();
  } catch (error) {
    await db.prepare('DELETE FROM app_settings WHERE key GLOB ?').bind(`${baseKey(itemId, mediaId)}:*`).run().catch(() => undefined);
    throw error;
  }

  const key = baseKey(itemId, mediaId);
  return { ...meta, key, url: materialMediaUrl(key) } satisfies MaterialMediaRecord;
}

export async function readMaterialMediaBytes(key: string, start = 0, end?: number) {
  const parsed = parseMaterialMediaKey(key);
  if (!parsed) return null;
  const meta = await getMaterialMediaMeta(key);
  if (!meta || meta.itemId !== parsed.itemId || meta.mediaId !== parsed.mediaId) return null;
  if (meta.size === 0) return { meta, bytes: new Uint8Array(), start: 0, end: -1 };

  const safeStart = Math.max(0, Math.min(start, meta.size - 1));
  const safeEnd = Math.max(safeStart, Math.min(end ?? meta.size - 1, meta.size - 1));
  const firstChunk = Math.floor(safeStart / meta.chunkBytes);
  const lastChunk = Math.floor(safeEnd / meta.chunkBytes);
  const output = new Uint8Array(safeEnd - safeStart + 1);
  let outputOffset = 0;

  for (let index = firstChunk; index <= lastChunk; index += 1) {
    const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?')
      .bind(chunkKey(parsed.itemId, parsed.mediaId, index)).first<{ value: string }>();
    if (!row?.value) return null;
    const chunk = base64ToBytes(row.value);
    const chunkStart = index * meta.chunkBytes;
    const from = Math.max(safeStart, chunkStart) - chunkStart;
    const to = Math.min(safeEnd + 1, chunkStart + chunk.length) - chunkStart;
    const slice = chunk.subarray(from, to);
    output.set(slice, outputOffset);
    outputOffset += slice.length;
  }

  return { meta, bytes: output, start: safeStart, end: safeEnd };
}

export async function deleteMaterialMediaRecord(key: string) {
  const parsed = parseMaterialMediaKey(key);
  if (!parsed) return false;
  await getDatabase().prepare('DELETE FROM app_settings WHERE key GLOB ?')
    .bind(`${baseKey(parsed.itemId, parsed.mediaId)}:*`).run();
  return true;
}

export async function deleteMaterialMedia(itemIds: string[]) {
  const db = getDatabase();
  for (const rawItemId of itemIds) {
    const itemId = cleanSegment(rawItemId);
    if (!itemId) continue;
    await db.prepare('DELETE FROM app_settings WHERE key GLOB ?')
      .bind(`${MATERIAL_MEDIA_PREFIX}${itemId}:*`).run();
  }
}
