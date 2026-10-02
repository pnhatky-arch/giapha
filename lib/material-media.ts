import { env } from 'cloudflare:workers';

export const MATERIAL_MEDIA_PREFIX = 'materials/';

export function getMaterialMediaBucket(): R2Bucket {
  const bucket = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!bucket) throw new Error('R2 binding MEDIA is unavailable');
  return bucket;
}

export function materialMediaPrefix(itemId: string) {
  return `${MATERIAL_MEDIA_PREFIX}${itemId}/`;
}

export function isMaterialMediaKey(key: string) {
  return key.startsWith(MATERIAL_MEDIA_PREFIX) && !key.includes('..');
}

export async function listMaterialMediaKeys(itemId: string) {
  const bucket = getMaterialMediaBucket();
  const prefix = materialMediaPrefix(itemId);
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    keys.push(...page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

export async function deleteMaterialMedia(itemIds: string[]) {
  if (!itemIds.length) return;
  const bucket = getMaterialMediaBucket();
  for (const itemId of itemIds) {
    const keys = await listMaterialMediaKeys(itemId);
    for (let index = 0; index < keys.length; index += 1000) {
      const chunk = keys.slice(index, index + 1000);
      if (chunk.length) await bucket.delete(chunk);
    }
  }
}
