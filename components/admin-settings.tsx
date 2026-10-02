'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BellRing, DatabaseBackup, Download, History, KeyRound, Languages, PencilLine, Plus, RotateCcw, Save, ShieldCheck, Trash2, Upload, UserCog, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { SAMPLE_MEMBER_COUNT, type FamilyDataMode } from '@/lib/family-tree';
import { languageNames, supportedLanguages, type Language } from '@/lib/i18n';
import type { LoginNoticeSettings } from '@/lib/login-notice';

type Permission = 'manage_accounts' | 'project_name' | 'generations' | 'legends' | 'menus' | 'notifications';
type CurrentUser = { displayName: string; username: string; role: 'super_admin' | 'member'; permissions: Permission[] };
type SettingsData = { project_name: string; show_brand_banner: boolean; generations: string[]; legends: string[]; menu_tabs: string[]; login_notice: LoginNoticeSettings; enabled_languages: Language[] };
type Account = { id: string; full_name: string; username: string; role: 'super_admin' | 'member'; permissions: string; active: number };
type AuditLog = { id: string; actor_username: string; action: string; entity: string; details: string; created_at: number };

const permissionLabels: Record<Permission, string> = {
  manage_accounts: 'Quản lý tài khoản', project_name: 'Đổi tên dự án', generations: 'Sửa các đời', legends: 'Sửa chú thích', menus: 'Sửa menu/tab', notifications: 'Quản lý thông báo',
};

