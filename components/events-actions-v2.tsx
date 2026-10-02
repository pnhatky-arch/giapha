'use client';

import { useEffect } from 'react';

export default function EventsActionsV2({ canEdit }: { canEdit: boolean }) {
  useEffect(() => {
    let frame = 0;

    const closeDialog = () => {
      document.querySelector('.chapa-v2-dialog')?.remove();
    };

    const openChapaDialog = () => {
      closeDialog();
      const overlay = document.createElement('div');
      overlay.className = 'chapa-v2-dialog';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Thêm lịch Chạp mộ');
      overlay.innerHTML = `
        <div class="chapa-v2-card">
          <div class="chapa-v2-head">
            <div><strong>Thêm lịch Chạp mộ</strong><span>Ghi lịch chung của dòng họ</span></div>
            <button type="button" class="chapa-v2-close" aria-label="Đóng">×</button>
          </div>
          <form class="chapa-v2-form">
            <label>Ngày Chạp mộ<input name="date" type="date" required></label>
            <label>Địa điểm<input name="location" type="text" maxlength="120" required placeholder="Ví dụ: Nghĩa trang dòng họ"></label>
            <label>Khu mộ / chi họ<input name="branch" type="text" maxlength="120" placeholder="Ví dụ: Khu mộ tổ · Chi trưởng"></label>
            <label class="chapa-v2-note">Ghi chú<textarea name="note" maxlength="500" rows="3" placeholder="Việc chuẩn bị, giờ tập trung, lễ vật…"></textarea></label>
            <label class="chapa-v2-repeat"><input name="repeatYearly" type="checkbox" checked><span>Hằng năm</span></label>
            <p class="chapa-v2-message" role="alert"></p>
            <div class="chapa-v2-actions"><button type="button" class="chapa-v2-cancel">Trở lui</button><button type="submit" class="chapa-v2-save">Lưu Chạp mộ</button></div>
          </form>
        </div>`;
      document.body.appendChild(overlay);

      const close = () => closeDialog();
      overlay.querySelector('.chapa-v2-close')?.addEventListener('click', close);
      overlay.querySelector('.chapa-v2-cancel')?.addEventListener('click', close);
      overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });

      const form = overlay.querySelector<HTMLFormElement>('.chapa-v2-form');
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = form.querySelector<HTMLElement>('.chapa-v2-message');
        const save = form.querySelector<HTMLButtonElement>('.chapa-v2-save');
        if (!canEdit) {
          if (message) message.textContent = 'Mời đăng nhập tài khoản nội bộ để thêm lịch Chạp mộ.';
          return;
        }
        const data = new FormData(form);
        const payload = {
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json() as { message?: string };
          if (!response.ok) throw new Error(result.message || 'Không thể lưu lịch Chạp mộ.');
          if (message) message.textContent = 'Đã lưu lịch Chạp mộ.';
          window.setTimeout(() => window.location.reload(), 180);
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Không thể lưu lịch Chạp mộ.';
          if (save) save.disabled = false;
        }
      });

      window.setTimeout(() => overlay.querySelector<HTMLInputElement>('input[name="date"]')?.focus(), 20);
    };

    const activateFamilyFilter = (button: HTMLButtonElement, view: HTMLElement) => {
      view.querySelectorAll<HTMLButtonElement>('.event-filter-button').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');

      let visible = 0;
      view.querySelectorAll<HTMLElement>('.family-event').forEach((item) => {
        const show = item.classList.contains('family-work');
        item.hidden = !show;
        if (show) visible += 1;
      });

      const empty = view.querySelector<HTMLElement>('.event-filter-empty');
      if (empty) {
        empty.hidden = visible > 0;
        empty.innerHTML = '<strong>Chưa có việc họ nào được ghi</strong><span>Các việc chung của dòng họ sẽ được hiển thị tại mục ni.</span>';
      }
    };

    const install = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      const bar = view?.querySelector<HTMLElement>('.event-filter-bar');
      if (!view || !bar) return;

      let familyButton = bar.querySelector<HTMLButtonElement>('.event-family-filter-v2');
      if (!familyButton) {
        familyButton = document.createElement('button');
        familyButton.type = 'button';
        familyButton.className = 'event-family-filter-v2';
        familyButton.setAttribute('aria-pressed', 'false');
        familyButton.innerHTML = '<span>Việc họ</span><small>0</small>';
        familyButton.addEventListener('click', () => activateFamilyFilter(familyButton!, view));
      }
      const tombFilter = bar.querySelector<HTMLElement>('.event-filter-button[data-filter="tomb"]');
      if (tombFilter && tombFilter.nextElementSibling !== familyButton) tombFilter.insertAdjacentElement('afterend', familyButton);
      else if (!familyButton.isConnected) bar.appendChild(familyButton);

      let actionRow = view.querySelector<HTMLElement>('.chapa-v2-toolbar');
      if (!actionRow) {
        actionRow = document.createElement('div');
        actionRow.className = 'chapa-v2-toolbar';
        actionRow.innerHTML = `
          <div class="chapa-v2-copy"><strong>Chạp mộ</strong><span>Lịch chung của dòng họ · địa điểm · khu mộ · ghi chú</span></div>
          <button type="button" class="chapa-v2-add">+ Chạp mộ</button>`;
        actionRow.querySelector<HTMLButtonElement>('.chapa-v2-add')?.addEventListener('click', openChapaDialog);
        bar.insertAdjacentElement('afterend', actionRow);
      }

      const add = actionRow.querySelector<HTMLButtonElement>('.chapa-v2-add');
      if (add) {
        add.title = canEdit ? 'Thêm lịch Chạp mộ' : 'Đăng nhập để thêm lịch Chạp mộ';
        add.setAttribute('aria-label', add.title);
      }
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(install);
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      closeDialog();
      document.querySelectorAll('.event-family-filter-v2,.chapa-v2-toolbar').forEach((node) => node.remove());
    };
  }, [canEdit]);

  return <style>{`
    .event-filter-bar .tomb-event-add,
    .tomb-event-action-proxy { display: none !important; }

    .event-family-filter-v2 {
      min-width: max-content;
      height: 36px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 0 11px;
      border: 1px solid #9e6c285c;
      border-radius: 9px;
      background: #2d0504;
      color: #bfa98f;
      font-size: 11px;
      flex: 0 0 auto;
    }
    .event-family-filter-v2 small {
      min-width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      padding: 0 4px;
      border-radius: 999px;
      background: #ffffff0c;
      color: #9e846d;
      font-size: 9px;
    }
    .event-family-filter-v2.selected {
      border-color: #e0b447;
      background: linear-gradient(100deg,#851a12,#5d0d09);
      color: #ffe08a;
      box-shadow: inset 0 -2px #e7bb4f,0 0 10px #ffd45e28;
    }

    .chapa-v2-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 12px 24px 4px;
      padding: 11px 12px;
      border: 1px solid #b8873766;
      border-radius: 12px;
      background: linear-gradient(110deg,#3e0705,#270403);
      box-shadow: inset 0 1px #f5d77c12;
    }
    .chapa-v2-copy { min-width: 0; }
    .chapa-v2-copy strong { display: block; color: #f0d17a; font-size: 13px; font-family: var(--font-serif); }
    .chapa-v2-copy span { display: block; margin-top: 3px; color: #aa9074; font-size: 9px; line-height: 1.35; }
    .chapa-v2-add {
      flex: 0 0 auto;
      height: 36px;
      padding: 0 12px;
      border: 1px solid #e0b447;
      border-radius: 9px;
      background: linear-gradient(100deg,#851a12,#5d0d09);
      color: #ffe08a;
      font-size: 11px;
      font-weight: 800;
      box-shadow: inset 0 -2px #e7bb4f,0 0 10px #ffd45e28;
    }
    .chapa-v2-add:active { transform: scale(.97); }

    .chapa-v2-dialog {
      position: fixed;
      inset: 0;
      z-index: 2147483200;
      display: grid;
      place-items: center;
      padding: 18px;
      background: #170403c2;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .chapa-v2-card {
      width: min(520px,100%);
      max-height: 90vh;
      overflow: auto;
      border: 1px solid #c39034;
      border-radius: 17px;
      background: linear-gradient(180deg,#4b0a07,#280403);
      box-shadow: 0 24px 70px #0009,inset 0 1px #f4d77a20;
    }
    .chapa-v2-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 17px 13px;
      border-bottom: 1px solid #d0a13c32;
    }
    .chapa-v2-head strong { display:block;color:#f4d57e;font-family:var(--font-serif);font-size:17px; }
    .chapa-v2-head span { display:block;margin-top:3px;color:#b99d7c;font-size:10px; }
    .chapa-v2-close { width:34px;height:34px;border:1px solid #a779325a;border-radius:50%;background:#2c0504;color:#d7ba8f;font-size:22px; }
    .chapa-v2-form { display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 17px 18px; }
    .chapa-v2-form label { display:grid;gap:6px;color:#c7a982;font-size:10px; }
    .chapa-v2-form input[type="text"],.chapa-v2-form input[type="date"],.chapa-v2-form textarea {
      width:100%;border:1px solid #9f71365c;border-radius:9px;background:#210302;color:#f4dfb2;padding:0 10px;outline:none;font:inherit;font-size:12px;
    }
    .chapa-v2-form input[type="text"],.chapa-v2-form input[type="date"] { height:40px; }
    .chapa-v2-form textarea { min-height:76px;padding-top:9px;resize:vertical; }
    .chapa-v2-note,.chapa-v2-repeat,.chapa-v2-message,.chapa-v2-actions { grid-column:1 / -1; }
    .chapa-v2-repeat { display:flex !important;align-items:center;gap:8px !important; }
    .chapa-v2-repeat input { accent-color:#d8aa3f; }
    .chapa-v2-message { min-height:16px;margin:0;color:#efb789;font-size:10px; }
    .chapa-v2-actions { display:flex;justify-content:flex-end;gap:8px; }
    .chapa-v2-actions button { height:36px;padding:0 13px;border-radius:9px;font-size:11px; }
    .chapa-v2-cancel { border:1px solid #91663166;background:#290403;color:#c2a281; }
    .chapa-v2-save { border:1px solid #d4a43a;background:linear-gradient(100deg,#8a1b13,#5d0d09);color:#ffe28c; }
    .chapa-v2-save:disabled { opacity:.55; }

    @media(max-width:740px){
      .event-family-filter-v2 { height:34px;padding:0 10px;font-size:10px; }
      .event-family-filter-v2 small { display:none; }
      .chapa-v2-toolbar { margin:10px 14px 4px;padding:10px; }
      .chapa-v2-copy span { max-width:190px; }
      .chapa-v2-add { height:34px;padding:0 10px;font-size:10px; }
      .chapa-v2-dialog { align-items:end;padding:0; }
      .chapa-v2-card { width:100%;max-height:88vh;border-radius:18px 18px 0 0;border-bottom:0; }
      .chapa-v2-form { grid-template-columns:1fr;gap:10px; }
      .chapa-v2-note,.chapa-v2-repeat,.chapa-v2-message,.chapa-v2-actions { grid-column:1; }
    }
    .mode-mobile .event-family-filter-v2 { height:34px;padding:0 10px;font-size:10px; }
    .mode-mobile .event-family-filter-v2 small { display:none; }
    .mode-mobile .chapa-v2-toolbar { margin:10px 14px 4px;padding:10px; }
    .mode-mobile .chapa-v2-dialog { align-items:end;padding:0; }
    .mode-mobile .chapa-v2-card { width:100%;max-height:88vh;border-radius:18px 18px 0 0;border-bottom:0; }
    .mode-mobile .chapa-v2-form { grid-template-columns:1fr;gap:10px; }
  `}</style>;
}
