import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { getMaterialMediaBucket, isMaterialMediaKey, MATERIAL_MEDIA_PREFIX, materialMediaPrefix } from '@/lib/material-media';

type MediaRecord = {
  key: string;
  itemId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  uploadedBy: string;
  url: string;
};

function cleanFileName(value: string) {
  const name = value.trim().slice(0, 180) || 'media';
  return name.replace(/[\\/\u0000-\u001f\u007f]+/g, '-');
}

function mediaUrl(key: string) {
  return `/api/materials/media?key=${encodeURIComponent(key)}`;
}

function itemIdFromKey(key: string) {
  if (!key.startsWith(MATERIAL_MEDIA_PREFIX)) return '';
  return key.slice(MATERIAL_MEDIA_PREFIX.length).split('/')[0] ?? '';
}

function parseRange(header: string | null, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : NaN;
  let end = match[2] ? Number(match[2]) : NaN;
  if (Number.isNaN(start) && Number.isNaN(end)) return null;
  if (Number.isNaN(start)) {
    const suffix = Math.max(0, end);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    end = Number.isNaN(end) ? size - 1 : Math.min(end, size - 1);
  }
  if (start < 0 || start >= size || end < start) return null;
  return { offset: start, length: end - start + 1, start, end };
}

async function materialExists(itemId: string) {
  const row = await getDatabase().prepare('SELECT id FROM material_items WHERE id = ?').bind(itemId).first<{ id: string }>();
  return Boolean(row?.id);
}

async function listMedia(itemId?: string) {
  const bucket = getMaterialMediaBucket();
  const prefix = itemId ? materialMediaPrefix(itemId) : MATERIAL_MEDIA_PREFIX;
  const records: MediaRecord[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const listed of page.objects) {
      const head = await bucket.head(listed.key);
      if (!head) continue;
      const ownerItemId = itemIdFromKey(listed.key);
      const type = head.httpMetadata?.contentType ?? head.customMetadata?.type ?? 'application/octet-stream';
      records.push({
        key: listed.key,
        itemId: ownerItemId,
        name: head.customMetadata?.name ?? listed.key.split('/').at(-1) ?? 'media',
        type,
        size: head.size,
        uploadedAt: Number(head.customMetadata?.uploadedAt ?? head.uploaded.getTime()),
        uploadedBy: head.customMetadata?.uploadedBy ?? '',
        url: mediaUrl(listed.key),
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  records.sort((left, right) => left.uploadedAt - right.uploadedAt);
  return records;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key) {
      if (!isMaterialMediaKey(key)) return new Response('Not found', { status: 404 });
      const bucket = getMaterialMediaBucket();
      const head = await bucket.head(key);
      if (!head) return new Response('Not found', { status: 404 });
      const range = parseRange(request.headers.get('range'), head.size);
      const object = await bucket.get(key, range ? { range: { offset: range.offset, length: range.length } } : undefined);
      if (!object) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('ETag', object.httpEtag);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'private, max-age=3600');
      headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(head.customMetadata?.name ?? 'media')}`);
      if (range) {
        headers.set('Content-Range', `bytes ${range.start}-${range.end}/${head.size}`);
        headers.set('Content-Length', String(range.length));
        return new Response(object.body, { status: 206, headers });
      }
      headers.set('Content-Length', String(head.size));
      return new Response(object.body, { headers });
    }

    const itemId = url.searchParams.get('itemId')?.trim() || undefined;
    return NextResponse.json({ media: await listMedia(itemId) }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('MEDIA')
      ? 'Kho ảnh/video R2 chưa được cấu hình.'
      : 'Không thể tải ảnh/video lúc này.';
    return NextResponse.json({ message, media: [] }, { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để thêm ảnh/video.' }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ message: 'Dữ liệu tải lên không hợp lệ.' }, { status: 400 }); }
  const itemId = String(form.get('itemId') ?? '').trim();
  const file = form.get('file');
  if (!itemId || !(await materialExists(itemId))) return NextResponse.json({ message: 'Tư liệu không còn tồn tại.' }, { status: 404 });
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ message: 'Chưa chọn ảnh hoặc video.' }, { status: 400 });
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return NextResponse.json({ message: 'Chỉ hỗ trợ tệp hình ảnh hoặc video.' }, { status: 400 });

  try {
    const bucket = getMaterialMediaBucket();
    const name = cleanFileName(file.name);
    const key = `${materialMediaPrefix(itemId)}${crypto.randomUUID()}-${name}`;
    const uploadedAt = Date.now();
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream', cacheControl: 'private, max-age=31536000' },
      customMetadata: { name, type: file.type || 'application/octet-stream', uploadedAt: String(uploadedAt), uploadedBy: user.username },
    });
    await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Thêm media tư liệu', entity: 'Tư liệu gia phả', details: `Đã thêm “${name}” vào tư liệu ${itemId}` });
    return NextResponse.json({ media: { key, itemId, name, type: file.type, size: file.size, uploadedAt, uploadedBy: user.username, url: mediaUrl(key) } });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('MEDIA')
      ? 'Kho ảnh/video R2 chưa được cấu hình.'
      : 'Không thể tải ảnh/video lên.';
    return NextResponse.json({ message }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để xóa ảnh/video.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { key?: unknown; itemId?: unknown } | null;
  if (!body || typeof body.key !== 'string' || typeof body.itemId !== 'string') return NextResponse.json({ message: 'Thiếu ảnh/video cần xóa.' }, { status: 400 });
  const key = body.key;
  const itemId = body.itemId;
  if (!isMaterialMediaKey(key) || !key.startsWith(materialMediaPrefix(itemId))) return NextResponse.json({ message: 'Ảnh/video không hợp lệ.' }, { status: 400 });
  try {
    const bucket = getMaterialMediaBucket();
    const head = await bucket.head(key);
    if (!head) return NextResponse.json({ message: 'Không tìm thấy ảnh/video.' }, { status: 404 });
    await bucket.delete(key);
    await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa media tư liệu', entity: 'Tư liệu gia phả', details: `Đã xóa “${head.customMetadata?.name ?? key}” khỏi tư liệu ${itemId}` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('MEDIA')
      ? 'Kho ảnh/video R2 chưa được cấu hình.'
      : 'Không thể xóa ảnh/video.';
    return NextResponse.json({ message }, { status: 503 });
  }
}
