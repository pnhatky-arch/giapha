'use client';

import { useEffect, useState } from 'react';

const LEGACY_APPLICATIONS = new Set([
  'Gia phả họ Phạm',
  'THE PHAM GENEALOGY: GIA PHẢ HỌ PHẠM',
  'GIA PHẢ HỌ PHẠM',
  'GIA PHẢ HỌ PHẠM VĂN',
]);

export default function SystemBackupEnhancements() {
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    let hideTimer = 0;
    const installed = new WeakSet<HTMLInputElement>();

    const report = (message: string, error = false) => {
      window.clearTimeout(hideTimer);
      setStatus({ message, error });
      hideTimer = window.setTimeout(() => setStatus(null), error ? 6000 : 3500);
    };

    const downloadSystemBackup = async () => {
      report('Đang đóng gói toàn bộ dữ liệu hệ thống…');
      try {
        const response = await fetch('/api/system-backup', { cache: 'no-store' });
        const data = await response.json().catch(() => null) as { message?: string; exportedAt?: string } | null;
        if (!response.ok || !data) throw new Error(data?.message || 'Không thể tạo bản sao lưu hệ thống.');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gia-pha-system-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        report('Đã tạo bản sao lưu toàn bộ dữ liệu.');
      } catch (error) {
        report(error instanceof Error ? error.message : 'Không thể tạo bản sao lưu hệ thống.', true);
      }
    };

    const restoreFile = async (file: File) => {
      report('Đang kiểm tra bản sao lưu…');
      try {
        const data = JSON.parse(await file.text()) as Record<string, unknown>;
        if (data.scope === 'genealogy-system' && data.version === 2) {
          const response = await fetch('/api/system-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          const result = await response.json().catch(() => ({})) as { message?: string };
          if (!response.ok) throw new Error(result.message || 'Không thể phục hồi bản sao lưu hệ thống.');
          report('Đã phục hồi cây gia phả, sự kiện, tư liệu, media, cài đặt và lịch sử.');
          window.setTimeout(() => window.location.reload(), 500);
          return;
        }

        // Preserve compatibility with version-1 backups that only contain the family tree.
        if (typeof data.application === 'string' && LEGACY_APPLICATIONS.has(data.application) && data.family) {
          const response = await fetch('/api/family', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              family: data.family,
              dataMode: 'official',
              activity: { action: 'Phục hồi dữ liệu', details: 'Đã phục hồi cây gia phả từ bản sao lưu phiên bản cũ.' },
            }),
          });
          const result = await response.json().catch(() => ({})) as { message?: string };
          if (!response.ok) throw new Error(result.message || 'Không thể phục hồi bản sao lưu cũ.');
          report('Đã phục hồi cây gia phả từ bản sao lưu cũ.');
          window.setTimeout(() => window.location.reload(), 500);
          return;
        }

        throw new Error('Tệp không phải bản sao lưu hợp lệ của hệ thống Gia phả.');
      } catch (error) {
        report(error instanceof Error ? error.message : 'Tệp sao lưu không hợp lệ hoặc đã bị hỏng.', true);
      }
    };

    const clickHandler = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLButtonElement>('.data-actions button');
      if (!button || button.disabled) return;
      const label = (button.textContent ?? '').trim();
      if (!label.startsWith('Sao lưu')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void downloadSystemBackup();
    };

    const installRestoreInput = (input: HTMLInputElement) => {
      if (installed.has(input)) return;
      installed.add(input);
      input.addEventListener('change', (event) => {
        event.stopPropagation();
        event.stopImmediatePropagation();
        const file = input.files?.[0];
        if (file) void restoreFile(file);
        input.value = '';
      });
    };

    const sync = () => {
      document.querySelectorAll<HTMLInputElement>('.data-actions input[type="file"][accept*="json"]').forEach(installRestoreInput);
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', clickHandler, true);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', clickHandler, true);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return <>
    {status && <output className={`system-backup-status ${status.error ? 'error' : ''}`} role="status">{status.message}</output>}
    <style>{`
      .system-backup-status{
        position:fixed;z-index:2147483300;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));
        width:min(430px,calc(100vw - 28px));transform:translateX(-50%);padding:11px 14px;
        border:1px solid #c89a3c;border-radius:10px;background:#350604f2;color:#efd184;
        box-shadow:0 10px 34px #1601008c;text-align:center;font-size:11px;line-height:1.45;
        backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:none
      }
      .system-backup-status.error{border-color:#a85449;color:#efb0a3;background:#330504f5}
    `}</style>
  </>;
}
