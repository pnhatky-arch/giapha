import { NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import { supportedLanguages, type Language } from '@/lib/i18n';
import { DEFAULT_LOGIN_NOTICE, normalizeLoginNotice } from '@/lib/login-notice';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [noticeRow, bannerRow, languagesRow] = await Promise.all([
      getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').bind('login_notice').first<{ value: string }>(),
      getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').bind('show_brand_banner').first<{ value: string }>(),
      getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?').bind('enabled_languages').first<{ value: string }>(),
    ]);
    const value = noticeRow?.value ? JSON.parse(noticeRow.value) : DEFAULT_LOGIN_NOTICE;
    let showBrandBanner = true;
    try { if (bannerRow?.value) showBrandBanner = JSON.parse(bannerRow.value) === true; } catch { /* keep default */ }
    let configuredLanguages: unknown[] = [];
    try { if (languagesRow?.value) configuredLanguages = JSON.parse(languagesRow.value); } catch { /* use defaults */ }
    const enabledLanguages = supportedLanguages.filter((language) => configuredLanguages.includes(language));
    const normalizedLanguages: Language[] = enabledLanguages.length && enabledLanguages.includes('vi') ? enabledLanguages : [...supportedLanguages];
    return NextResponse.json({ notice: normalizeLoginNotice(value), showBrandBanner, enabledLanguages: normalizedLanguages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ notice: DEFAULT_LOGIN_NOTICE, showBrandBanner: true, enabledLanguages: supportedLanguages }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