export default function AdminSettings({ language, user, settings, onSettings, dataAvailable, dataMode, memberCount, generationCount, onBackup, onRestore, onDelete, onStartOfficial, onRestoreSample }: {
  language: Language;
  user: CurrentUser; settings: SettingsData; onSettings: (settings: SettingsData) => void;
  dataAvailable: boolean; dataMode: FamilyDataMode; memberCount: number; generationCount: number; onBackup: () => void; onRestore: (data: unknown) => Promise<void>; onDelete: () => Promise<void>; onStartOfficial: () => Promise<void>; onRestoreSample: () => Promise<void>;
}) {
  const can = useCallback((permission: Permission) => user.role === 'super_admin' || user.permissions.includes(permission), [user]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<Account | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user.role !== 'super_admin') return;
    void fetch('/api/admin/accounts').then((res) => res.json() as Promise<{ accounts?: Account[] }>).then((data) => setAccounts(data.accounts ?? [])).catch(() => setError('Không tải được danh sách tài khoản.'));
  }, [user.role]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/audit-logs');
      const data = await response.json() as { logs?: AuditLog[]; message?: string };
      if (!response.ok) throw new Error(data.message);
      setAuditLogs(data.logs ?? []);
    } catch { setError('Không tải được lịch sử chỉnh sửa gia phả.'); }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void loadAuditLogs(); });
    return () => window.cancelAnimationFrame(frame);
  }, [loadAuditLogs]);

  const saveAuditLog = async (log: AuditLog) => {
    const response = await fetch('/api/admin/audit-logs', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: log.id, details: editingDetails }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setError(data.message ?? 'Không thể sửa bản ghi.'); return; }
    setEditingLogId(null); setEditingDetails(''); setMessage('Đã cập nhật bản ghi lịch sử gia phả.'); await loadAuditLogs();
  };

  const deleteAuditLog = async (log: AuditLog) => {
    const response = await fetch('/api/admin/audit-logs', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: log.id }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setError(data.message ?? 'Không thể xóa bản ghi.'); return; }
    setMessage('Đã xóa bản ghi lịch sử gia phả.'); await loadAuditLogs();
  };

  const clearAuditLogs = async () => {
    const response = await fetch('/api/admin/audit-logs', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clearAll: true }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setError(data.message ?? 'Không thể xóa toàn bộ lịch sử gia phả.'); return; }
    setAuditLogs([]); setEditingLogId(null); setEditingDetails(''); setMessage('Đã xóa toàn bộ lịch sử chỉnh sửa gia phả.'); setError('');
  };

  const saveSettings = async (changes: Partial<SettingsData>) => {
    setMessage(''); setError('');
    const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changes) });
    const result = await response.json() as { message?: string };
    if (!response.ok) { setError(result.message ?? 'Không thể lưu cài đặt.'); return; }
    onSettings({ ...settings, ...changes }); setMessage('Đã lưu thay đổi hệ thống.');
  };

  const restoreFile = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !['Gia phả họ Phạm','THE PHAM GENEALOGY: GIA PHẢ HỌ PHẠM','GIA PHẢ HỌ PHẠM','GIA PHẢ HỌ PHẠM VĂN'].includes(data.application) || !data.family) throw new Error();
      await onRestore(data); setMessage('Đã phục hồi dữ liệu từ bản sao lưu.'); setError('');
    } catch { setError('Tệp sao lưu không hợp lệ hoặc đã bị hỏng.'); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteFamily = async () => {
    try {
      await onDelete();
      setMessage('Đã xóa toàn bộ dữ liệu gia phả khỏi hệ thống.');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xóa dữ liệu.');
    }
  };

  const startOfficialData = async () => {
    try {
      await onStartOfficial();
      setMessage('Đã xóa dữ liệu thử nghiệm và tạo khung để nhập dữ liệu chính thức.');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể bắt đầu dữ liệu chính thức.');
    }
  };

  const restoreSampleData = async () => {
    try {
      await onRestoreSample();
      setMessage(`Đã khôi phục dữ liệu thử nghiệm gồm ${SAMPLE_MEMBER_COUNT} thành viên.`);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể khôi phục dữ liệu thử nghiệm.');
    }
  };

  const updateAccount = async (account: Account, changes: Partial<Account>) => {
    const next = { ...account, ...changes };
    let permissions: string[] = [];
    try { permissions = JSON.parse(next.permissions); } catch { permissions = []; }
    const response = await fetch('/api/admin/accounts', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: next.id, role: next.role, active: Boolean(next.active), permissions }) });
    if (!response.ok) { const result = await response.json() as { message?: string }; setError(result.message ?? 'Không thể cập nhật tài khoản.'); return; }
    setAccounts((items) => items.map((item) => item.id === next.id ? next : item)); setMessage(`Đã cập nhật tài khoản ${next.username}.`); setError('');
  };

  const resetAccountPassword = async () => {
    if (!passwordTarget) return;
    if (resetPassword.length < 8 || resetPassword.length > 128) { setError('Mật khẩu mới cần có từ 8 đến 128 ký tự.'); return; }
    const response = await fetch('/api/admin/accounts', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: passwordTarget.id, resetPassword }) });
    const result = await response.json() as { message?: string };
    if (!response.ok) { setError(result.message ?? 'Không thể đặt lại mật khẩu.'); return; }
    setMessage(`Đã đặt lại mật khẩu cho tài khoản ${passwordTarget.username}.`); setError(''); setResetPassword(''); setPasswordTarget(null);
  };

  const deleteAccount = async (account: Account) => {
    const response = await fetch('/api/admin/accounts', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: account.id }) });
    const result = await response.json() as { message?: string };
    if (!response.ok) { setError(result.message ?? 'Không thể xóa tài khoản.'); return; }
    setAccounts((items) => items.filter((item) => item.id !== account.id)); setMessage(`Đã xóa tài khoản ${account.username}.`); setError('');
  };

  const editList = (key: 'generations' | 'legends' | 'menu_tabs', index: number, value: string) => onSettings({ ...settings, [key]: settings[key].map((item, i) => i === index ? value : item) });
  const removeList = (key: 'generations' | 'legends' | 'menu_tabs', index: number) => onSettings({ ...settings, [key]: settings[key].filter((_, i) => i !== index) });
  const addList = (key: 'generations' | 'legends' | 'menu_tabs', label: string) => onSettings({ ...settings, [key]: [...settings[key], label] });
  const setLanguageEnabled = (languageCode: Language, enabled: boolean) => {
    if (languageCode === 'vi') return;
    const next = new Set(settings.enabled_languages);
    if (enabled) next.add(languageCode); else next.delete(languageCode);
    void saveSettings({ enabled_languages: supportedLanguages.filter((code) => next.has(code)) });
  };

  return <>
    {(message || error) && <output className={`admin-message ${error ? 'error' : ''}`}>{error ? <AlertTriangle /> : <ShieldCheck />}{error || message}</output>}
    <article className="setting-card data-management"><div className="setting-icon"><DatabaseBackup /></div><div className="setting-copy"><h3>Quản lý dữ liệu</h3><p>Sao lưu, phục hồi, xóa trắng hoặc chuyển đổi giữa dữ liệu thử nghiệm và dữ liệu chính thức.</p><div className="setting-meta"><ShieldCheck /><span>{dataAvailable ? `Dữ liệu hiện có: ${memberCount} thành viên · ${generationCount} thế hệ` : 'Hiện chưa có dữ liệu gia phả'} · {dataMode === 'sample' ? `Đang dùng dữ liệu thử nghiệm (${SAMPLE_MEMBER_COUNT} thành viên)` : dataMode === 'official' ? 'Đang dùng dữ liệu chính thức' : 'Dữ liệu đang trống'}</span></div></div>
      <div className="data-actions"><button onClick={onBackup} disabled={!dataAvailable}><Download />Sao lưu</button>{user.role === 'super_admin' && <><button onClick={() => fileRef.current?.click()}><Upload />Phục hồi bản sao lưu</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { void restoreFile(event.target.files?.[0]); }} />
        <AlertDialog><AlertDialogTrigger render={<button className="danger-action" disabled={!dataAvailable}><Trash2 />Xóa dữ liệu</button>} /><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogMedia><Trash2 /></AlertDialogMedia><AlertDialogTitle>Xóa toàn bộ dữ liệu?</AlertDialogTitle><AlertDialogDescription>Thao tác sẽ xóa dữ liệu gia phả trên hệ thống. Hãy tạo bản sao lưu trước khi tiếp tục.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy bỏ</AlertDialogCancel><AlertDialogAction className="confirm-delete" onClick={() => { void deleteFamily(); }}>Xác nhận xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}
      </div>
    <div className="data-mode-inline"><div className="sample-data-title"><DatabaseBackup /><div><span>Chuyển đổi chế độ dữ liệu</span><h3>Dữ liệu thử nghiệm và dữ liệu chính thức</h3><p>Dữ liệu thử nghiệm gồm {SAMPLE_MEMBER_COUNT} thành viên, được chia thành 5 đời để tham khảo bố cục và thông tin hồ sơ.</p></div><em className={`sample-data-status ${dataMode}`}>{dataMode === 'sample' ? 'Đang dùng dữ liệu thử nghiệm' : dataMode === 'official' ? 'Đang dùng dữ liệu chính thức' : 'Dữ liệu đang trống'}</em></div>
      <div className="data-mode-switcher" aria-label="Chế độ dữ liệu hiện tại">
        {user.role === 'super_admin' ? <>
          <AlertDialog><AlertDialogTrigger render={<button type="button" className={`data-mode-option ${dataMode === 'sample' ? 'selected' : ''}`} disabled={dataMode === 'sample'} aria-pressed={dataMode === 'sample'}><DatabaseBackup /><span><strong>Dữ liệu thử nghiệm</strong><small>{dataMode === 'sample' ? 'Đang sử dụng bộ mẫu 68 thành viên' : 'Khôi phục bộ mẫu để tham khảo'}</small></span>{dataMode === 'sample' && <em>Đang dùng</em>}</button>} /><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogMedia><RotateCcw /></AlertDialogMedia><AlertDialogTitle>Chuyển sang dữ liệu thử nghiệm?</AlertDialogTitle><AlertDialogDescription>Dữ liệu gia phả hiện có sẽ được thay bằng bộ thử nghiệm gồm {SAMPLE_MEMBER_COUNT} thành viên và 5 đời. Hãy sao lưu nếu cần giữ lại dữ liệu hiện có.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy bỏ</AlertDialogCancel><AlertDialogAction onClick={() => { void restoreSampleData(); }}>Chuyển sang thử nghiệm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          <AlertDialog><AlertDialogTrigger render={<button type="button" className={`data-mode-option ${dataMode === 'official' ? 'selected' : ''}`} disabled={dataMode === 'official'} aria-pressed={dataMode === 'official'}><ShieldCheck /><span><strong>Dữ liệu chính thức</strong><small>{dataMode === 'official' ? 'Đang dùng dữ liệu chính thức' : 'Xóa bộ mẫu, tạo khung để nhập dữ liệu'}</small></span>{dataMode === 'official' && <em>Đang dùng</em>}</button>} /><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogMedia><AlertTriangle /></AlertDialogMedia><AlertDialogTitle>Chuyển sang dữ liệu chính thức?</AlertDialogTitle><AlertDialogDescription>Toàn bộ {SAMPLE_MEMBER_COUNT} thành viên dữ liệu thử nghiệm sẽ bị xóa và được thay bằng một khung gia phả trống. Hãy sao lưu nếu cần giữ lại dữ liệu hiện có.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy bỏ</AlertDialogCancel><AlertDialogAction className="confirm-delete" onClick={() => { void startOfficialData(); }}>Chuyển sang chính thức</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </> : <>
          <div className={`data-mode-option read-only ${dataMode === 'sample' ? 'selected' : ''}`}><DatabaseBackup /><span><strong>Dữ liệu thử nghiệm</strong><small>{dataMode === 'sample' ? 'Đang sử dụng bộ mẫu 68 thành viên' : 'Bộ mẫu để tham khảo bố cục'}</small></span>{dataMode === 'sample' && <em>Đang dùng</em>}</div>
          <div className={`data-mode-option read-only ${dataMode === 'official' ? 'selected' : ''}`}><ShieldCheck /><span><strong>Dữ liệu chính thức</strong><small>{dataMode === 'official' ? 'Đang dùng dữ liệu chính thức' : 'Dữ liệu sẽ được nhập khi bắt đầu chính thức'}</small></span>{dataMode === 'official' && <em>Đang dùng</em>}</div>
        </>}
      </div>
      <div className="sample-data-warning"><AlertTriangle /><p>Khi chuyển sang dữ liệu chính thức, toàn bộ dữ liệu thử nghiệm sẽ bị xóa. Khi chuyển về dữ liệu thử nghiệm, dữ liệu gia phả hiện có sẽ được thay bằng bộ mẫu.</p></div>
      {user.role !== 'super_admin' && <p className="sample-data-readonly">Chỉ quản trị cấp cao có thể chuyển đổi giữa dữ liệu chính thức và dữ liệu thử nghiệm.</p>}
    </div></article>
    <article className="setting-card banner-visibility-card"><div className="setting-icon"><PencilLine /></div><div className="setting-copy"><h3>Banner đầu các tab</h3><p>Hiển thị hoặc ẩn tên <strong>GIA PHẢ HỌ PHẠM VĂN</strong> cùng dòng “Gìn giữ cội nguồn · Kết nối thế hệ” trên toàn bộ các tab.</p><div className="setting-meta"><ShieldCheck /><span>{settings.show_brand_banner ? 'Banner đang hiện' : 'Banner đang ẩn'}</span></div></div><div className="banner-visibility-toggle"><span id="brand-banner-toggle-label"><strong>Hiển thị banner</strong><small>Thay đổi này áp dụng chung cho tất cả thành viên.</small></span><Switch checked={settings.show_brand_banner} onCheckedChange={(show_brand_banner) => { void saveSettings({ show_brand_banner }); }} aria-labelledby="brand-banner-toggle-label" /></div></article>

    {can('notifications') && <article className="notification-settings-card">
      <div className="config-title"><BellRing /><strong>Thông báo đăng nhập</strong><span>{settings.login_notice.enabled ? 'Đang bật' : 'Đã tắt'}</span></div>
      <p>Chỉnh nhãn, nội dung và vị trí hiển thị của thông báo.</p>
      <div className="notification-editor">
        <div className="notification-enabled"><span id="login-notice-toggle-label"><strong>Hiển thị thông báo</strong><small>Hiện hoặc ẩn thông báo với tất cả khách truy cập.</small></span><Switch checked={settings.login_notice.enabled} onCheckedChange={(enabled) => onSettings({ ...settings, login_notice: { ...settings.login_notice, enabled } })} aria-labelledby="login-notice-toggle-label" /></div>
        <div className="notification-placement"><span><strong>Vị trí hiển thị</strong><small>Chọn một hoặc cả hai màn hình.</small></span><div>
          <div className="notification-place-option"><span id="notice-login-placement"><strong>Màn hình đăng nhập</strong><small>Hiển thị trước khi chọn tạo tài khoản, đăng nhập hoặc khách tham quan.</small></span><Switch checked={settings.login_notice.showOnLogin} onCheckedChange={(showOnLogin) => onSettings({ ...settings, login_notice: { ...settings.login_notice, showOnLogin } })} aria-labelledby="notice-login-placement" /></div>
          <div className="notification-place-option"><span id="notice-main-placement"><strong>Màn hình chính</strong><small>Hiển thị sau khi vào gia phả, kể cả chế độ khách tham quan.</small></span><Switch checked={settings.login_notice.showOnMain} onCheckedChange={(showOnMain) => onSettings({ ...settings, login_notice: { ...settings.login_notice, showOnMain } })} aria-labelledby="notice-main-placement" /></div>
        </div></div>
        <label><span>Nhãn thông báo</span><input value={settings.login_notice.title} maxLength={120} onChange={(event) => onSettings({ ...settings, login_notice: { ...settings.login_notice, title: event.target.value } })} placeholder="Ghi chú" /></label>
        <label><span>Nội dung thông báo</span><textarea value={settings.login_notice.content} maxLength={1000} rows={4} onChange={(event) => onSettings({ ...settings, login_notice: { ...settings.login_notice, content: event.target.value } })} /></label>
        <button type="button" onClick={() => { void saveSettings({ login_notice: settings.login_notice }); }}><Save />Lưu thông báo</button>
      </div>
    </article>}

    <section className="advanced-admin"><div className="admin-section-heading"><UserCog /><div><span>Phân quyền hệ thống</span><h3>Cài đặt quản trị cấp cao</h3><p>Thành viên chỉ sửa nội dung thông thường; các quyền dưới đây phải được cấp riêng.</p></div></div>
      <div className="admin-config-grid">
        {can('project_name') && <article className="admin-config-card"><div className="config-title"><PencilLine /><strong>Tên dự án chính</strong></div><input value={settings.project_name} onChange={(e) => onSettings({ ...settings, project_name: e.target.value })} /><button onClick={() => saveSettings({ project_name: settings.project_name })}><Save />Lưu tên dự án</button></article>}
        {(['generations', 'legends', 'menu_tabs'] as const).map((key) => can(key === 'menu_tabs' ? 'menus' : key) && <article className="admin-config-card" key={key}><div className="config-title"><PencilLine /><strong>{key === 'generations' ? 'Các đời' : key === 'legends' ? 'Chú thích' : 'Menu và tab'}</strong></div><div className="editable-list">{settings[key].map((item, index) => <div key={`${key}-${index}`}><input value={item} onChange={(e) => editList(key, index, e.target.value)} /><button onClick={() => removeList(key, index)} aria-label={`Xóa ${item}`}><X /></button></div>)}</div><div className="config-actions"><button onClick={() => addList(key, key === 'generations' ? `Đời thứ ${settings[key].length + 1}` : 'Mục mới')}><Plus />Thêm</button><button onClick={() => saveSettings({ [key]: settings[key] })}><Save />Lưu</button></div></article>)}
        {user.role === 'super_admin' && <article className="admin-config-card language-management-card"><div className="config-title"><Languages /><strong>Ngôn ngữ hiển thị</strong><span>{settings.enabled_languages.length}/{supportedLanguages.length}</span></div><p>Ngôn ngữ được bật sẽ tự xuất hiện ở bộ chọn chung. Nếu tắt ngôn ngữ đang dùng, hệ thống tự chuyển về Tiếng Việt.</p><div className="language-option-list">{supportedLanguages.map((code) => <label key={code}><span>{languageNames[code]}</span><Switch checked={settings.enabled_languages.includes(code)} disabled={code === 'vi'} onCheckedChange={(enabled) => setLanguageEnabled(code, enabled)} aria-label={`${code === 'vi' ? 'Ngôn ngữ dự phòng bắt buộc: ' : ''}${languageNames[code]}`} /></label>)}</div></article>}
      </div>

      {user.role === 'super_admin' && <article className="account-manager"><div className="config-title"><UserCog /><strong>Quản lý tất cả tài khoản</strong><span>{accounts.length} tài khoản</span></div><p className="account-manager-note">Quản trị cấp cao có thể đặt lại mật khẩu, xóa tài khoản, cấp hoặc hạ quyền Quản trị cấp cao cho thành viên.</p><div className="account-list">{accounts.map((account) => {
        let permissions: string[] = []; try { permissions = JSON.parse(account.permissions); } catch { permissions = []; }
        const isRootAccount = account.username === 'devphamgia';
        return <div className="account-row" key={account.id}><div className="account-identity"><span>{account.full_name.charAt(0)}</span><div><strong>{account.full_name}</strong><small>@{account.username}{isRootAccount && ' · Tài khoản gốc'}</small></div></div><select value={account.role} disabled={isRootAccount} onChange={(e) => updateAccount(account, { role: e.target.value as Account['role'] })}><option value="member">Thành viên</option><option value="super_admin">Quản trị cấp cao</option></select><label className="active-check"><input type="checkbox" disabled={isRootAccount} checked={Boolean(account.active)} onChange={(e) => updateAccount(account, { active: e.target.checked ? 1 : 0 })} />Hoạt động</label><div className="account-actions">{(!isRootAccount || user.username === 'devphamgia') && <button type="button" className="account-reset" onClick={() => { setPasswordTarget(account); setResetPassword(''); setError(''); }}><KeyRound />Đặt lại mật khẩu</button>}{!isRootAccount && account.username !== user.username && <AlertDialog><AlertDialogTrigger render={<button type="button" className="account-delete"><Trash2 />Xóa tài khoản</button>} /><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogMedia><Trash2 /></AlertDialogMedia><AlertDialogTitle>Xóa tài khoản @{account.username}?</AlertDialogTitle><AlertDialogDescription>Tài khoản sẽ bị xóa vĩnh viễn. Các phiên đăng nhập đang mở của tài khoản này cũng sẽ bị hủy.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy bỏ</AlertDialogCancel><AlertDialogAction className="confirm-delete" onClick={() => { void deleteAccount(account); }}>Xác nhận xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div><div className="permission-list">{(Object.keys(permissionLabels) as Permission[]).map((permission) => <label key={permission}><input type="checkbox" disabled={account.role === 'super_admin'} checked={account.role === 'super_admin' || permissions.includes(permission)} onChange={(e) => updateAccount(account, { permissions: JSON.stringify(e.target.checked ? [...permissions, permission] : permissions.filter((item) => item !== permission)) })} />{permissionLabels[permission]}</label>)}</div></div>;
      })}</div></article>}

      <Dialog open={Boolean(passwordTarget)} onOpenChange={(open) => { if (!open) { setPasswordTarget(null); setResetPassword(''); } }}><DialogContent className="account-password-dialog"><DialogHeader><DialogTitle>Đặt lại mật khẩu</DialogTitle><DialogDescription>{passwordTarget ? `Thiết lập mật khẩu mới cho @${passwordTarget.username}. Mọi phiên đăng nhập hiện có của tài khoản này sẽ được hủy.` : ''}</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); void resetAccountPassword(); }}><label>Mật khẩu mới<input type="password" value={resetPassword} minLength={8} maxLength={128} autoComplete="new-password" onChange={(event) => setResetPassword(event.target.value)} required /></label><p>Tối thiểu 8 ký tự. Mật khẩu được mã hóa trước khi lưu.</p><div><button type="button" onClick={() => { setPasswordTarget(null); setResetPassword(''); }}>Hủy</button><button type="submit"><KeyRound />Đặt lại mật khẩu</button></div></form></DialogContent></Dialog>

    </section>
    <article className="audit-log-card">
      <div className="config-title"><History /><strong>Lịch sử chỉnh sửa gia phả</strong><span>{auditLogs.length} bản ghi gần nhất</span>{user.role === 'super_admin' && <AlertDialog><AlertDialogTrigger render={<button type="button" className="audit-clear" disabled={!auditLogs.length}><Trash2 />Xóa toàn bộ lịch sử</button>} /><AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogMedia><Trash2 /></AlertDialogMedia><AlertDialogTitle>Xóa toàn bộ lịch sử chỉnh sửa gia phả?</AlertDialogTitle><AlertDialogDescription>Toàn bộ bản ghi thay đổi gia phả, thành viên, sự kiện và tư liệu sẽ bị xóa vĩnh viễn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy bỏ</AlertDialogCancel><AlertDialogAction className="confirm-delete" onClick={() => { void clearAuditLogs(); }}>Xóa toàn bộ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}<button className="audit-refresh" type="button" onClick={loadAuditLogs} aria-label="Làm mới lịch sử chỉnh sửa gia phả"><RotateCcw /></button></div>
      <p>{user.role === 'super_admin' ? 'Chỉ lưu thay đổi ảnh hưởng đến gia phả, thành viên, sự kiện và tư liệu. Mọi tài khoản nội bộ có thể xem; chỉ quản trị cấp cao được sửa hoặc xóa bản ghi.' : 'Lịch sử này chỉ ghi thay đổi gia phả, thành viên, sự kiện và tư liệu. Chỉ quản trị cấp cao mới được sửa hoặc xóa bản ghi.'}</p>
      <div className="audit-log-scroll">{auditLogs.length ? auditLogs.map((log) => <div className="audit-log-row" key={log.id}><time dateTime={new Date(log.created_at).toISOString()}>{new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.created_at))}</time><div><strong>{log.action} · {log.entity}</strong>{editingLogId === log.id ? <span className="audit-edit"><input value={editingDetails} onChange={(event) => setEditingDetails(event.target.value)} maxLength={300} /><button type="button" onClick={() => saveAuditLog(log)}><Save /></button><button type="button" onClick={() => { setEditingLogId(null); setEditingDetails(''); }}><X /></button></span> : <span>{log.details}</span>}</div><small>@{log.actor_username}</small>{user.role === 'super_admin' && <div className="audit-row-actions">{editingLogId !== log.id && <button type="button" onClick={() => { setEditingLogId(log.id); setEditingDetails(log.details); }} aria-label="Sửa bản ghi"><PencilLine /></button>}<button type="button" onClick={() => deleteAuditLog(log)} aria-label="Xóa bản ghi"><Trash2 /></button></div>}</div>) : <div className="audit-empty">Chưa có thay đổi gia phả, thành viên, sự kiện hoặc tư liệu nào được ghi nhận.</div>}</div>
    </article>
  </>;
}
