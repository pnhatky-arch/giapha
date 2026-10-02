'use client';

import { useEffect } from 'react';

type EventFilter = 'all' | 'memorial' | 'birthday' | 'tomb';
type TextSnapshot = { source: string; target: string };
type AttributeSnapshot = { source: string; target: string };

const HUE_REPLACEMENTS: Array<[string, string]> = [
  ['Ngày sinh nhật và ngày dỗ được lấy từ thông tin hồ sơ thành viên.', 'Ngày sinh và ngày kỵ được lấy từ hồ sơ của bà con trong họ.'],
  ['Khách tham quan chỉ được xem cây gia phả và không thể mở Cài đặt hoặc chỉnh sửa dữ liệu.', 'Khách chỉ coi được cây gia phả, không mở Cài đặt hay sửa dữ liệu.'],
  ['Hãy thêm ngày sinh hoặc ngày mất và ngày dỗ trong hồ sơ thành viên.', 'Thêm ngày sinh, ngày mất và ngày kỵ vô hồ sơ thành viên.'],
  ['Thành viên mới sẽ được thêm vào nhánh đã chọn.', 'Người mới sẽ được thêm vô nhánh đã chọn.'],
  ['Bạn đang xem với vai trò khách — chỉ có quyền xem', 'Đang coi với vai trò khách — chỉ có quyền xem'],
  ['Không cần tài khoản, chỉ xem nội dung', 'Không cần tài khoản, chỉ coi nội dung'],
  ['Vui lòng chọn một người thuộc gia phả.', 'Mời chọn một người trong gia phả.'],
  ['Chưa có sự kiện nào được cập nhật.', 'Chưa có sự kiện nào được ghi.'],
  ['Chọn cách bạn muốn truy cập', 'Chọn cách vô gia phả'],
  ['Tôi hiểu, tiếp tục xem', 'Đã rõ, coi tiếp'],
  ['Sự kiện gia đình', 'Sự Kiện'],
  ['Tìm thành viên', 'Tìm người trong họ'],
  ['Thêm vào nhánh của', 'Thêm vô nhánh của'],
  ['Thêm vào gia phả', 'Thêm vô gia phả'],
  ['Lặp lại hằng năm', 'Hằng năm'],
  ['Khách tham quan', 'Khách coi gia phả'],
  ['Ngày dỗ', 'Ngày kỵ'],
  ['Quay lại', 'Trở lui'],
  ['Tiếp tục xem', 'Coi tiếp'],
].sort((a, b) => b[0].length - a[0].length);

function isVietnameseUi() {
  const selector = document.querySelector<HTMLSelectElement>('.language-select select, .access-language select');
  return !selector || selector.value === 'vi';
}

function hueText(value: string) {
  return HUE_REPLACEMENTS.reduce((result, [from, to]) => result.split(from).join(to), value);
}

