'use client';

import { useEffect } from 'react';

function isMobileLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || shell?.dataset.autoDisplay === 'mobile';
}

export default function GenerationFilterInfo() {
  useEffect(() => {
    let frame = 0;
    let sequence = 0;

    const triggerFor = (popover: HTMLElement) => {
      const triggerId = popover.dataset.triggerId;
      return triggerId ? document.getElementById(triggerId) : null;
    };

    const closeAll = (except?: HTMLElement | null) => {
      document.querySelectorAll<HTMLElement>('.mobile-generation-info-popover.is-open').forEach((popover) => {
        if (except && popover === except) return;
        popover.classList.remove('is-open');
        popover.setAttribute('aria-hidden', 'true');
        triggerFor(popover)?.setAttribute('aria-expanded', 'false');
      });
    };

    const removeOrphans = () => {
      document.querySelectorAll<HTMLElement>('.mobile-generation-info-popover').forEach((popover) => {
        if (!triggerFor(popover)) popover.remove();
      });
    };

    const install = (control: HTMLElement) => {
      if (control.querySelector('.mobile-generation-info-button')) return;

      sequence += 1;
      const triggerId = `generation-info-trigger-${Date.now()}-${sequence}`;
      const panelId = `${triggerId}-panel`;

      const trigger = document.createElement('span');
      trigger.id = triggerId;
      trigger.className = 'mobile-generation-info-button';
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-label', 'Giải thích cách hiển thị cây gia phả');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', panelId);
      trigger.textContent = 'i';

      const popover = document.createElement('div');
      popover.id = panelId;
      popover.className = 'mobile-generation-info-popover';
      popover.dataset.triggerId = triggerId;
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-modal', 'false');
      popover.setAttribute('aria-hidden', 'true');
      popover.setAttribute('aria-label', 'Cách hiển thị cây gia phả');
      popover.innerHTML = `
        <div class="generation-info-header">
          <strong>Cách đọc cây gia phả</strong>
          <button type="button" class="generation-info-close" aria-label="Đóng giải thích">×</button>
        </div>
        <p><b>Tất cả các đời:</b> mọi quan hệ cha – con có trong dữ liệu phải có đường nhánh nối tương ứng. Nếu cha/mẹ và người con đều đang hiện mà đường nối bị thiếu thì đó là lỗi hiển thị cần sửa, không phải đặc tính bình thường của cây.</p>
        <p><b>Xem riêng một đời:</b> các đời khác bị ẩn. Khi cha/mẹ hoặc con thuộc đời khác không còn trên màn hình, đường nối giữa hai người đó cũng không thể hiển thị đầy đủ. Dữ liệu quan hệ vẫn được giữ nguyên.</p>
        <p><b>Ô sát nhau hoặc cách xa:</b> khoảng cách chỉ do thuật toán bố trí chừa chỗ cho các nhánh, anh/chị/em, dâu/rể và hậu duệ, đồng thời tránh các ô đè lên nhau. Khoảng cách giữa hai ô không biểu thị mức độ quan hệ.</p>
        <p class="generation-info-emphasis"><b>Cách kiểm tra chắc nhất:</b> xem dòng “Con của …” trên ô thành viên. Dòng này phải khớp với nhánh cha – con trong dữ liệu; khi xem “Tất cả các đời”, đường nối cũng phải khớp theo quan hệ đó.</p>
      `;

      const setOpen = (open: boolean) => {
        if (open) closeAll(popover);
        popover.classList.toggle('is-open', open);
        popover.setAttribute('aria-hidden', open ? 'false' : 'true');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      const toggle = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(!popover.classList.contains('is-open'));
      };

      trigger.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      trigger.addEventListener('click', toggle);
      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') toggle(event);
        if (event.key === 'Escape') closeAll();
      });

      popover.addEventListener('pointerdown', (event) => event.stopPropagation());
      popover.addEventListener('click', (event) => event.stopPropagation());
      popover.querySelector<HTMLButtonElement>('.generation-info-close')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        trigger.focus({ preventScroll: true });
      });

      control.appendChild(trigger);
      document.body.appendChild(popover);
    };

    const removeInjected = () => {
      closeAll();
      document.querySelectorAll('.mobile-generation-info-button,.mobile-generation-info-popover').forEach((node) => node.remove());
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!isMobileLayout()) {
          removeInjected();
          return;
        }
        removeOrphans();
        document.querySelectorAll<HTMLElement>('.mobile-generation-control').forEach(install);
      });
    };

    const handleDocumentPointer = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.mobile-generation-info-button,.mobile-generation-info-popover')) return;
      closeAll();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll();
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('pointerdown', handleDocumentPointer, true);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', sync, { passive: true });
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', handleDocumentPointer, true);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', sync);
      window.cancelAnimationFrame(frame);
      removeInjected();
    };
  }, []);

  return <style>{`
    .mobile-generation-control {
      overflow: visible !important;
    }
    .mobile-generation-control::after {
      top: auto !important;
      right: 7px !important;
      bottom: 4px !important;
      transform: none !important;
      font-size: 11px !important;
    }
    .mobile-generation-select {
      padding-right: 42px !important;
    }

    .mobile-generation-info-button {
      position: absolute;
      z-index: 6;
      top: -1px;
      right: -1px;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      box-sizing: border-box;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #ffe49a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      font-weight: 850;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .mobile-generation-info-button::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border: 1px solid #d7ad50;
      border-radius: 999px;
      background: #62130ee8;
      box-shadow: inset 0 0 0 1px #fff2b51c;
      z-index: -1;
    }
    .mobile-generation-info-button:active {
      transform: scale(.94);
    }
    .mobile-generation-info-button:active::before {
      background: #8b2118;
    }

    .mobile-generation-info-popover {
      position: fixed;
      z-index: 2147483000;
      top: 50%;
      left: 12px;
      right: 12px;
      width: auto;
      max-width: 430px;
      max-height: calc(100dvh - 32px);
      margin: 0 auto;
      box-sizing: border-box;
      padding: 17px 17px 16px;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      border: 1px solid #d0a043;
      border-radius: 15px;
      background: #310504f7;
      box-shadow: 0 16px 42px #160101a6, inset 0 1px #f7dd8c2b;
      color: #ecd9b3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: normal;
      text-align: left;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(calc(-50% - 8px)) scale(.985);
      transform-origin: center;
      transition: opacity .16s ease, transform .16s ease, visibility .16s ease;
      -webkit-backdrop-filter: blur(18px);
      backdrop-filter: blur(18px);
    }
    .mobile-generation-info-popover.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(-50%) scale(1);
    }
    .generation-info-header {
      position: sticky;
      top: -17px;
      z-index: 2;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 36px;
      align-items: center;
      gap: 10px;
      margin: -1px -1px 11px;
      padding: 1px 1px 8px;
      background: linear-gradient(180deg,#310504 78%,#31050400);
    }
    .mobile-generation-info-popover strong {
      display: block;
      margin: 0;
      color: #ffe39a;
      font-size: 15px;
      line-height: 1.3;
      font-weight: 780;
    }
    .generation-info-close {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid #c99535;
      border-radius: 999px;
      background: #5c100bd9;
      color: #ffe49a;
      font-size: 23px;
      font-weight: 400;
      line-height: 1;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .generation-info-close:active {
      background: #8b2118;
      transform: scale(.95);
    }
    .mobile-generation-info-popover p {
      margin: 0 0 10px;
      color: #e4cfaa;
      font-size: 12.5px;
      line-height: 1.55;
    }
    .mobile-generation-info-popover p:last-child {
      margin-bottom: 0;
    }
    .mobile-generation-info-popover b {
      color: #f5d982;
      font-weight: 780;
    }
    .mobile-generation-info-popover .generation-info-emphasis {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #b47c2e66;
      color: #f3ddb0;
    }

    @media (min-width: 741px) {
      .mobile-generation-info-button,
      .mobile-generation-info-popover {
        display: none !important;
      }
      .app-shell.mode-mobile .mobile-generation-info-button {
        display: grid !important;
      }
      .app-shell.mode-mobile ~ .mobile-generation-info-popover,
      .mobile-generation-info-popover.is-open {
        display: block;
      }
    }
  `}</style>;
}
