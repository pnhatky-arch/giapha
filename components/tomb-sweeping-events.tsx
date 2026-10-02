'use client';

import { useEffect } from 'react';

type TombEvent = {
  id: string;
  date: string;
  location: string;
  branch: string;
  note: string;
  repeatYearly: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

function formatDate(value: string, repeatYearly: boolean) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('vi-VN', repeatYearly
    ? { day: '2-digit', month: 'long' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export default function TombSweepingEvents() {
  useEffect(() => {
    let events: TombEvent[] = [];
    let canEdit = false;
    let editingId: string | null = null;
    let loaded = false;
    let loading: Promise<void> | null = null;
    let syncFrame = 0;

    const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[character] ?? character));

    const updateFilterCounts = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      if (!view) return;
      const birthday = view.querySelectorAll('.family-event.birthday').length;
      const memorial = view.querySelectorAll('.family-event.memorial').length;
      const tomb = view.querySelectorAll('.family-event.tomb-sweeping').length;
      const counts: Record<string, number> = { all: birthday + memorial + tomb, birthday, memorial, tomb };
      view.querySelectorAll<HTMLButtonElement>('.event-filter-button').forEach((button) => {
        const count = button.querySelector('small');
        const key = button.dataset.filter ?? '';
        const next = key in counts ? String(counts[key]) : null;
        if (count && next !== null && count.textContent !== next) count.textContent = next;
      });
    };

    const applyCurrentFilter = () => {
      const selected = document.querySelector<HTMLButtonElement>('.event-filter-button.selected');
      const filter = selected?.dataset.filter ?? 'all';
      document.querySelectorAll<HTMLElement>('.family-tomb-event').forEach((item) => {
        item.hidden = filter !== 'all' && filter !== 'tomb';
      });
    };

    const closeDialog = () => {
      document.querySelector('.tomb-event-dialog')?.remove();
      editingId = null;
    };

    const openDialog = (event?: TombEvent) => {
      closeDialog();
      editingId = event?.id ?? null;
      const overlay = document.createElement('div');
      overlay.className = 'tomb-event-dialog';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', event ? 'Sửa lịch Chạp mộ' : 'Thêm lịch Chạp mộ');
      overlay.innerHTML = `
        <div class="tomb-event-dialog-card">
          <div class="tomb-event-dialog-head">
            <div><strong>${event ? 'Sửa lịch Chạp mộ' : 'Thêm lịch Chạp mộ'}</strong><span>Ghi lịch chung của dòng họ</span></div>
            <button type="button" class="tomb-dialog-close" aria-label="Đóng">×</button>
          </div>
          <form class="tomb-event-form">
            <label>Ngày Chạp mộ<input name="date" type="date" required value="${escapeHtml(event?.date ?? '')}"></label>
            <label>Địa điểm<input name="location" type="text" maxlength="120" required placeholder="Ví dụ: Nghĩa trang dòng họ" value="${escapeHtml(event?.location ?? '')}"></label>
            <label>Khu mộ / chi họ<input name="branch" type="text" maxlength="120" placeholder="Ví dụ: Khu mộ tổ · Chi trưởng" value="${escapeHtml(event?.branch ?? '')}"></label>
            <label class="tomb-note-field">Ghi chú<textarea name="note" maxlength="500" rows="3" placeholder="Việc chuẩn bị, giờ tập trung, lễ vật…">${escapeHtml(event?.note ?? '')}</textarea></label>
            <label class="tomb-repeat-field"><input name="repeatYearly" type="checkbox" ${event?.repeatYearly === false ? '' : 'checked'}><span>Lặp lại hằng năm</span></label>
            <p class="tomb-form-message" role="alert"></p>
            <div class="tomb-form-actions"><button type="button" class="tomb-cancel">Trở lui</button><button type="submit" class="tomb-save">${event ? 'Lưu thay đổi' : 'Thêm lịch'}</button></div>
          </form>
        </div>`;
      document.body.appendChild(overlay);

      const close = () => closeDialog();
      overlay.querySelector('.tomb-dialog-close')?.addEventListener('click', close);
      overlay.querySelector('.tomb-cancel')?.addEventListener('click', close);
      overlay.addEventListener('click', (mouseEvent) => { if (mouseEvent.target === overlay) close(); });
      const form = overlay.querySelector<HTMLFormElement>('.tomb-event-form');
      form?.addEventListener('submit', async (submitEvent) => {
        submitEvent.preventDefault();
        const message = form.querySelector<HTMLElement>('.tomb-form-message');
        const save = form.querySelector<HTMLButtonElement>('.tomb-save');
        const data = new FormData(form);
        const payload = {
          ...(editingId ? { id: editingId } : {}),
          date: String(data.get('date') ?? ''),
          location: String(data.get('location') ?? ''),
          branch: String(data.get('branch') ?? ''),
          note: String(data.get('note') ?? ''),
          repeatYearly: data.get('repeatYearly') === 'on',
        };
        if (save) save.disabled = true;
        if (message) message.textContent = 'Đang lưu…';
        try {
          const response = await fetch('/api/events/chapa', {
            method: editingId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json() as { message?: string };
          if (!response.ok) throw new Error(result.message || 'Không thể lưu lịch Chạp mộ.');
          closeDialog();
          loaded = false;
          await loadEvents();
          render();
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Không thể lưu lịch Chạp mộ.';
          if (save) save.disabled = false;
        }
      });
      window.setTimeout(() => overlay.querySelector<HTMLInputElement>('input[name="date"]')?.focus(), 20);
    };

    const removeEvent = async (event: TombEvent) => {
      if (!window.confirm(`Xóa lịch Chạp mộ ${formatDate(event.date, event.repeatYearly)} tại ${event.location}?`)) return;
      const response = await fetch('/api/events/chapa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) {
        window.alert(result.message || 'Không thể xóa lịch Chạp mộ.');
        return;
      }
      loaded = false;
      await loadEvents();
      render();
    };

    const render = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      const heading = view?.querySelector<HTMLElement>('.events-heading');
      if (!view || !heading) return;

      let addButton = heading.querySelector<HTMLButtonElement>('.tomb-event-add');
      if (canEdit && !addButton) {
        addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'tomb-event-add';
        addButton.textContent = '+ Chạp mộ';
        addButton.addEventListener('click', () => openDialog());
        heading.appendChild(addButton);
      } else if (!canEdit && addButton) {
        addButton.remove();
      }

      let list = view.querySelector<HTMLElement>('.tomb-sweeping-list');
      if (!list) {
        list = document.createElement('div');
        list.className = 'tomb-sweeping-list';
        const nativeList = view.querySelector('.events-list');
        const filterEmpty = view.querySelector('.event-filter-empty');
        if (nativeList) nativeList.insertAdjacentElement('afterend', list);
        else if (filterEmpty) filterEmpty.insertAdjacentElement('afterend', list);
        else heading.insertAdjacentElement('afterend', list);
      }

      const signature = JSON.stringify({ canEdit, events });
      if (list.dataset.signature !== signature) {
        list.dataset.signature = signature;
        list.innerHTML = '';
        events.forEach((event) => {
          const item = document.createElement('article');
          item.className = 'family-event tomb-sweeping family-tomb-event';
          item.dataset.eventId = event.id;
          item.innerHTML = `
            <span class="tomb-event-mark" aria-hidden="true">祀</span>
            <span class="event-copy"><em>Chạp mộ</em><strong>${escapeHtml(event.branch || event.location)}</strong><small>${escapeHtml(event.location)}${event.repeatYearly ? ' · Hằng năm' : ''}${event.note ? ` · ${escapeHtml(event.note)}` : ''}</small></span>
            <time datetime="${escapeHtml(event.date)}">${escapeHtml(formatDate(event.date, event.repeatYearly))}</time>
            ${canEdit ? '<span class="tomb-event-actions"><button type="button" class="tomb-edit">Sửa</button><button type="button" class="tomb-delete">Xóa</button></span>' : ''}`;
          if (canEdit) {
            item.querySelector('.tomb-edit')?.addEventListener('click', () => openDialog(event));
            item.querySelector('.tomb-delete')?.addEventListener('click', () => void removeEvent(event));
          }
          list!.appendChild(item);
        });
      }

      const nativeEmpty = view.querySelector<HTMLElement>('.events-empty');
      if (nativeEmpty) nativeEmpty.style.display = events.length ? 'none' : '';
      updateFilterCounts();
      applyCurrentFilter();
    };

    const loadEvents = async () => {
      if (loaded) return;
      if (loading) return loading;
      loading = (async () => {
        try {
          const response = await fetch('/api/events/chapa', { cache: 'no-store' });
          if (!response.ok) throw new Error('Không tải được lịch Chạp mộ.');
          const result = await response.json() as { events?: TombEvent[]; canEdit?: boolean };
          events = Array.isArray(result.events) ? result.events : [];
          canEdit = result.canEdit === true;
          loaded = true;
        } catch {
          events = [];
          canEdit = false;
          loaded = true;
        } finally {
          loading = null;
        }
      })();
      return loading;
    };

    const sync = () => {
      cancelAnimationFrame(syncFrame);
      syncFrame = requestAnimationFrame(() => {
        if (!document.querySelector('.events-view')) return;
        void loadEvents().then(render);
      });
    };

    const handleFilterClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.event-filter-button')) {
        window.requestAnimationFrame(applyCurrentFilter);
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleFilterClick);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleFilterClick);
      cancelAnimationFrame(syncFrame);
      closeDialog();
      document.querySelectorAll('.tomb-event-add,.tomb-sweeping-list').forEach((node) => node.remove());
      const nativeEmpty = document.querySelector<HTMLElement>('.events-empty');
      if (nativeEmpty) nativeEmpty.style.display = '';
    };
  }, []);

  return <style>{`
    .tomb-event-add {
      height: 34px;
      padding: 0 12px;
      border: 1px solid #d6a83b;
      border-radius: 9px;
      background: linear-gradient(100deg,#851a12,#5d0d09);
      color: #ffe08a;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 0 10px #ffd45e20;
    }
    .tomb-sweeping-list { display: grid; }
    .family-tomb-event { position: relative; }
    .tomb-event-mark {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid #c89739;
      border-radius: 50%;
      color: #f0cf72;
      background: #49100b;
      font-family: var(--font-serif);
      font-size: 16px;
      flex: 0 0 auto;
    }
    .tomb-event-actions {
      display: inline-flex;
      gap: 5px;
      margin-left: 8px;
    }
    .tomb-event-actions button {
      height: 28px;
      padding: 0 8px;
      border: 1px solid #9e6c2855;
      border-radius: 7px;
      background: #2e0504;
      color: #c9ad87;
      font-size: 9px;
    }
    .tomb-event-dialog {
      position: fixed;
      inset: 0;
      z-index: 2147482500;
      display: grid;
      place-items: center;
      padding: 18px;
      background: #170403b5;
      backdrop-filter: blur(9px);
      -webkit-backdrop-filter: blur(9px);
    }
    .tomb-event-dialog-card {
      width: min(520px,100%);
      max-height: min(720px,90vh);
      overflow: auto;
      border: 1px solid #c39034;
      border-radius: 17px;
      background: linear-gradient(180deg,#4b0a07,#280403);
      box-shadow: 0 24px 70px #0008, inset 0 1px #f4d77a20;
    }
    .tomb-event-dialog-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 17px 13px;
      border-bottom: 1px solid #d0a13c32;
    }
    .tomb-event-dialog-head strong { display:block; color:#f4d57e; font-family:var(--font-serif); font-size:17px; }
    .tomb-event-dialog-head span { display:block; margin-top:3px; color:#b99d7c; font-size:10px; }
    .tomb-dialog-close {
      width: 34px; height: 34px; border: 1px solid #a779325a; border-radius: 50%;
      background:#2c0504; color:#d7ba8f; font-size:22px; line-height:1;
    }
    .tomb-event-form { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:16px 17px 18px; }
    .tomb-event-form label { display:grid; gap:6px; color:#c7a982; font-size:10px; }
    .tomb-event-form input[type="text"], .tomb-event-form input[type="date"], .tomb-event-form textarea {
      width:100%; border:1px solid #9f71365c; border-radius:9px; background:#210302; color:#f4dfb2;
      padding:0 10px; outline:none; font:inherit; font-size:12px;
    }
    .tomb-event-form input[type="text"], .tomb-event-form input[type="date"] { height:40px; }
    .tomb-event-form textarea { min-height:76px; padding-top:9px; resize:vertical; }
    .tomb-note-field, .tomb-repeat-field, .tomb-form-message, .tomb-form-actions { grid-column:1 / -1; }
    .tomb-repeat-field { display:flex !important; grid-template-columns:none !important; align-items:center; gap:8px !important; }
    .tomb-repeat-field input { accent-color:#d8aa3f; }
    .tomb-form-message { min-height:16px; margin:0; color:#efb789; font-size:10px; }
    .tomb-form-actions { display:flex; justify-content:flex-end; gap:8px; }
    .tomb-form-actions button { height:36px; padding:0 13px; border-radius:9px; font-size:11px; }
    .tomb-cancel { border:1px solid #91663166; background:#290403; color:#c2a281; }
    .tomb-save { border:1px solid #d4a43a; background:linear-gradient(100deg,#8a1b13,#5d0d09); color:#ffe28c; }
    .tomb-save:disabled { opacity:.55; }

    @media(max-width:740px){
      .events-heading { align-items:center; }
      .tomb-event-add { height:32px; padding:0 9px; font-size:10px; }
      .family-tomb-event { gap:8px !important; }
      .tomb-event-mark { width:32px; height:32px; font-size:14px; }
      .tomb-event-actions { width:100%; margin:6px 0 0; justify-content:flex-end; }
      .tomb-event-dialog { align-items:end; padding:0; }
      .tomb-event-dialog-card { width:100%; max-height:88vh; border-radius:18px 18px 0 0; border-bottom:0; }
      .tomb-event-form { grid-template-columns:1fr; gap:10px; }
      .tomb-note-field, .tomb-repeat-field, .tomb-form-message, .tomb-form-actions { grid-column:1; }
    }
    .mode-mobile .tomb-event-dialog { align-items:end; padding:0; }
    .mode-mobile .tomb-event-dialog-card { width:100%; max-height:88vh; border-radius:18px 18px 0 0; border-bottom:0; }
    .mode-mobile .tomb-event-form { grid-template-columns:1fr; gap:10px; }
    .mode-mobile .tomb-note-field, .mode-mobile .tomb-repeat-field, .mode-mobile .tomb-form-message, .mode-mobile .tomb-form-actions { grid-column:1; }
  `}</style>;
}