export default function EventsHueEnhancements() {
  useEffect(() => {
    let activeFilter: EventFilter = 'all';
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

      const computed = window.getComputedStyle(button);
      const trace = document.createElement('div');
      trace.className = 'event-filter-gold-trace';
      trace.style.left = `${rect.left - 2}px`;
      trace.style.top = `${rect.top - 2}px`;
      trace.style.width = `${rect.width + 4}px`;
      trace.style.height = `${rect.height + 4}px`;
      trace.style.borderRadius = computed.borderRadius || '10px';
      trace.setAttribute('aria-hidden', 'true');

      for (const side of ['top', 'right', 'bottom', 'left']) {
        const segment = document.createElement('span');
        segment.className = `event-filter-gold-segment ${side}`;
        trace.appendChild(segment);
      }

      document.body.appendChild(trace);
      orbitTimer = window.setTimeout(clearFilterOrbit, 760);
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
          } else if (saved && node.data === saved.target) {
            // Already localized.
          } else {
            const source = node.data;
            const target = hueText(source);
            if (target !== source) {
              textSnapshots.set(node, { source, target });
              node.data = target;
            } else if (saved) {
              textSnapshots.delete(node);
            }
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
          } else if (saved) {
            snapshots.delete(attribute);
          }
        }
      });
    };

    const eventKindOf = (event: HTMLElement): EventFilter | null => {
      if (event.classList.contains('memorial')) return 'memorial';
      if (event.classList.contains('birthday')) return 'birthday';
      if (event.classList.contains('tomb-sweeping') || event.classList.contains('tao-mo')) return 'tomb';
      return null;
    };

    const applyEventFilter = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      if (!view) return;
      const events = [...view.querySelectorAll<HTMLElement>('.family-event')];
      let visible = 0;
      events.forEach((event) => {
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

      const empty = view.querySelector<HTMLElement>('.event-filter-empty');
      if (empty) {
        empty.hidden = visible > 0;
        if (activeFilter === 'tomb') {
          empty.innerHTML = '<strong>Chưa có ngày Chạp mộ được ghi</strong><span>Nhấn “+ Chạp mộ” để bổ sung lịch.</span>';
        } else if (activeFilter === 'memorial') {
          empty.innerHTML = '<strong>Chưa có ngày kỵ trong mục ni</strong><span>Bổ sung ngày kỵ trong hồ sơ người thân để hiện lịch.</span>';
        } else if (activeFilter === 'birthday') {
          empty.innerHTML = '<strong>Chưa có sinh nhật trong mục ni</strong><span>Bổ sung ngày sinh trong hồ sơ người thân để hiện lịch.</span>';
        } else {
          empty.innerHTML = '<strong>Chưa có sự kiện nào được ghi</strong><span>Bổ sung ngày sinh, ngày kỵ hoặc lịch Chạp mộ để theo dõi.</span>';
        }
      }
    };

    const installEventFilters = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      const heading = view?.querySelector<HTMLElement>('.events-heading');
      if (!view || !heading) return;

      const title = heading.querySelector<HTMLElement>('h2');
      if (title && isVietnameseUi() && title.textContent?.trim() !== 'Sự Kiện') title.textContent = 'Sự Kiện';
      view.dataset.eventsEnhancer = '20261002-tomb-v3';

      const counts = {
        memorial: view.querySelectorAll('.family-event.memorial').length,
        birthday: view.querySelectorAll('.family-event.birthday').length,
        tomb: view.querySelectorAll('.family-event.tomb-sweeping,.family-event.tao-mo').length,
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
        ['all', 'Tất cả', counts.memorial + counts.birthday + counts.tomb],
        ['birthday', 'Sinh nhật', counts.birthday],
        ['memorial', 'Ngày kỵ', counts.memorial],
        ['tomb', 'Chạp mộ', counts.tomb],
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
        if (!labelNode || !countNode) {
          button.innerHTML = `<span>${label}</span><small>${count}</small>`;
        } else {
          if (labelNode.textContent !== label) labelNode.textContent = label;
          if (countNode.textContent !== String(count)) countNode.textContent = String(count);
        }
      });

      const wanted = new Set(filters.map(([filter]) => filter));
      bar.querySelectorAll<HTMLButtonElement>('.event-filter-button').forEach((button) => {
        const filter = button.dataset.filter as EventFilter | undefined;
        if (!filter || !wanted.has(filter)) button.remove();
      });

      let empty = view.querySelector<HTMLElement>('.event-filter-empty');
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'event-filter-empty';
        empty.hidden = true;
        bar.insertAdjacentElement('afterend', empty);
      }

      applyEventFilter();
    };

    const sync = () => {
      cancelAnimationFrame(syncFrame);
      syncFrame = requestAnimationFrame(() => {
        applyHueWording();
        installEventFilters();
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
      document.querySelectorAll('.event-filter-bar,.event-filter-empty').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('.family-event').forEach((event) => { event.hidden = false; });
    };
  }, []);

  return <style>{`
    .event-filter-bar {
      display: flex;
      gap: 8px;
      padding: 10px 24px 12px;
      overflow-x: auto;
      scrollbar-width: none;
      border-bottom: 1px solid #d5a73a24;
      background: #45080638;
    }
    .event-filter-bar::-webkit-scrollbar { display: none; }
    .event-filter-button {
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
      position: relative;
      transition: border-color .18s ease, color .18s ease, background .18s ease, box-shadow .18s ease;
    }
    .event-filter-button small {
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
    .event-filter-button.selected {
      border-color: #e0b447;
      background: linear-gradient(100deg,#851a12,#5d0d09);
      color: #ffe08a;
      box-shadow: inset 0 -2px #e7bb4f, 0 0 10px #ffd45e28;
    }
    .event-filter-button.selected small { color: #f4d67e; background: #f6d56c14; }

    .event-filter-gold-trace {
      position: fixed;
      z-index: 2147483002;
      pointer-events: none;
      box-sizing: border-box;
      overflow: visible;
      border: 1px solid rgba(239,190,69,.32);
      box-shadow: 0 0 12px rgba(255,210,74,.68), inset 0 0 7px rgba(255,225,125,.18);
    }
    .event-filter-gold-segment {
      position: absolute;
      display: block;
      pointer-events: none;
      opacity: 0;
      background: linear-gradient(90deg,transparent 0%,#ffd55d 14%,#fffbd8 50%,#ffd04a 84%,transparent 100%);
      filter: drop-shadow(0 0 4px #ffe38a) drop-shadow(0 0 8px #ffc62f);
    }
    .event-filter-gold-segment.top {
      top: -1px;
      left: 7px;
      width: calc(100% - 14px);
      height: 3px;
      transform: scaleX(0);
      transform-origin: left center;
      animation: event-filter-gold-x .16s linear 0s forwards;
    }
    .event-filter-gold-segment.right {
      top: 7px;
      right: -1px;
      width: 3px;
      height: calc(100% - 14px);
      transform: scaleY(0);
      transform-origin: center top;
      animation: event-filter-gold-y .16s linear .16s forwards;
      background: linear-gradient(180deg,transparent 0%,#ffd55d 14%,#fffbd8 50%,#ffd04a 84%,transparent 100%);
    }
    .event-filter-gold-segment.bottom {
      right: 7px;
      bottom: -1px;
      width: calc(100% - 14px);
      height: 3px;
      transform: scaleX(0);
      transform-origin: right center;
      animation: event-filter-gold-x .16s linear .32s forwards;
    }
    .event-filter-gold-segment.left {
      left: -1px;
      bottom: 7px;
      width: 3px;
      height: calc(100% - 14px);
      transform: scaleY(0);
      transform-origin: center bottom;
      animation: event-filter-gold-y .16s linear .48s forwards;
      background: linear-gradient(180deg,transparent 0%,#ffd55d 14%,#fffbd8 50%,#ffd04a 84%,transparent 100%);
    }
    @keyframes event-filter-gold-x {
      0% { transform: scaleX(0); opacity: 0; }
      8% { opacity: 1; }
      92% { opacity: 1; }
      100% { transform: scaleX(1); opacity: 1; }
    }
    @keyframes event-filter-gold-y {
      0% { transform: scaleY(0); opacity: 0; }
      8% { opacity: 1; }
      92% { opacity: 1; }
      100% { transform: scaleY(1); opacity: 1; }
    }

    .event-filter-empty {
      margin: 18px 24px;
      padding: 18px;
      border: 1px dashed #b88737;
      border-radius: 13px;
      background: #3d0705aa;
      text-align: center;
    }
    .event-filter-empty[hidden] { display: none; }
    .event-filter-empty strong { display: block; color: #f0d17a; font-family: var(--font-serif); font-size: 15px; }
    .event-filter-empty span { display: block; margin-top: 5px; color: #bba183; font-size: 11px; line-height: 1.5; }
    .family-event[hidden] { display: none !important; }

    @media (max-width: 740px) {
      .event-filter-bar { padding: 9px 14px 11px; gap: 7px; }
      .event-filter-button { height: 34px; padding: 0 10px; font-size: 10px; }
      .event-filter-empty { margin: 14px; }
    }
    .mode-mobile .event-filter-bar { padding: 9px 14px 11px; gap: 7px; }
    .mode-mobile .event-filter-button { height: 34px; padding: 0 10px; font-size: 10px; }
    .mode-mobile .event-filter-empty { margin: 14px; }
  `}</style>;
}
