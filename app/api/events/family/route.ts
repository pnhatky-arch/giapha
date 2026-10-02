import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';

const SETTINGS_KEY = 'family_work_events';
const MAX_EVENTS = 150;

type FamilyWorkEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  note: string;
  repeatYearly: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isStoredEvent(value: unknown): value is FamilyWorkEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Partial<FamilyWorkEvent>;
  return typeof event.id === 'string'
    && typeof event.title === 'string'
    && isValidIsoDate(event.date)
    && typeof event.location === 'string'
    && typeof event.note === 'string'
    && typeof event.repeatYearly === 'boolean'
    && typeof event.createdAt === 'number'
    && typeof event.updatedAt === 'number'
    && typeof event.createdBy === 'string';
}

async function readEvents(): Promise<FamilyWorkEvent[]> {
  const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').bind(SETTINGS_KEY).first<{ value: string }>();
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredEvent).slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

async function saveEvents(events: FamilyWorkEvent[], userId: string) {
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(SETTINGS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)), now, userId).run();
}

function validateInput(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Dữ liệu Việc họ không hợp lệ.' as const };
  const input = body as Record<string, unknown>;
  const title = cleanText(input.title, 120);
  if (!title) return { error: 'Mời nhập tên Việc họ.' as const };
  if (!isValidIsoDate(input.date)) return { error: 'Mời chọn ngày Việc họ hợp lệ.' as const };
  return {
    value: {
      title,
      date: input.date,
      location: cleanText(input.location, 160),
      note: cleanText(input.note, 600),
      repeatYearly: input.repeatYearly === true,
    },
  };
}

export async function GET() {
  try {
    const user = await getInternalUser();
    const events = await readEvents();
    return NextResponse.json({ events, canEdit: Boolean(user) }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ events: [], canEdit: false }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }
  const checked = validateInput(body);
  if ('error' in checked) return NextResponse.json({ message: checked.error }, { status: 400 });
  const events = await readEvents();
  if (events.length >= MAX_EVENTS) return NextResponse.json({ message: 'Danh sách Việc họ đã đạt giới hạn.' }, { status: 409 });
  const now = Date.now();
  const event: FamilyWorkEvent = {
    id: crypto.randomUUID(),
    ...checked.value,
    createdAt: now,
    updatedAt: now,
    createdBy: user.username,
  };
  events.push(event);
  await saveEvents(events, user.id);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Thêm Việc họ', entity: 'Sự kiện', details: `Đã thêm ${event.title} ngày ${event.date}` });
  return NextResponse.json({ ok: true, event });
}

export async function PUT(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as { id?: unknown }).id !== 'string') {
    return NextResponse.json({ message: 'Thiếu mã Việc họ.' }, { status: 400 });
  }
  const checked = validateInput(body);
  if ('error' in checked) return NextResponse.json({ message: checked.error }, { status: 400 });
  const id = (body as { id: string }).id;
  const events = await readEvents();
  const index = events.findIndex((event) => event.id === id);
  if (index < 0) return NextResponse.json({ message: 'Không tìm thấy Việc họ.' }, { status: 404 });
  events[index] = { ...events[index], ...checked.value, updatedAt: Date.now() };
  await saveEvents(events, user.id);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Sửa Việc họ', entity: 'Sự kiện', details: `Đã sửa ${events[index].title}` });
  return NextResponse.json({ ok: true, event: events[index] });
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ.' }, { status: 401 });
  let body: { id?: unknown };
  try { body = await request.json() as { id?: unknown }; } catch { return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }
  if (typeof body.id !== 'string') return NextResponse.json({ message: 'Thiếu mã Việc họ.' }, { status: 400 });
  const events = await readEvents();
  const existing = events.find((event) => event.id === body.id);
  if (!existing) return NextResponse.json({ message: 'Không tìm thấy Việc họ.' }, { status: 404 });
  await saveEvents(events.filter((event) => event.id !== body.id), user.id);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa Việc họ', entity: 'Sự kiện', details: `Đã xóa ${existing.title}` });
  return NextResponse.json({ ok: true });
}
