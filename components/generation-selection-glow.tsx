'use client';

import { useEffect } from 'react';

const TRACE_DURATION = 490;
const SWIPE_THRESHOLD = 32;

function isMobileLayout() {
  return window.matchMedia('(max-width: 740px)').matches || Boolean(document.querySelector('.app-shell.mode-mobile'));
}

function generationLabel(button: HTMLButtonElement, index: number) {
  if (index === 0) return 'Tất cả các đời';
  const level = button.querySelector('.generation-dot')?.textContent?.trim();
  return level ? `Đời thứ ${level}` : `Đời thứ ${index}`;
}

export default function GenerationSelectionGlow() {
  useEffect(() => {
    let removeTimer = 0;
    let syncFrame = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTracking = false;

    const clearTrace = () => {
      window.clearTimeout(removeTimer);
      document.querySelectorAll('.generation-gold-trace').forEach((node) => node.remove());
    };

    const drawTrace = (target: HTMLElement) => {
      clearTrace();
      const rect = target.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;

      const computed = window.getComputedStyle(target);
      const trace = document.createElement('div');
      trace.className = 'generation-gold-trace';
      trace.style.left = `${rect.left - 2}px`;
      trace.style.top = `${rect.top - 2}px`;
      trace.style.width = `${rect.width + 4}px`;
      trace.style.height = `${rect.height + 4}px`;
      trace.style.borderRadius = computed.borderRadius || '11px';
      trace.setAttribute('aria-hidden', 'true');

      for (const side of ['top', 'right', 'bottom', 'left']) {
        const segment = document.createElement('span');
        segment.className = `generation-gold-segment ${side}`;
        trace.appendChild(segment);
      }

      document.body.appendChild(trace);
      removeTimer = window.setTimeout(clearTrace, TRACE_DURATION + 60);
    };

    const filterMemberRows = (value: string) => {
      const normalized = value.trim().toLocaleLowerCase('vi');
      const rows = [...document.querySelectorAll<HTMLElement>('.member-list .member-row')];
      let visible = 0;
      rows.forEach((row) => {
        const match = !normalized || (row.textContent ?? '').toLocaleLowerCase('vi').includes(normalized);
        row.style.display = match ? '' : 'none';
        if (match) visible += 1;
      });
      const output = document.querySelector<HTMLElement>('.mobile-member-search-count');
      if (output) output.textContent = normalized ? `${visible} kết quả` : `${rows.length} thành viên`;
    };

    const removeInjectedControls = () => {
      document.querySelectorAll('.mobile-generation-control,.mobile-member-search').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('.member-list .member-row').forEach((row) => { row.style.display = ''; });
    };

    const installGenerationControl = () => {
      const heading = document.querySelector<HTMLElement>('.content-heading');
      const sourceButtons = [...document.querySelectorAll<HTMLButtonElement>('.generation-list button')];
      if (!heading || sourceButtons.length === 0) return;
      if (heading.querySelector('.mobile-generation-control')) return;

      const wrapper = document.createElement('label');
      wrapper.className = 'mobile-generation-control';
      wrapper.setAttribute('aria-label', 'Hiển thị theo đời');

      const select = document.createElement('select');
      select.className = 'mobile-generation-select';
      select.setAttribute('aria-label', 'Hiển thị theo đời');

      sourceButtons.forEach((button, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = generationLabel(button, index);
        if (button.classList.contains('selected')) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const index = Number(select.value);
        const source = sourceButtons[index];
        source?.click();
        drawTrace(wrapper);
        window.requestAnimationFrame(() => {
          const current = [...document.querySelectorAll<HTMLButtonElement>('.generation-list button')];
          const selectedIndex = current.findIndex((button) => button.classList.contains('selected'));
          if (selectedIndex >= 0) select.value = String(selectedIndex);
        });
      });

      wrapper.appendChild(select);
      const resultChip = heading.querySelector('.view-chip');
      heading.insertBefore(wrapper, resultChip ?? null);
    };

    const installMemberSearch = () => {
      const manager = document.querySelector<HTMLElement>('.member-manager');
      const heading = manager?.querySelector<HTMLElement>('.member-heading');
      if (!manager || !heading || manager.querySelector('.mobile-member-search')) return;

      const search = document.createElement('label');
      search.className = 'mobile-member-search';
      search.innerHTML = '<span class="mobile-member-search-icon" aria-hidden="true">⌕</span><input type="search" placeholder="Tìm thành viên" autocomplete="off" aria-label="Tìm thành viên"><output class="mobile-member-search-count"></output>';
      heading.insertAdjacentElement('afterend', search);

      const input = search.querySelector<HTMLInputElement>('input');
      input?.addEventListener('input', () => filterMemberRows(input.value));
      filterMemberRows('');
    };

    const syncIntegratedUi = () => {
      cancelAnimationFrame(syncFrame);
      syncFrame = requestAnimationFrame(() => {
        const shell = document.querySelector<HTMLElement>('.app-shell');
        if (!isMobileLayout()) {
          shell?.classList.remove('mobile-chrome-hidden');
          removeInjectedControls();
          return;
        }

        const treeHeading = document.querySelector<HTMLElement>('.content-heading');
        if (treeHeading) installGenerationControl();
        else document.querySelector('.mobile-generation-control')?.remove();

        const memberManager = document.querySelector<HTMLElement>('.member-manager');
        if (memberManager) installMemberSearch();
        else document.querySelector('.mobile-member-search')?.remove();
      });
    };

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('.generation-list button');
      if (!button || isMobileLayout()) return;
      drawTrace(button);
    };

    const shouldIgnoreSwipe = (target: EventTarget | null) => {
      return target instanceof Element && Boolean(target.closest('input,select,textarea,button,[role="dialog"],[data-slot="dialog-content"],.generation-gold-trace'));
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isMobileLayout() || !event.touches.length || shouldIgnoreSwipe(event.target)) {
        touchTracking = false;
        return;
      }
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchTracking = true;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchTracking || !event.changedTouches.length) return;
      touchTracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dy) < SWIPE_THRESHOLD || Math.abs(dy) < Math.abs(dx) * 1.15) return;

      const shell = document.querySelector<HTMLElement>('.app-shell');
      if (!shell) return;
      shell.classList.toggle('mobile-chrome-hidden', dy < 0);
    };

    const observer = new MutationObserver(syncIntegratedUi);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('resize', syncIntegratedUi, { passive: true });
    syncIntegratedUi();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', syncIntegratedUi);
      cancelAnimationFrame(syncFrame);
      document.querySelector('.app-shell')?.classList.remove('mobile-chrome-hidden');
      removeInjectedControls();
      clearTrace();
    };
  }, []);

  return <style>{`
    .generation-list button {
      transition: border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease, transform .12s ease;
    }
    .generation-list button:active { transform: scale(.985); }
    .generation-list button.selected {
      border-color: #edbf4d !important;
      box-shadow: inset 3px 0 #f4cd65, 0 0 12px #ffd45e52 !important;
    }

    .mobile-generation-control,
    .mobile-member-search { display: none; }

    @media (max-width: 740px) {
      .mobile-menu,
      .filter-panel,
      .backdrop { display: none !important; }

      .topbar {
        transition: margin-top .22s ease, opacity .18s ease !important;
      }
      .tabs {
        transition: bottom .22s ease !important;
      }
      .workspace {
        transition: height .22s ease !important;
      }
      .app-shell.mobile-chrome-hidden .topbar {
        margin-top: -68px !important;
        opacity: 0;
        pointer-events: none;
      }
      .app-shell.mobile-chrome-hidden .tabs {
        bottom: -70px !important;
        pointer-events: none;
      }
      .app-shell.mobile-chrome-hidden .workspace {
        height: 100vh !important;
      }

      .content-heading {
        display: grid !important;
        grid-template-columns: minmax(0,1fr) auto auto;
        align-items: center;
        gap: 8px;
        padding-left: 14px !important;
        padding-right: 10px !important;
      }
      .content-heading > div:first-child { min-width: 0; }
      .content-heading h2 { white-space: nowrap; }
      .mobile-generation-control {
        display: block;
        width: 154px;
        max-width: 40vw;
        min-width: 138px;
        position: relative;
        border: 1px solid #d4a23c;
        border-radius: 9px;
        background: #3b0705;
        box-shadow: inset 0 0 0 1px #f5d66a18;
        overflow: hidden;
      }
      .mobile-generation-control::after {
        content: '⌄';
        position: absolute;
        top: 50%;
        right: 9px;
        transform: translateY(-54%);
        color: #d8ad4f;
        font-size: 14px;
        line-height: 1;
        pointer-events: none;
      }
      .mobile-generation-select {
        width: 100%;
        height: 38px;
        padding: 0 30px 0 11px;
        border: 0;
        outline: 0;
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        color: #f6d779;
        font-size: 11px;
        font-weight: 650;
        white-space: nowrap;
      }
      .content-heading .view-chip {
        flex: 0 0 auto;
        padding-left: 9px !important;
        padding-right: 9px !important;
      }

      .mobile-member-search {
        display: grid;
        grid-template-columns: auto minmax(0,1fr) auto;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px;
        min-height: 44px;
        padding: 0 11px;
        border: 1px solid #b98332;
        border-radius: 11px;
        background: #2d0504b8;
        box-shadow: inset 0 1px #f2cf7230;
      }
      .mobile-member-search-icon { color: #ddb95c; font-size: 20px; line-height: 1; }
      .mobile-member-search input {
        width: 100%;
        min-width: 0;
        height: 42px;
        border: 0;
        outline: 0;
        background: transparent;
        color: #fff1c4;
        font-size: 13px;
      }
      .mobile-member-search input::placeholder { color: #b89a78; }
      .mobile-member-search-count { color: #a88b71; font-size: 9px; white-space: nowrap; }
    }

    .mode-mobile .mobile-menu,
    .mode-mobile .filter-panel,
    .mode-mobile .backdrop { display: none !important; }
    .mode-mobile .topbar {
      transition: margin-top .22s ease, opacity .18s ease !important;
    }
    .mode-mobile .tabs {
      transition: bottom .22s ease !important;
    }
    .mode-mobile .workspace {
      transition: height .22s ease !important;
    }
    .mode-mobile.mobile-chrome-hidden .topbar {
      margin-top: -68px !important;
      opacity: 0;
      pointer-events: none;
    }
    .mode-mobile.mobile-chrome-hidden .tabs {
      bottom: -70px !important;
      pointer-events: none;
    }
    .mode-mobile.mobile-chrome-hidden .workspace {
      height: 100vh !important;
    }
    .mode-mobile .content-heading {
      display: grid !important;
      grid-template-columns: minmax(0,1fr) auto auto;
      align-items: center;
      gap: 8px;
      padding-left: 14px !important;
      padding-right: 10px !important;
    }
    .mode-mobile .content-heading > div:first-child { min-width: 0; }
    .mode-mobile .content-heading h2 { white-space: nowrap; }
    .mode-mobile .mobile-generation-control {
      display: block;
      width: 154px;
      max-width: 40vw;
      min-width: 138px;
      position: relative;
      border: 1px solid #d4a23c;
      border-radius: 9px;
      background: #3b0705;
      box-shadow: inset 0 0 0 1px #f5d66a18;
      overflow: hidden;
    }
    .mode-mobile .mobile-generation-control::after {
      content: '⌄';
      position: absolute;
      top: 50%;
      right: 9px;
      transform: translateY(-54%);
      color: #d8ad4f;
      font-size: 14px;
      line-height: 1;
      pointer-events: none;
    }
    .mode-mobile .mobile-generation-select {
      width: 100%;
      height: 38px;
      padding: 0 30px 0 11px;
      border: 0;
      outline: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      color: #f6d779;
      font-size: 11px;
      font-weight: 650;
      white-space: nowrap;
    }
    .mode-mobile .content-heading .view-chip {
      padding-left: 9px !important;
      padding-right: 9px !important;
    }
    .mode-mobile .mobile-member-search {
      display: grid;
      grid-template-columns: auto minmax(0,1fr) auto;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
      min-height: 44px;
      padding: 0 11px;
      border: 1px solid #b98332;
      border-radius: 11px;
      background: #2d0504b8;
      box-shadow: inset 0 1px #f2cf7230;
    }
    .mode-mobile .mobile-member-search-icon { color: #ddb95c; font-size: 20px; line-height: 1; }
    .mode-mobile .mobile-member-search input {
      width: 100%; min-width: 0; height: 42px; border: 0; outline: 0;
      background: transparent; color: #fff1c4; font-size: 13px;
    }
    .mode-mobile .mobile-member-search input::placeholder { color: #b89a78; }
    .mode-mobile .mobile-member-search-count { color: #a88b71; font-size: 9px; white-space: nowrap; }

    @media (max-width: 390px) {
      .mobile-generation-control,
      .mode-mobile .mobile-generation-control {
        width: 138px;
        min-width: 132px;
      }
      .mobile-generation-select,
      .mode-mobile .mobile-generation-select {
        padding-left: 9px;
        padding-right: 26px;
        font-size: 10.5px;
      }
      .content-heading h2,
      .mode-mobile .content-heading h2 {
        font-size: 18px !important;
      }
      .content-heading .view-chip,
      .mode-mobile .content-heading .view-chip {
        padding-left: 7px !important;
        padding-right: 7px !important;
      }
    }

    .generation-gold-trace {
      position: fixed;
      z-index: 2147483000;
      pointer-events: none;
      box-sizing: border-box;
      overflow: visible;
      border: 1px solid rgba(239,190,69,.24);
      box-shadow: 0 0 8px rgba(255,210,74,.34), inset 0 0 6px rgba(255,225,125,.12);
    }
    .generation-gold-segment {
      position: absolute;
      display: block;
      pointer-events: none;
      opacity: 0;
      background: linear-gradient(90deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
      filter: drop-shadow(0 0 3px #ffe38a) drop-shadow(0 0 7px #ffc62f);
    }
    .generation-gold-segment.top {
      top: -1px; left: 8px; height: 3px; width: calc(100% - 16px);
      transform: scaleX(0); transform-origin: left center;
      animation: generation-trace-x .11s linear 0s forwards;
    }
    .generation-gold-segment.right {
      top: 8px; right: -1px; width: 3px; height: calc(100% - 16px);
      transform: scaleY(0); transform-origin: center top;
      animation: generation-trace-y .11s linear .11s forwards;
      background: linear-gradient(180deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
    }
    .generation-gold-segment.bottom {
      right: 8px; bottom: -1px; height: 3px; width: calc(100% - 16px);
      transform: scaleX(0); transform-origin: right center;
      animation: generation-trace-x .11s linear .22s forwards;
    }
    .generation-gold-segment.left {
      left: -1px; bottom: 8px; width: 3px; height: calc(100% - 16px);
      transform: scaleY(0); transform-origin: center bottom;
      animation: generation-trace-y .11s linear .33s forwards;
      background: linear-gradient(180deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
    }
    @keyframes generation-trace-x {
      0% { transform: scaleX(0); opacity: 0; }
      12% { opacity: 1; }
      86% { opacity: 1; }
      100% { transform: scaleX(1); opacity: .92; }
    }
    @keyframes generation-trace-y {
      0% { transform: scaleY(0); opacity: 0; }
      12% { opacity: 1; }
      86% { opacity: 1; }
      100% { transform: scaleY(1); opacity: .92; }
    }
    @media (prefers-reduced-motion: reduce) {
      .generation-gold-segment {
        animation-duration: .01ms !important;
        animation-delay: 0s !important;
      }
      .topbar,.tabs,.workspace { transition: none !important; }
    }
  `}</style>;
}
