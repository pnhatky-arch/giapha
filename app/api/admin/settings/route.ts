import { NextResponse } from 'next/server';
import { getDatabase, writeAuditLog } from '@/db';
import { getInternalUser, hasPermission, type SystemPermission } from '@/app/internal-auth';
import { supportedLanguages, type Language } from '@/lib/i18n';
import { getFamilyDataMode } from '@/lib/family-data-mode';
import { DEFAULT_LOGIN_NOTICE, isValidLoginNotice, normalizeLoginNotice } from '@/lib/login-notice';

const permissionByKey: Partial<Record<string, SystemPermission>> = { project_name: 'project_name', generations: 'generations', legends: 'legends', menu_tabs: 'menus', login_notice: 'notifications' };
const superAdminKeys = new Set(['enabled_languages']);
const editableKeys = new Set([...Object.keys(permissionByKey), 'show_brand_banner', ...superAdminKeys]);
const defaults: Record<string, unknown> = {
  project_name: 'GIA PHẢ HỌ PHẠM VĂN',
  show_brand_banner: true,
  generations: ['Đời thứ 1', 'Đời thứ 2', 'Đời thứ 3', 'Đời thứ 4', 'Đời thứ 5', 'Đời thứ 6'],
  legends: ['Thủy tổ', 'Thành viên dòng họ'],
  menu_tabs: ['Tổng quan', 'Cây gia phả', 'Thành viên', 'Sự kiện', 'Tư liệu', 'Cài đặt'],
  login_notice: DEFAULT_LOGIN_NOTICE,
  enabled_languages: supportedLanguages,
};

export async function GET() {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập.' }, { status: 401 });
  const [rows, dataMode] = await Promise.all([
    getDatabase().prepare('SELECT key, value FROM app_settings').all<{ key: string; value: string }>(),
    getFamilyDataMode(),
  ]);
  const settings = { ...defaults };
  for (const row of rows.results) { try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; } }
  if (['Gia phả họ Phạm', 'GIA PHẢ HỌ PHẠM', 'THE PHAM GENEALOGY: GIA PHẢ HỌ PHẠM'].includes(String(settings.project_name))) settings.project_name = defaults.project_name;
  settings.login_notice = normalizeLoginNotice(settings.login_notice);
  const configuredLanguages = Array.isArray(settings.enabled_languages) ? settings.enabled_languages : [];
  const enabledLanguages = supportedLanguages.filter((language) => configuredLanguages.includes(language));
  settings.enabled_languages = enabledLanguages.length && enabledLanguages.includes('vi') ? enabledLanguages : [...supportedLanguages];
  if (dataMode === 'sample') {
    const configuredGenerations = Array.isArray(settings.generations) ? settings.generations.filter((value): value is string => typeof value === 'string') : [];
    settings.generations = Array.from({ length: 6 }, (_, index) => configuredGenerations[index] ?? `Đời thứ ${index + 1}`);
  }
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await getInternalUser();
  if (!user) return NextResponse.json({ message: 'Cần đăng nhập.' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const entries = Object.entries(body).filter(([key]) => editableKeys.has(key));
  if (!entries.length) return NextResponse.json({ message: 'Không có thay đổi hợp lệ.' }, { status: 400 });
  for (const [key, value] of entries) {
    if (superAdminKeys.has(key) && user.role !== 'super_admin') return NextResponse.json({ message: 'Chỉ quản trị cấp cao có thể thay đổi ngôn ngữ hệ thống.' }, { status: 403 });
    const requiredPermission = permissionByKey[key];
    if (requiredPermission && !hasPermission(user, requiredPermission)) return NextResponse.json({ message: `Bạn chưa được cấp quyền thay đổi mục ${key}.` }, { status: 403 });
    if (key === 'project_name' && (typeof value !== 'string' || value.trim().length < 2 || value.length > 80)) return NextResponse.json({ message: 'Tên dự án không hợp lệ.' }, { status: 400 });
    if (key === 'show_brand_banner' && typeof value !== 'boolean') return NextResponse.json({ message: 'Trạng thái banner không hợp lệ.' }, { status: 400 });
    if (key === 'login_notice' && !isValidLoginNotice(value)) return NextResponse.json({ message: 'Nội dung thông báo không hợp lệ.' }, { status: 400 });
    if (key === 'enabled_languages' && (!Array.isArray(value) || value.length < 1 || value.length > supportedLanguages.length || !value.includes('vi') || new Set(value).size !== value.length || value.some((language) => typeof language !== 'string' || !supportedLanguages.includes(language as Language)))) return NextResponse.json({ message: 'Danh sách ngôn ngữ không hợp lệ.' }, { status: 400 });
    if (key !== 'project_name' && key !== 'show_brand_banner' && key !== 'login_notice' && (!Array.isArray(value) || value.length < 1 || value.length > 20 || value.some((item) => typeof item !== 'string' || item.trim().length < 1 || item.length > 50))) return NextResponse.json({ message: `Danh sách ${key} không hợp lệ.` }, { status: 400 });
    if (key === 'menu_tabs' && Array.isArray(value) && (!value.includes('Cây gia phả') || !value.includes('Thành viên') || !value.includes('Cài đặt'))) return NextResponse.json({ message: 'Menu phải giữ lại tab Cây gia phả, Thành viên và Cài đặt.' }, { status: 400 });
  }
  const normalizedEntries = entries.map(([key, value]) => [key, key === 'login_notice' ? normalizeLoginNotice(value) : typeof value === 'string' ? value.trim() : value] as const);
  const db = getDatabase();
  await db.batch(normalizedEntries.map(([key, value]) => db.prepare(`INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .bind(key, JSON.stringify(value), Date.now(), user.id)));
  await writeAuditLog({ actorId: user.id, actorUsername: user.username, action: 'Sửa cài đặt', entity: 'Hệ thống', details: `Đã cập nhật: ${normalizedEntries.map(([key]) => key).join(', ')}` });
  return NextResponse.json({ ok: true });
}
