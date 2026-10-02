'use client';

import { useEffect } from 'react';

type EventFilter = 'all' | 'birthday' | 'memorial' | 'tomb' | 'family';
type TextSnapshot = { source: string; target: string };
type AttributeSnapshot = { source: string; target: string };
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

const HUE_REPLACEMENTS: Array<[string, string]> = [
  ['Ngày sinh nhật và ngày dỗ được lấy từ thông tin hồ sơ thành viên.', 'Ngày sinh và ngày kỵ được lấy từ hồ sơ của bà con trong họ.'],
  ['Khách tham quan chỉ được xem cây gia phả và không thể mở Cài đặt hoặc chỉnh sửa dữ liệu.', 'Khách chỉ coi được cây gia phả, không mở Cài đặt hay sửa dữ liệu.'],
  ['Hãy thêm ngày sinh hoặc ngày mất và ngày dỗ trong hồ sơ thành viên.', 'Thêm ngày sinh, ngày mất và ngày kỵ vô hồ sơ thành viên.'],
  ['Chưa có sự kiện nào được cập nhật.', 'Chưa có sự kiện nào được ghi.'],
  ['Sự kiện gia đình', 'Sự Kiện'],
  ['Tìm thành viên', 'Tìm người trong họ'],
  ['Lặp lại hằng năm', 'Hằng năm'],
  ['Khách tham quan', 'Khách coi gia phả'],
  ['Ngày dỗ', 'Ngày kỵ'],
  ['Quay lại', 'Trở lui'],
].sort((a, b) => b[0].length - a[0].length);

function isVietnameseUi() {
  const selector = document.querySelector<HTMLSelectElement>('.language-select select, .access-language select');
  return !selector || selector.value === 'vi';
}

function hueText(value: string) {
  return HUE_REPLACEMENTS.reduce((result, [from, to]) => result.split(from).join(to), value);
}

function formatDate(value: string, repeatYearly: boolean) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('vi-VN', repeatYearly
    ? { day: '2-digit', month: 'long' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] ?? character));
}

