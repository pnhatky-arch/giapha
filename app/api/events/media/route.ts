import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { getFamilyDataMode } from '@/lib/family-data-mode';

const MAX_IMAGES_PER_EVENT = 8;
const MAX_IMAGE_BYTES = 900_000;
const PREFIX = 'event_media';

type EventMediaKind = 'family' | 'tomb';
type StoredImage = {
  name: string;
  type: string;
  size: number;
  data: string;
  createdAt: number;
  createdBy: string;
};

function isKind(value: string | null): value is EventMediaKind {
  return value === 'family' || value === 'tomb';
}

function cleanId(value: string | null) {
  const id = value?.trim() ?? '';
  return /^[A-Za-z0-9_-]{1,180}$/.test(id) ? id : '';
}

function cleanName(value: string) {
  return (value.trim().slice(0, 160) || 'image').replace(/[\\/\u0000-\u001f\u007f]+/g, '-');
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

function scope(sampleMode: boolean) {
  return sampleMode ? 'sample' : 'official';
}

function eventPrefix(sampleMode: boolean, kind: EventMediaKind, eventId: string) {
  return `${PREFIX}:${scope(sampleMode)}:${kind}:${eventId}:`;
}

function mediaKey(sampleMode: boolean, kind: EventMediaKind, eventId: string, imageId: string) {
  return `${eventPrefix(sampleMode, kind, eventId)}${imageId}`;
}

function mediaUrl(kind: EventMediaKind, eventId: string, imageId: string) {
  const params = new URLSearchParams({ kind, eventId, imageId });
  return `/api/events/media?${params.toString()}`;
}

async function readStored(key: string): Promise<StoredImage | null> {
  const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').bind(key).first<{ value: string }>();
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<StoredImage>;
    if (typeof parsed.name !== 'string' || typeof parsed.type !== 'string' || typeof parsed.size !== 'number' || typeof parsed.data !== 'string') return null;
    return {
      name: parsed.name,
      type: parsed.type,
      size: parsed.size,
      data: parsed.data,
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : 0,
      createdBy: typeof parsed.createdBy === 'string' ? parsed.createdBy : '',
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  const eventId = cleanId(url.searchParams.get('eventId'));
  const imageId = cleanId(url.searchParams.get('imageId'));
  if (!isKind(kind)) return NextResponse.json({ message: 'Loại sự kiện không hợp lệ.' }, { status: 400 });
  const sampleMode = (await getFamilyDataMode()) === 'sample';

  if (eventId && imageId) {
    const stored = await readStored(mediaKey(sampleMode, kind, eventId, imageId));
    if (!stored) return new Response('Not found', { status: 404 });
    const bytes = base64ToBytes(stored.data);
    return new Response(bytes, {
      headers: {
        'Content-Type': stored.type || 'image/jpeg',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(stored.name)}`,
      },
    });
  }

  const prefix = eventId ? eventPrefix(sampleMode, kind, eventId) : `${PREFIX}:${scope(sampleMode)}:${kind}:`;
  const result = await getDatabase().prepare('SELECT key, value FROM app_settings WHERE key LIKE ? ORDER BY updated_at ASC')
    .bind(`${prefix}%`).all<{ key: string; value: string }>();
  const images = result.results.flatMap((row) => {
    try {
      const stored = JSON.parse(row.value) as StoredImage;
      const parts = row.key.split(':');
      const rowEventId = parts[3] ?? '';
      const rowImageId = parts[4] ?? '';
      if (!rowEventId || !rowImageId || typeof stored.name !== 'string') return [];
      return [{
        id: rowImageId,
        eventId: rowEventId,
        kind,
        name: stored.name,
        type: stored.type,
        size: stored.size,
        createdAt: stored.createdAt,
        createdBy: stored.createdBy,
        url: mediaUrl(kind, rowEventId, rowImageId),
      }];
    } catch {
      return [];
    }
  });
  return NextResponse.json({ images, sampleMode }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập để thêm hình ảnh.' }, { status: 401 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ message: 'Dữ liệu ảnh không hợp lệ.' }, { status: 400 }); }
  const kindValue = String(form.get('kind') ?? '');
  const kind = isKind(kindValue) ? kindValue : null;
  const eventId = cleanId(String(form.get('eventId') ?? ''));
  const file = form.get('file');
  if (!kind || !eventId) return NextResponse.json({ message: 'Thiếu sự kiện cần gắn ảnh.' }, { status: 400 });
  if (!(file instanceof File) || file.size <= 0 || !file.type.startsWith('image/')) return NextResponse.json({ message: 'Chỉ hỗ trợ tệp hình ảnh.' }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ message: 'Ảnh sau khi nén vẫn quá lớn. Vui lòng chọn ảnh khác.' }, { status: 413 });

  const sampleMode = (await getFamilyDataMode()) === 'sample';
  const prefix = eventPrefix(sampleMode, kind, eventId);
  const count = await getDatabase().prepare('SELECT COUNT(*) AS count FROM app_settings WHERE key LIKE ?').bind(`${prefix}%`).first<{ count: number }>();
  if (Number(count?.count ?? 0) >= MAX_IMAGES_PER_EVENT) return NextResponse.json({ message: `Mỗi sự kiện lưu tối đa ${MAX_IMAGES_PER_EVENT} ảnh.` }, { status: 409 });

  const imageId = crypto.randomUUID();
  const now = Date.now();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored: StoredImage = {
    name: cleanName(file.name),
    type: file.type || 'image/jpeg',
    size: file.size,
    data: bytesToBase64(bytes),
    createdAt: now,
    createdBy: user.username,
  };
  const key = mediaKey(sampleMode, kind, eventId, imageId);
  await getDatabase().prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(key, JSON.stringify(stored), now, user.username).run();
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Thêm ảnh sự kiện', entity: 'Sự kiện', details: `Đã thêm “${stored.name}” vào ${kind === 'tomb' ? 'Chạp mộ' : 'Việc họ'} ${eventId}` });
  return NextResponse.json({ image: { id: imageId, eventId, kind, name: stored.name, type: stored.type, size: stored.size, createdAt: now, createdBy: user.username, url: mediaUrl(kind, eventId, imageId) } });
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập để xóa hình ảnh.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { kind?: unknown; eventId?: unknown; imageId?: unknown } | null;
  const kind = typeof body?.kind === 'string' && isKind(body.kind) ? body.kind : null;
  const eventId = cleanId(typeof body?.eventId === 'string' ? body.eventId : '');
  const imageId = cleanId(typeof body?.imageId === 'string' ? body.imageId : '');
  if (!kind || !eventId) return NextResponse.json({ message: 'Thiếu sự kiện cần xóa ảnh.' }, { status: 400 });
  const sampleMode = (await getFamilyDataMode()) === 'sample';
  if (imageId) {
    await getDatabase().prepare('DELETE FROM app_settings WHERE key = ?').bind(mediaKey(sampleMode, kind, eventId, imageId)).run();
  } else {
    await getDatabase().prepare('DELETE FROM app_settings WHERE key LIKE ?').bind(`${eventPrefix(sampleMode, kind, eventId)}%`).run();
  }
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa ảnh sự kiện', entity: 'Sự kiện', details: `Đã xóa ảnh khỏi ${kind === 'tomb' ? 'Chạp mộ' : 'Việc họ'} ${eventId}` });
  return NextResponse.json({ ok: true });
}
