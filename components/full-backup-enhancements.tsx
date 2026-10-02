'use client';

import { useEffect } from 'react';

const BACKUP_SCHEMA = 'giapha-content-v2';

export default function FullBackupEnhancements({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;

    const feedback = (message: string, error = false) => {
      const card = document.querySelector<HTMLElement>('.data-management');
      if (!card) return;
      let node = card.querySelector<HTMLOutputElement>('.full-backup-feedback');
      if (!node) {
        node = document.createElement('output');
        node.className = 'full-backup-feedback';
        card.appendChild(node);
      }
      node.classList.toggle('error', error);
      node.textContent = message;
    };

    const download = async (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      feedback('Đang tạo bản sao lưu toàn hệ thống…');
      try {
        const response = await fetch('/api/backup', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error((data as { message?: string }).message || 'Không thể sao lưu dữ liệu.');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `gia-pha-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        feedback('Đã sao lưu cây gia phả, sự kiện, tư liệu, hình ảnh/video và cài đặt nội dung.');
      } catch (error) {
        feedback(error instanceof Error ? error.message : 'Không thể sao lưu dữ liệu.', true);
      }
    };

    const restore = async (event: Event) => {
      const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null;
      const file = input?.files?.[0];
      if (!input || !file) return;
      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) event.stopImmediatePropagation();
      try {
        const data = JSON.parse(await file.text()) as { schema?: string };
        if (data.schema !== BACKUP_SCHEMA) throw new Error('Đây không phải bản sao lưu toàn hệ thống phiên bản hiện tại.');
        if (!window.confirm('Phục hồi sẽ thay thế cây gia phả, sự kiện, tư liệu, media và cài đặt nội dung hiện tại. Tiếp tục?')) return;
        feedback('Đang phục hồi toàn bộ dữ liệu…');
        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json() as { message?: string };
        if (!response.ok) throw new Error(result.message || 'Không thể phục hồi dữ liệu.');
        feedback('Đã phục hồi toàn bộ dữ liệu. Đang tải lại…');
        window.setTimeout(() => window.location.reload(), 250);
      } catch (error) {
        feedback(error instanceof Error ? error.message : 'Tệp sao lưu không hợp lệ.', true);
      } finally {
        input.value = '';
      }
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const actions = document.querySelector<HTMLElement>('.data-management .data-actions');
        if (!actions) return;
        const buttons = Array.from(actions.querySelectorAll<HTMLButtonElement>('button'));
        const backup = buttons.find((button) => button.textContent?.trim() === 'Sao lưu');
        if (backup && backup.dataset.fullBackup !== '1') {
          backup.dataset.fullBackup = '1';
          backup.addEventListener('click', download, true);
          backup.title = 'Sao lưu toàn bộ cây gia phả, sự kiện, tư liệu, media và cài đặt nội dung';
        }
        const input = actions.querySelector<HTMLInputElement>('input[type="file"]');
        if (input && input.dataset.fullRestore !== '1') {
          input.dataset.fullRestore = '1';
          input.addEventListener('change', restore, true);
          input.accept = 'application/json,.json';
        }
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      document.querySelectorAll<HTMLButtonElement>('[data-full-backup="1"]').forEach((button) => button.removeEventListener('click', download, true));
      document.querySelectorAll<HTMLInputElement>('[data-full-restore="1"]').forEach((input) => input.removeEventListener('change', restore, true));
    };
  }, [enabled]);

  return <style>{`
    .full-backup-feedback{grid-column:1/-1;display:block;margin:10px 0 0;padding:9px 11px;border:1px solid #8ea66b55;border-radius:8px;background:#17310f42;color:#cfe2a7;font-size:10px;line-height:1.45}
    .full-backup-feedback.error{border-color:#a1544c66;background:#4a0c0966;color:#efb3a8}
  `}</style>;
}
