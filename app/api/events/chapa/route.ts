import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { getFamilyDataMode } from '@/lib/family-data-mode';
import { sampleTombSweepingEvents, type SampleTombSweepingEvent } from '@/lib/sample-fixtures';

const OFFICIAL_SETTINGS_KEY = 'tomb_sweeping_events';
const SAMPLE_SETTINGS_KEY = 'sample_tomb_sweeping_events_v1';
const MAX_EVENTS = 100;

type TombSweepingEvent = SampleTombSweepingEvent;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isStoredEvent(value: unknown): value is TombSweepingEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Partial<TombSweepingEvent>;
  return typeof event.id === 'string'
    && isValidIsoDate(event.date)
    && typeof event.location === 'string'
    && typeof event.branch === 'string'
    && typeof event.note === 'string'
    && typeof event.repeatYearly === 'boolean'
    && typeof event.createdAt === 'number'
    && typeof event.updatedAt === 'number'
    && typeof event.createdBy === 'string';
}

function settingsKey(sampleMode: boolean) {
  return sampleMode ? SAMPLE_SETTINGS_KEY : OFFICIAL_SETTINGS_KEY;
}

async function readEvents(sampleMode: boolean): Promise<TombSweepingEvent[]> {
  const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?')
    .bind(settingsKey(sampleMode)).first<{ value: string }>();
  if (!row?.value) return sampleMode ? sampleTombSweepingEvents() : [];
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return sampleMode ? sampleTombSweepingEvents() : [];
    return parsed.filter(isStoredEvent).slice(0, MAX_EVENTS);
  } catch {
    return sampleMode ? sampleTombSweepingEvents() : [];
  }
}

async function saveEvents(events: TombSweepingEvent[], userId: string, sampleMode: boolean) {
  const now = Date.now();
  await getDatabase().prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(settingsKey(sampleMode), JSON.stringify(events.slice(0, MAX_EVENTS)), now, userId).run();
}

function validateInput(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Dữ liệu Chạp mộ không hợp lệ.' as const };
  const input = body as Record<string, unknown>;
  if (!isValidIsoDate(input.date)) return { error: 'Mời chọn ngày Chạp mộ hợp lệ.' as const };
  const location = cleanText(input.location, 120);
  const branch = cleanText(input.branch, 120);
  const note = cleanText(input.note, 500);
  if (!location) return { error: 'Mời nhập địa điểm Chạp mộ.' as const };
  return {
    value: {
      date: input.date,
      location,
      branch,
      note,
      repeatYearly: input.repeatYearly !== false,
    },
  };
}

export async function GET() {
  try {
    const [user, mode] = await Promise.all([getInternalUser(), getFamilyDataMode()]);
    const sampleMode = mode === 'sample';
    const events = await readEvents(sampleMode);
    return NextResponse.json({ events, canEdit: Boolean(user), sampleMode }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
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
  const sampleMode = (await getFamilyDataMode()) === 'sample';
  const events = await readEvents(sampleMode);
  if (events.length >= MAX_EVENTS) return NextResponse.json({ message: 'Lịch Chạp mộ đã đạt giới hạn 100 mục.' }, { status: 409 });
  const now = Date.now();
  const event: TombSweepingEvent = {
    id: sampleMode ? `sample-user-chapa-${crypto.randomUUID()}` : crypto.randomUUID(),
    ...checked.value,
    createdAt: now,
    updatedAt: now,
    createdBy: user.username,
  };
  events.push(event);
  await saveEvents(events, user.id, sampleMode);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Thêm Chạp mộ', entity: 'Sự kiện', details: `Đã thêm lịch Chạp mộ ngày ${event.date} tại ${event.location}` });
  return NextResponse.json({ ok: true, event });
}

export async function PUT(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ.' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as { id?: unknown }).id !== 'string') {
    return NextResponse.json({ message: 'Thiếu mã lịch Chạp mộ.' }, { status: 400 });
  }
  const checked = validateInput(body);
  if ('error' in checked) return NextResponse.json({ message: checked.error }, { status: 400 });
  const sampleMode = (await getFamilyDataMode()) === 'sample';
  const id = (body as { id: string }).id;
  const events = await readEvents(sampleMode);
  const index = events.findIndex((event) => event.id === id);
  if (index < 0) return NextResponse.json({ message: 'Không tìm thấy lịch Chạp mộ.' }, { status: 404 });
  events[index] = { ...events[index], ...checked.value, updatedAt: Date.now() };
  await saveEvents(events, user.id, sampleMode);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Sửa Chạp mộ', entity: 'Sự kiện', details: `Đã sửa lịch Chạp mộ ngày ${events[index].date} tại ${events[index].location}` });
  return NextResponse.json({ ok: true, event: events[index] });
}

export async function DELETE(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập bằng tài khoản nội bộ.' }, { status: 401 });
  let body: { id?: unknown };
  try { body = await request.json() as { id?: unknown }; } catch { return NextResponse.json({ message: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 }); }
  if (typeof body.id !== 'string') return NextResponse.json({ message: 'Thiếu mã lịch Chạp mộ.' }, { status: 400 });
  const sampleMode = (await getFamilyDataMode()) === 'sample';
  const events = await readEvents(sampleMode);
  const existing = events.find((event) => event.id === body.id);
  if (!existing) return NextResponse.json({ message: 'Không tìm thấy lịch Chạp mộ.' }, { status: 404 });
  const next = events.filter((event) => event.id !== body.id);
  await saveEvents(next, user.id, sampleMode);
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Xóa Chạp mộ', entity: 'Sự kiện', details: `Đã xóa lịch Chạp mộ ngày ${existing.date} tại ${existing.location}` });
  return NextResponse.json({ ok: true });
}
