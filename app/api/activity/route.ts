import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/db';
import { getInternalUser } from '@/app/internal-auth';

const activities: Record<string, { action: string; entity: string; details: string }> = {
  backup: { action: 'Sao lưu dữ liệu', entity: 'Thao tác hệ thống', details: 'Đã xuất một bản sao lưu dữ liệu gia phả' },
  restore: { action: 'Phục hồi dữ liệu', entity: 'Thao tác hệ thống', details: 'Đã phục hồi dữ liệu từ tệp sao lưu' },
  delete_local: { action: 'Xóa dữ liệu', entity: 'Thao tác hệ thống', details: 'Đã xóa dữ liệu gia phả khỏi thiết bị đang dùng' },
};

export async function POST(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { type?: string } | null;
  const activity = body?.type ? activities[body.type] : undefined;
  if (!activity) return NextResponse.json({ message: 'Hoạt động không hợp lệ.' }, { status: 400 });
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, ...activity });
  return NextResponse.json({ ok: true });
}
