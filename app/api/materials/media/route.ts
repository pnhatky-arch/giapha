import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { getFamilyDataMode } from '@/lib/family-data-mode';
import {
  deleteMaterialMediaRecord,
  getMaterialMediaMeta,
  isMaterialMediaKey,
  listMaterialMedia,
  parseMaterialMediaKey,
  putMaterialMedia,
  readMaterialMediaBytes,
} from '@/lib/material-media';
import { sampleMaterialMedia } from '@/lib/sample-fixtures';

function parseRange(header: string | null, size: number) {
  if (!header || size <= 0) return null;
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
  return { start, end };
}

async function materialExists(itemId: string, sampleMode: boolean) {
  const scope = sampleMode ? "id LIKE 'sample-%'" : "id NOT LIKE 'sample-%'";
  const row = await getDatabase().prepare(`SELECT id FROM material_items WHERE id = ? AND ${scope}`)
    .bind(itemId).first<{ id: string }>();
  return Boolean(row?.id);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key) {
    if (!isMaterialMediaKey(key)) return new Response('Not found', { status: 404 });
    const meta = await getMaterialMediaMeta(key);
    if (!meta) return new Response('Not found', { status: 404 });
    const range = parseRange(request.headers.get('range'), meta.size);
    const payload = await readMaterialMediaBytes(key, range?.start ?? 0, range?.end);
    if (!payload) return new Response('Not found', { status: 404 });

    const headers = new Headers();
    headers.set('Content-Type', meta.type || 'application/octet-stream');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(meta.name)}`);
    headers.set('Content-Length', String(payload.bytes.byteLength));
    if (range) {
      headers.set('Content-Range', `bytes ${payload.start}-${payload.end}/${meta.size}`);
      return new Response(payload.bytes, { status: 206, headers });
    }
    return new Response(payload.bytes, { headers });
  }

  const itemId = url.searchParams.get('itemId')?.trim() || undefined;
  const sampleMode = (await getFamilyDataMode()) === 'sample';
  const builtIn = sampleMode
    ? sampleMaterialMedia.filter((attachment) => !itemId || attachment.itemId === itemId)
    : [];

  try {
    const stored = await listMaterialMedia(itemId);
    return NextResponse.json(
      { media: [...builtIn, ...stored], storageAvailable: true, storage: 'd1-chunked' },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json(
      { message: 'Không thể tải ảnh/video lúc này.', media: builtIn, storageAvailable: false },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để thêm ảnh/video.' }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ message: 'Dữ liệu tải lên không hợp lệ.' }, { status: 400 }); }
  const itemId = String(form.get('itemId') ?? '').trim();
  const file = form.get('file');
  const sampleMode = (await getFamilyDataMode()) === 'sample';
  if (!itemId || !(await materialExists(itemId, sampleMode))) return NextResponse.json({ message: 'Tư liệu không còn tồn tại trong bộ dữ liệu hiện tại.' }, { status: 404 });
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ message: 'Chưa chọn ảnh hoặc video.' }, { status: 400 });
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return NextResponse.json({ message: 'Chỉ hỗ trợ tệp hình ảnh hoặc video.' }, { status: 400 });
  if (file.type === 'image/svg+xml') return NextResponse.json({ message: 'Không hỗ trợ SVG tải lên. Hãy dùng PNG, JPG, WEBP hoặc ảnh từ máy.' }, { status: 400 });

  try {
    const media = await putMaterialMedia({ itemId, file, uploadedBy: user.username, updatedById: user.id });
    await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Thêm media tư liệu', entity: 'Tư liệu gia phả', details: `Đã thêm “${media.name}” vào tư liệu ${itemId}` });
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Material media upload failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ message: 'Không thể lưu ảnh/video vào D1 lúc này.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ để xóa ảnh/video.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { key?: unknown; itemId?: unknown } | null;
  if (!body || typeof body.key !== 'string' || typeof body.itemId !== 'string') return NextResponse.json({ message: 'Thiếu ảnh/video cần xóa.' }, { status: 400 });
  if (body.key.startsWith('sample-static/')) return NextResponse.json({ message: 'Ảnh minh họa tích hợp của dữ liệu mẫu không thể xóa.' }, { status: 409 });

  const parsed = parseMaterialMediaKey(body.key);
  if (!parsed || parsed.itemId !== body.itemId) return NextResponse.json({ message: 'Ảnh/video không hợp lệ.' }, { status: 400 });
  const meta = await getMaterialMediaMeta(body.key);
  if (!meta) return NextResponse.json({ message: 'Không tìm thấy ảnh/video.' }, { status: 404 });

  try {
    await deleteMaterialMediaRecord(body.key);
    await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa media tư liệu', entity: 'Tư liệu gia phả', details: `Đã xóa “${meta.name}” khỏi tư liệu ${body.itemId}` });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: 'Không thể xóa ảnh/video.' }, { status: 500 });
  }
}
