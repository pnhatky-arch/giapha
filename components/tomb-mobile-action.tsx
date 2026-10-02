'use client';

import { useEffect } from 'react';

export default function TombMobileAction({ canEdit }: { canEdit: boolean }) {
  useEffect(() => {
    let frame = 0;

    const install = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      const bar = view?.querySelector<HTMLElement>('.event-filter-bar');
      if (!view || !bar) return;

      let proxy = bar.querySelector<HTMLButtonElement>('.tomb-event-action-proxy');
      if (!canEdit) {
        proxy?.remove();
        return;
      }

      if (!proxy) {
        proxy = document.createElement('button');
        proxy.type = 'button';
        proxy.className = 'tomb-event-action-proxy';
        proxy.textContent = '+ Chạp mộ';
        proxy.setAttribute('aria-label', 'Thêm lịch Chạp mộ');
        proxy.addEventListener('click', () => {
          const source = view.querySelector<HTMLButtonElement>('.tomb-event-add');
          if (source) source.click();
        });
      }

      const tombFilter = bar.querySelector<HTMLElement>('.event-filter-button[data-filter="tomb"]');
      if (tombFilter && tombFilter.nextElementSibling !== proxy) {
        tombFilter.insertAdjacentElement('afterend', proxy);
      } else if (!proxy.isConnected) {
        bar.appendChild(proxy);
      }
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(install);
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
      window.cancelAnimationFrame(frame);
      document.querySelectorAll('.tomb-event-action-proxy').forEach((node) => node.remove());
    };
  }, [canEdit]);

  return <style>{`
    .tomb-event-action-proxy { display: none; }

    @media (max-width: 740px) {
      .event-filter-bar .tomb-event-add { display: none !important; }
      .event-filter-button small { display: none !important; }
      .tomb-event-action-proxy {
        position: sticky;
        right: 0;
        z-index: 20;
        display: inline-flex;
        flex: 0 0 auto;
        min-width: max-content;
        height: 34px;
        align-items: center;
        justify-content: center;
        padding: 0 11px;
        border: 1px solid #e0b447;
        border-radius: 9px;
        background: linear-gradient(100deg,#851a12,#5d0d09);
        color: #ffe08a;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: -12px 0 14px #450806, inset 0 -2px #e7bb4f, 0 0 10px #ffd45e35;
      }
      .tomb-event-action-proxy:active { transform: scale(.97); }
    }

    .mode-mobile .event-filter-bar .tomb-event-add { display: none !important; }
    .mode-mobile .event-filter-button small { display: none !important; }
    .mode-mobile .tomb-event-action-proxy {
      position: sticky;
      right: 0;
      z-index: 20;
      display: inline-flex;
      flex: 0 0 auto;
      min-width: max-content;
      height: 34px;
      align-items: center;
      justify-content: center;
      padding: 0 11px;
      border: 1px solid #e0b447;
      border-radius: 9px;
      background: linear-gradient(100deg,#851a12,#5d0d09);
      color: #ffe08a;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: -12px 0 14px #450806, inset 0 -2px #e7bb4f, 0 0 10px #ffd45e35;
    }
  `}</style>;
}
