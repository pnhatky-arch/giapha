'use client';

import { useEffect } from 'react';

function isMobileLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || shell?.dataset.autoDisplay === 'mobile';
}

export default function GenerationFilterInfo() {
  useEffect(() => {
    let frame = 0;

    const closeAll = (except?: HTMLElement | null) => {
      document.querySelectorAll<HTMLElement>('.mobile-generation-info-popover.is-open').forEach((popover) => {
        if (except && popover === except) return;
        popover.classList.remove('is-open');
        popover.setAttribute('aria-hidden', 'true');
        const control = popover.closest<HTMLElement>('.mobile-generation-control');
        const trigger = control?.querySelector<HTMLElement>('.mobile-generation-info-button');
        trigger?.setAttribute('aria-expanded', 'false');
      });
    };

    const install = (control: HTMLElement) => {
      if (control.querySelector('.mobile-generation-info-button')) return;

      const trigger = document.createElement('span');
      trigger.className = 'mobile-generation-info-button';
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-label', 'Giải thích cách hiển thị cây gia phả');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.textContent = 'i';

      const popover = document.createElement('div');
      popover.className = 'mobile-generation-info-popover';
      popover.setAttribute('role', 'note');
      popover.setAttribute('aria-hidden', 'true');
      popover.innerHTML = `
        <strong>Cách hiển thị cây gia phả</strong>
        <p><b>Tất cả các đời:</b> hiển thị cây đầy đủ theo nhánh cha – con, giúp xem rõ quan hệ trong toàn gia phả.</p>
        <p><b>Xem riêng một đời:</b> chỉ giữ các thành viên của đời được chọn. Vị trí các ô vẫn bám theo nhánh gốc nên khoảng cách có thể gần hoặc xa khác nhau.</p>
        <p>Các đường nối có thể không hiện đầy đủ khi cha/mẹ thuộc đời khác đang được ẩn.</p>
        <p class="generation-info-emphasis">Muốn xem rõ quan hệ cha – con – dâu – rể, hãy chọn “Tất cả các đời”.</p>
      `;

      const toggle = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextOpen = !popover.classList.contains('is-open');
        closeAll(popover);
        popover.classList.toggle('is-open', nextOpen);
        popover.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
        trigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
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
      popover.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      control.append(trigger, popover);
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!isMobileLayout()) {
          closeAll();
          return;
        }
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
      document.querySelectorAll('.mobile-generation-info-button,.mobile-generation-info-popover').forEach((node) => node.remove());
    };
  }, []);

  return <style>{`
    @media (max-width: 740px) {
      .mobile-generation-control {
        overflow: visible !important;
        z-index: 45 !important;
      }
      .mobile-generation-control::after {
        top: auto !important;
        right: 7px !important;
        bottom: 4px !important;
        transform: none !important;
        font-size: 11px !important;
      }
      .mobile-generation-select {
        padding-right: 34px !important;
      }
      .mobile-generation-info-button {
        position: absolute;
        z-index: 4;
        top: 3px;
        right: 4px;
        width: 17px;
        height: 17px;
        display: grid;
        place-items: center;
        box-sizing: border-box;
        border: 1px solid #d7ad50;
        border-radius: 999px;
        background: #62130ee8;
        color: #ffe49a;
        box-shadow: inset 0 0 0 1px #fff2b51c;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
      }
      .mobile-generation-info-button:active {
        background: #8b2118;
        transform: scale(.94);
      }
      .mobile-generation-info-popover {
        position: absolute;
        z-index: 2147482000;
        top: calc(100% + 9px);
        right: 0;
        width: 286px;
        max-width: calc(100vw - 24px);
        box-sizing: border-box;
        padding: 12px 13px;
        border: 1px solid #c99535;
        border-radius: 12px;
        background: #310504f5;
        box-shadow: 0 12px 34px #1801018f, inset 0 1px #f3d37824;
        color: #ecd9b3;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        white-space: normal;
        text-align: left;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-5px) scale(.985);
        transform-origin: top right;
        transition: opacity .14s ease, transform .14s ease, visibility .14s ease;
      }
      .mobile-generation-info-popover.is-open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }
      .mobile-generation-info-popover strong {
        display: block;
        margin: 0 0 8px;
        color: #ffe39a;
        font-size: 12px;
        line-height: 1.25;
      }
      .mobile-generation-info-popover p {
        margin: 0 0 7px;
        color: #e0c9a5;
        font-size: 10.5px;
        line-height: 1.45;
      }
      .mobile-generation-info-popover p:last-child { margin-bottom: 0; }
      .mobile-generation-info-popover b {
        color: #f4d682;
        font-weight: 750;
      }
      .mobile-generation-info-popover .generation-info-emphasis {
        padding-top: 7px;
        border-top: 1px solid #b47c2e66;
        color: #f1dbac;
      }
    }

    .mode-mobile .mobile-generation-control {
      overflow: visible !important;
      z-index: 45 !important;
    }
    .mode-mobile .mobile-generation-control::after {
      top: auto !important;
      right: 7px !important;
      bottom: 4px !important;
      transform: none !important;
      font-size: 11px !important;
    }
    .mode-mobile .mobile-generation-select { padding-right: 34px !important; }
    .mode-mobile .mobile-generation-info-button {
      position: absolute;
      z-index: 4;
      top: 3px;
      right: 4px;
      width: 17px;
      height: 17px;
      display: grid;
      place-items: center;
      box-sizing: border-box;
      border: 1px solid #d7ad50;
      border-radius: 999px;
      background: #62130ee8;
      color: #ffe49a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }
    .mode-mobile .mobile-generation-info-popover {
      position: absolute;
      z-index: 2147482000;
      top: calc(100% + 9px);
      right: 0;
      width: 286px;
      max-width: calc(100vw - 24px);
      box-sizing: border-box;
      padding: 12px 13px;
      border: 1px solid #c99535;
      border-radius: 12px;
      background: #310504f5;
      box-shadow: 0 12px 34px #1801018f, inset 0 1px #f3d37824;
      color: #ecd9b3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: normal;
      text-align: left;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(-5px) scale(.985);
      transform-origin: top right;
      transition: opacity .14s ease, transform .14s ease, visibility .14s ease;
    }
    .mode-mobile .mobile-generation-info-popover.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    .mode-mobile .mobile-generation-info-popover strong {
      display: block;
      margin: 0 0 8px;
      color: #ffe39a;
      font-size: 12px;
      line-height: 1.25;
    }
    .mode-mobile .mobile-generation-info-popover p {
      margin: 0 0 7px;
      color: #e0c9a5;
      font-size: 10.5px;
      line-height: 1.45;
    }
    .mode-mobile .mobile-generation-info-popover p:last-child { margin-bottom: 0; }
    .mode-mobile .mobile-generation-info-popover b { color: #f4d682; font-weight: 750; }
    .mode-mobile .mobile-generation-info-popover .generation-info-emphasis {
      padding-top: 7px;
      border-top: 1px solid #b47c2e66;
      color: #f1dbac;
    }
  `}</style>;
}