export default function EventsHueEnhancements() {
  useEffect(() => {
    let activeFilter: EventFilter = 'all';
    let familyEvents: FamilyWorkEvent[] = [];
    let familyLoaded = false;
    let familyLoading: Promise<void> | null = null;
    let syncFrame = 0;
    let orbitTimer = 0;
    const textSnapshots = new WeakMap<Text, TextSnapshot>();
    const attributeSnapshots = new WeakMap<Element, Map<string, AttributeSnapshot>>();

    const clearFilterOrbit = () => {
      window.clearTimeout(orbitTimer);
      document.querySelectorAll('.event-filter-gold-trace').forEach((node) => node.remove());
    };

    const runFilterOrbit = (button: HTMLButtonElement) => {
      clearFilterOrbit();
      const rect = button.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      const trace = document.createElement('div');
      trace.className = 'event-filter-gold-trace';
      trace.style.left = `${rect.left - 2}px`;
      trace.style.top = `${rect.top - 2}px`;
      trace.style.width = `${rect.width + 4}px`;
      trace.style.height = `${rect.height + 4}px`;
      trace.style.borderRadius = window.getComputedStyle(button).borderRadius || '10px';
      trace.setAttribute('aria-hidden', 'true');
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const segment = document.createElement('span');
        segment.className = `event-filter-gold-segment ${side}`;
        trace.appendChild(segment);
      }
      document.body.appendChild(trace);
      orbitTimer = window.setTimeout(clearFilterOrbit, 760);
    };

    const closeEditor = () => {
      document.querySelector('.event-editor-dialog')?.remove();
    };

    const openChapaDialog = () => {
      closeEditor();
      const overlay = document.createElement('div');
      overlay.className = 'event-editor-dialog';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Thêm lịch Chạp mộ');
      overlay.innerHTML = `
        <div class="event-editor-card">
          <div class="event-editor-head">
            <div><strong>Thêm lịch Chạp mộ</strong><span>Ghi lịch Chạp mộ chung của dòng họ</span></div>
            <button type="button" class="event-editor-close" aria-label="Đóng">×</button>
          </div>
          <form class="event-editor-form">
            <label>Ngày Chạp mộ<input name="date" type="date" required></label>
            <label>Địa điểm<input name="location" type="text" maxlength="120" required placeholder="Ví dụ: Nghĩa trang dòng họ"></label>
            <label>Khu mộ / chi họ<input name="branch" type="text" maxlength="120" placeholder="Ví dụ: Khu mộ tổ · Chi trưởng"></label>
            <label class="event-editor-wide">Ghi chú<textarea name="note" maxlength="500" rows="3" placeholder="Việc chuẩn bị, giờ tập trung, lễ vật…"></textarea></label>
            <label class="event-editor-repeat event-editor-wide"><input name="repeatYearly" type="checkbox" checked><span>Hằng năm</span></label>
            <p class="event-editor-message event-editor-wide" role="alert"></p>
            <div class="event-editor-actions event-editor-wide"><button type="button" class="event-editor-cancel">Trở lui</button><button type="submit" class="event-editor-save">Lưu Chạp mộ</button></div>
          </form>
        </div>`;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('.event-editor-close')?.addEventListener('click', close);
      overlay.querySelector('.event-editor-cancel')?.addEventListener('click', close);
      overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
      const form = overlay.querySelector<HTMLFormElement>('.event-editor-form');
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = form.querySelector<HTMLElement>('.event-editor-message');
        const save = form.querySelector<HTMLButtonElement>('.event-editor-save');
        const data = new FormData(form);
        if (save) save.disabled = true;
        if (message) message.textContent = 'Đang lưu…';
        try {
          const response = await fetch('/api/events/chapa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: String(data.get('date') ?? ''),
              location: String(data.get('location') ?? ''),
              branch: String(data.get('branch') ?? ''),
              note: String(data.get('note') ?? ''),
              repeatYearly: data.get('repeatYearly') === 'on',
            }),
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

    const openFamilyDialog = (existing?: FamilyWorkEvent) => {
      closeEditor();
      const overlay = document.createElement('div');
      overlay.className = 'event-editor-dialog';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', existing ? 'Sửa Việc họ' : 'Thêm Việc họ');
      overlay.innerHTML = `
        <div class="event-editor-card">
          <div class="event-editor-head">
            <div><strong>${existing ? 'Sửa Việc họ' : 'Thêm Việc họ'}</strong><span>Ghi việc chung của dòng họ</span></div>
            <button type="button" class="event-editor-close" aria-label="Đóng">×</button>
          </div>
          <form class="event-editor-form">
            <label>Tên Việc họ<input name="title" type="text" maxlength="120" required placeholder="Ví dụ: Họp họ đầu năm" value="${escapeHtml(existing?.title ?? '')}"></label>
            <label>Ngày diễn ra<input name="date" type="date" required value="${escapeHtml(existing?.date ?? '')}"></label>
            <label class="event-editor-wide">Địa điểm<input name="location" type="text" maxlength="160" placeholder="Ví dụ: Nhà thờ họ" value="${escapeHtml(existing?.location ?? '')}"></label>
            <label class="event-editor-wide">Ghi chú<textarea name="note" maxlength="600" rows="3" placeholder="Nội dung chuẩn bị, giờ tập trung…">${escapeHtml(existing?.note ?? '')}</textarea></label>
            <label class="event-editor-repeat event-editor-wide"><input name="repeatYearly" type="checkbox" ${existing?.repeatYearly ? 'checked' : ''}><span>Hằng năm</span></label>
            <p class="event-editor-message event-editor-wide" role="alert"></p>
            <div class="event-editor-actions event-editor-wide"><button type="button" class="event-editor-cancel">Trở lui</button><button type="submit" class="event-editor-save">${existing ? 'Lưu thay đổi' : 'Lưu Việc họ'}</button></div>
          </form>
        </div>`;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('.event-editor-close')?.addEventListener('click', close);
      overlay.querySelector('.event-editor-cancel')?.addEventListener('click', close);
      overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
      const form = overlay.querySelector<HTMLFormElement>('.event-editor-form');
      form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = form.querySelector<HTMLElement>('.event-editor-message');
        const save = form.querySelector<HTMLButtonElement>('.event-editor-save');
        const data = new FormData(form);
        if (save) save.disabled = true;
        if (message) message.textContent = 'Đang lưu…';
        try {
          const response = await fetch('/api/events/family', {
            method: existing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(existing ? { id: existing.id } : {}),
              title: String(data.get('title') ?? ''),
              date: String(data.get('date') ?? ''),
              location: String(data.get('location') ?? ''),
              note: String(data.get('note') ?? ''),
              repeatYearly: data.get('repeatYearly') === 'on',
            }),
          });
          const result = await response.json() as { message?: string };
          if (!response.ok) throw new Error(result.message || 'Không thể lưu Việc họ.');
          close();
          familyLoaded = false;
          await loadFamilyEvents();
          renderFamilyEvents();
          installEventUi();
        } catch (error) {
          if (message) message.textContent = error instanceof Error ? error.message : 'Không thể lưu Việc họ.';
          if (save) save.disabled = false;
        }
      });
      window.setTimeout(() => overlay.querySelector<HTMLInputElement>('input[name="title"]')?.focus(), 20);
    };

    const deleteFamilyEvent = async (event: FamilyWorkEvent) => {
      if (!window.confirm(`Xóa Việc họ “${event.title}”?`)) return;
      const response = await fetch('/api/events/family', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) {
        window.alert(result.message || 'Không thể xóa Việc họ.');
        return;
      }
      familyLoaded = false;
      await loadFamilyEvents();
      renderFamilyEvents();
      installEventUi();
    };

    const loadFamilyEvents = async () => {
      if (familyLoaded) return;
      if (familyLoading) return familyLoading;
      familyLoading = (async () => {
        try {
          const response = await fetch('/api/events/family', { cache: 'no-store' });
          if (!response.ok) throw new Error('Không tải được Việc họ.');
          const result = await response.json() as { events?: FamilyWorkEvent[] };
          familyEvents = Array.isArray(result.events) ? result.events : [];
        } catch {
          familyEvents = [];
        } finally {
          familyLoaded = true;
          familyLoading = null;
        }
      })();
      return familyLoading;
    };

    const renderFamilyEvents = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      if (!view) return;
      let list = view.querySelector<HTMLElement>('.family-work-list');
      if (!list) {
        list = document.createElement('div');
        list.className = 'family-work-list';
        const tombList = view.querySelector('.tomb-sweeping-list');
        const nativeList = view.querySelector('.events-list');
        if (tombList) tombList.insertAdjacentElement('afterend', list);
        else if (nativeList) nativeList.insertAdjacentElement('afterend', list);
        else view.appendChild(list);
      }
      const signature = JSON.stringify(familyEvents);
      if (list.dataset.signature === signature) return;
      list.dataset.signature = signature;
      list.innerHTML = '';
      familyEvents.forEach((event) => {
        const item = document.createElement('article');
        item.className = 'family-event family-work family-work-item';
        item.dataset.eventId = event.id;
        item.innerHTML = `
          <span class="family-work-mark" aria-hidden="true">HỌ</span>
          <span class="event-copy"><em>Việc họ</em><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.location || 'Chưa ghi địa điểm')}${event.repeatYearly ? ' · Hằng năm' : ''}${event.note ? ` · ${escapeHtml(event.note)}` : ''}</small></span>
          <time datetime="${escapeHtml(event.date)}">${escapeHtml(formatDate(event.date, event.repeatYearly))}</time>
          <span class="family-work-actions"><button type="button" class="family-work-edit">Sửa</button><button type="button" class="family-work-delete">Xóa</button></span>`;
        item.querySelector('.family-work-edit')?.addEventListener('click', () => openFamilyDialog(event));
        item.querySelector('.family-work-delete')?.addEventListener('click', () => void deleteFamilyEvent(event));
        list!.appendChild(item);
      });
    };

    const applyHueWording = () => {
      const vietnamese = isVietnameseUi();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const parent = node.parentElement;
        if (parent && !parent.closest('script,style')) {
          const saved = textSnapshots.get(node);
          if (!vietnamese) {
            if (saved && node.data === saved.target) node.data = saved.source;
            textSnapshots.delete(node);
          } else if (!(saved && node.data === saved.target)) {
            const source = node.data;
            const target = hueText(source);
            if (target !== source) {
              textSnapshots.set(node, { source, target });
              node.data = target;
            } else if (saved) textSnapshots.delete(node);
          }
        }
        node = walker.nextNode() as Text | null;
      }

      document.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]').forEach((element) => {
        let snapshots = attributeSnapshots.get(element);
        if (!snapshots) {
          snapshots = new Map<string, AttributeSnapshot>();
          attributeSnapshots.set(element, snapshots);
        }
        for (const attribute of ['placeholder', 'aria-label', 'title']) {
          const current = element.getAttribute(attribute);
          if (current === null) continue;
          const saved = snapshots.get(attribute);
          if (!vietnamese) {
            if (saved && current === saved.target) element.setAttribute(attribute, saved.source);
            snapshots.delete(attribute);
            continue;
          }
          if (saved && current === saved.target) continue;
          const target = hueText(current);
          if (target !== current) {
            snapshots.set(attribute, { source: current, target });
            element.setAttribute(attribute, target);
          } else if (saved) snapshots.delete(attribute);
        }
      });
    };

    const eventKindOf = (event: HTMLElement): EventFilter | null => {
      if (event.classList.contains('memorial')) return 'memorial';
      if (event.classList.contains('birthday')) return 'birthday';
      if (event.classList.contains('tomb-sweeping') || event.classList.contains('tao-mo')) return 'tomb';
      if (event.classList.contains('family-work')) return 'family';
      return null;
    };

    const applyEventFilter = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      if (!view) return;
      let visible = 0;
      view.querySelectorAll<HTMLElement>('.family-event').forEach((event) => {
        const kind = eventKindOf(event);
        const show = activeFilter === 'all' || kind === activeFilter;
        event.hidden = !show;
        if (show) visible += 1;
      });

      view.querySelectorAll<HTMLButtonElement>('.event-filter-button').forEach((button) => {
        const selected = button.dataset.filter === activeFilter;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });

      const toolbar = view.querySelector<HTMLElement>('.event-context-toolbar');
      if (toolbar) {
        const action = toolbar.querySelector<HTMLButtonElement>('.event-context-add');
        const tombMode = activeFilter === 'tomb';
        const familyMode = activeFilter === 'family';
        toolbar.hidden = !tombMode && !familyMode;
        if (action) {
          action.dataset.action = tombMode ? 'tomb' : 'family';
          action.textContent = tombMode ? '+ Chạp mộ' : '+ Việc họ';
          action.setAttribute('aria-label', tombMode ? 'Thêm lịch Chạp mộ' : 'Thêm Việc họ');
        }
      }

      const empty = view.querySelector<HTMLElement>('.event-filter-empty');
      if (empty) {
        empty.hidden = visible > 0;
        if (activeFilter === 'tomb') {
          empty.innerHTML = '<strong>Chưa có ngày Chạp mộ được ghi</strong><span>Nhấn “+ Chạp mộ” để bổ sung lịch.</span>';
        } else if (activeFilter === 'family') {
          empty.innerHTML = '<strong>Chưa có Việc họ nào được ghi</strong><span>Nhấn “+ Việc họ” để bổ sung.</span>';
        } else if (activeFilter === 'memorial') {
          empty.innerHTML = '<strong>Chưa có ngày kỵ trong mục ni</strong><span>Bổ sung ngày kỵ trong hồ sơ người thân để hiện lịch.</span>';
        } else if (activeFilter === 'birthday') {
          empty.innerHTML = '<strong>Chưa có sinh nhật trong mục ni</strong><span>Bổ sung ngày sinh trong hồ sơ người thân để hiện lịch.</span>';
        } else {
          empty.innerHTML = '<strong>Chưa có sự kiện nào được ghi</strong><span>Bổ sung ngày sinh, ngày kỵ, Chạp mộ hoặc Việc họ để theo dõi.</span>';
        }
      }
    };

    const installEventUi = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      const heading = view?.querySelector<HTMLElement>('.events-heading');
      if (!view || !heading) return;

      const title = heading.querySelector<HTMLElement>('h2');
      if (title && isVietnameseUi() && title.textContent?.trim() !== 'Sự Kiện') title.textContent = 'Sự Kiện';
      view.dataset.eventsEnhancer = '20261002-context-actions-v5';

      const counts = {
        birthday: view.querySelectorAll('.family-event.birthday').length,
        memorial: view.querySelectorAll('.family-event.memorial').length,
        tomb: view.querySelectorAll('.family-event.tomb-sweeping,.family-event.tao-mo').length,
        family: view.querySelectorAll('.family-event.family-work').length,
      };

      let bar = view.querySelector<HTMLElement>('.event-filter-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'event-filter-bar';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', 'Lọc sự kiện');
        heading.insertAdjacentElement('afterend', bar);
      }

      const filters: Array<[EventFilter, string, number]> = [
        ['all', 'Tất cả', counts.birthday + counts.memorial + counts.tomb + counts.family],
        ['birthday', 'Sinh nhật', counts.birthday],
        ['memorial', 'Ngày kỵ', counts.memorial],
        ['tomb', 'Chạp mộ', counts.tomb],
        ['family', 'Việc họ', counts.family],
      ];

      filters.forEach(([filter, label, count]) => {
        let button = bar!.querySelector<HTMLButtonElement>(`.event-filter-button[data-filter="${filter}"]`);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'event-filter-button';
          button.dataset.filter = filter;
          button.addEventListener('click', () => {
            activeFilter = filter;
            applyEventFilter();
            window.requestAnimationFrame(() => runFilterOrbit(button!));
          });
          bar!.appendChild(button);
        }
        const labelNode = button.querySelector('span');
        const countNode = button.querySelector('small');
        if (!labelNode || !countNode) button.innerHTML = `<span>${label}</span><small>${count}</small>`;
        else {
          if (labelNode.textContent !== label) labelNode.textContent = label;
          if (countNode.textContent !== String(count)) countNode.textContent = String(count);
        }
      });

      const wanted = new Set(filters.map(([filter]) => filter));
      bar.querySelectorAll<HTMLButtonElement>('.event-filter-button').forEach((button) => {
        const filter = button.dataset.filter as EventFilter | undefined;
        if (!filter || !wanted.has(filter)) button.remove();
      });

      let toolbar = view.querySelector<HTMLElement>('.event-context-toolbar');
      if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'event-context-toolbar';
        toolbar.hidden = true;
        toolbar.innerHTML = '<button type="button" class="event-context-add"></button>';
        toolbar.querySelector<HTMLButtonElement>('.event-context-add')?.addEventListener('click', (event) => {
          const action = (event.currentTarget as HTMLButtonElement).dataset.action;
          if (action === 'tomb') openChapaDialog();
          else if (action === 'family') openFamilyDialog();
        });
        bar.insertAdjacentElement('afterend', toolbar);
      }

      let empty = view.querySelector<HTMLElement>('.event-filter-empty');
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'event-filter-empty';
        empty.hidden = true;
        toolbar.insertAdjacentElement('afterend', empty);
      }

      applyEventFilter();
    };

    const sync = () => {
      cancelAnimationFrame(syncFrame);
      syncFrame = requestAnimationFrame(() => {
        if (!document.querySelector('.events-view')) return;
        applyHueWording();
        void loadFamilyEvents().then(() => {
          renderFamilyEvents();
          installEventUi();
        });
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('change', sync, true);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('change', sync, true);
      cancelAnimationFrame(syncFrame);
      clearFilterOrbit();
      closeEditor();
      document.querySelectorAll('.event-filter-bar,.event-context-toolbar,.event-filter-empty,.family-work-list').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('.family-event').forEach((event) => { event.hidden = false; });
    };
  }, []);

  return <style>{`
    .event-filter-bar {
      display:flex;gap:8px;padding:10px 24px 12px;overflow-x:auto;scrollbar-width:none;
      border-bottom:1px solid #d5a73a24;background:#45080638;
    }
    .event-filter-bar::-webkit-scrollbar{display:none}
    .event-filter-button {
      min-width:max-content;height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 11px;
      border:1px solid #9e6c285c;border-radius:9px;background:#2d0504;color:#bfa98f;font-size:11px;
      position:relative;flex:0 0 auto;transition:border-color .18s ease,color .18s ease,background .18s ease,box-shadow .18s ease;
    }
    .event-filter-button small{min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px;border-radius:999px;background:#ffffff0c;color:#9e846d;font-size:9px}
    .event-filter-button.selected{border-color:#e0b447;background:linear-gradient(100deg,#851a12,#5d0d09);color:#ffe08a;box-shadow:inset 0 -2px #e7bb4f,0 0 10px #ffd45e28}
    .event-filter-button.selected small{color:#f4d67e;background:#f6d56c14}

    .event-context-toolbar{display:flex;justify-content:flex-end;padding:10px 24px 2px;background:#45080618}
    .event-context-toolbar[hidden]{display:none!important}
    .event-context-add{height:34px;padding:0 13px;border:1px solid #e0b447;border-radius:9px;background:linear-gradient(100deg,#851a12,#5d0d09);color:#ffe08a;font-size:11px;font-weight:800;box-shadow:inset 0 -2px #e7bb4f,0 0 10px #ffd45e28}
    .event-context-add:active{transform:scale(.97)}
    .event-filter-bar .tomb-event-add{display:none!important}

    .event-filter-empty{margin:14px 24px 18px;padding:18px;border:1px dashed #b88737;border-radius:13px;background:#3d0705aa;text-align:center}
    .event-filter-empty[hidden]{display:none}
    .event-filter-empty strong{display:block;color:#f0d17a;font-family:var(--font-serif);font-size:15px}
    .event-filter-empty span{display:block;margin-top:5px;color:#bba183;font-size:11px;line-height:1.5}
    .family-event[hidden]{display:none!important}

    .family-work-list{display:grid}
    .family-work-item{position:relative}
    .family-work-mark{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #c89739;border-radius:50%;background:#49100b;color:#f0cf72;font-family:var(--font-serif);font-size:11px;font-weight:800}
    .family-work-actions{display:inline-flex;gap:5px;margin-left:8px}
    .family-work-actions button{height:28px;padding:0 8px;border:1px solid #9e6c2855;border-radius:7px;background:#2e0504;color:#c9ad87;font-size:9px}

    .event-editor-dialog{position:fixed;inset:0;z-index:2147483200;display:grid;place-items:center;padding:18px;background:#170403c2;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .event-editor-card{width:min(520px,100%);max-height:90vh;overflow:auto;border:1px solid #c39034;border-radius:17px;background:linear-gradient(180deg,#4b0a07,#280403);box-shadow:0 24px 70px #0009,inset 0 1px #f4d77a20}
    .event-editor-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 17px 13px;border-bottom:1px solid #d0a13c32}
    .event-editor-head strong{display:block;color:#f4d57e;font-family:var(--font-serif);font-size:17px}
    .event-editor-head span{display:block;margin-top:3px;color:#b99d7c;font-size:10px}
    .event-editor-close{width:34px;height:34px;border:1px solid #a779325a;border-radius:50%;background:#2c0504;color:#d7ba8f;font-size:22px;line-height:1}
    .event-editor-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 17px 18px}
    .event-editor-form label{display:grid;gap:6px;color:#c7a982;font-size:10px}
    .event-editor-form input[type="text"],.event-editor-form input[type="date"],.event-editor-form textarea{width:100%;border:1px solid #9f71365c;border-radius:9px;background:#210302;color:#f4dfb2;padding:0 10px;outline:none;font:inherit;font-size:12px}
    .event-editor-form input[type="text"],.event-editor-form input[type="date"]{height:40px}
    .event-editor-form textarea{min-height:76px;padding-top:9px;resize:vertical}
    .event-editor-wide{grid-column:1 / -1}
    .event-editor-repeat{display:flex!important;align-items:center;gap:8px!important}
    .event-editor-repeat input{accent-color:#d8aa3f}
    .event-editor-message{min-height:16px;margin:0;color:#efb789;font-size:10px}
    .event-editor-actions{display:flex;justify-content:flex-end;gap:8px}
    .event-editor-actions button{height:36px;padding:0 13px;border-radius:9px;font-size:11px}
    .event-editor-cancel{border:1px solid #91663166;background:#290403;color:#c2a281}
    .event-editor-save{border:1px solid #d4a43a;background:linear-gradient(100deg,#8a1b13,#5d0d09);color:#ffe28c}
    .event-editor-save:disabled{opacity:.55}

    .event-filter-gold-trace{position:fixed;z-index:2147483002;pointer-events:none;box-sizing:border-box;overflow:visible;border:1px solid rgba(239,190,69,.32);box-shadow:0 0 12px rgba(255,210,74,.68),inset 0 0 7px rgba(255,225,125,.18)}
    .event-filter-gold-segment{position:absolute;display:block;pointer-events:none;opacity:0;background:linear-gradient(90deg,transparent 0%,#ffd55d 14%,#fffbd8 50%,#ffd04a 84%,transparent 100%);filter:drop-shadow(0 0 4px #ffe38a) drop-shadow(0 0 8px #ffc62f)}
    .event-filter-gold-segment.top{top:-1px;left:7px;width:calc(100% - 14px);height:3px;transform:scaleX(0);transform-origin:left center;animation:event-gold-x .16s linear 0s forwards}
    .event-filter-gold-segment.right{top:7px;right:-1px;width:3px;height:calc(100% - 14px);transform:scaleY(0);transform-origin:center top;animation:event-gold-y .16s linear .16s forwards;background:linear-gradient(180deg,transparent 0%,#ffd55d 14%,#fffbd8 50%,#ffd04a 84%,transparent 100%)}
    .event-filter-gold-segment.bottom{right:7px;bottom:-1px;width:calc(100% - 14px);height:3px;transform:scaleX(0);transform-origin:right center;animation:event-gold-x .16s linear .32s forwards}
    .event-filter-gold-segment.left{left:-1px;bottom:7px;width:3px;height:calc(100% - 14px);transform:scaleY(0);transform-origin:center bottom;animation:event-gold-y .16s linear .48s forwards;background:linear-gradient(180deg,transparent 0%,#ffd55d 14%,#fffbd8 50%,#ffd04a 84%,transparent 100%)}
    @keyframes event-gold-x{0%{transform:scaleX(0);opacity:0}8%{opacity:1}100%{transform:scaleX(1);opacity:1}}
    @keyframes event-gold-y{0%{transform:scaleY(0);opacity:0}8%{opacity:1}100%{transform:scaleY(1);opacity:1}}

    @media(max-width:740px){
      .event-filter-bar{padding:9px 14px 11px;gap:7px}
      .event-filter-button{height:34px;padding:0 10px;font-size:10px}
      .event-filter-button small{display:none}
      .event-context-toolbar{padding:9px 14px 2px}
      .event-context-add{height:34px;padding:0 11px;font-size:10px}
      .event-filter-empty{margin:12px 14px 16px}
      .family-work-mark{width:32px;height:32px;font-size:10px}
      .family-work-actions{width:100%;margin:6px 0 0;justify-content:flex-end}
      .event-editor-dialog{align-items:end;padding:0}
      .event-editor-card{width:100%;max-height:88vh;border-radius:18px 18px 0 0;border-bottom:0}
      .event-editor-form{grid-template-columns:1fr;gap:10px}
      .event-editor-wide{grid-column:1}
    }
    .mode-mobile .event-filter-bar{padding:9px 14px 11px;gap:7px}
    .mode-mobile .event-filter-button{height:34px;padding:0 10px;font-size:10px}
    .mode-mobile .event-filter-button small{display:none}
    .mode-mobile .event-context-toolbar{padding:9px 14px 2px}
    .mode-mobile .event-editor-dialog{align-items:end;padding:0}
    .mode-mobile .event-editor-card{width:100%;max-height:88vh;border-radius:18px 18px 0 0;border-bottom:0}
    .mode-mobile .event-editor-form{grid-template-columns:1fr;gap:10px}
    .mode-mobile .event-editor-wide{grid-column:1}
  `}</style>;
}
