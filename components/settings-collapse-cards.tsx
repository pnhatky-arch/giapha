'use client';

import { useEffect } from 'react';

const CARD_SELECTOR = [
  '.settings-view .setting-card',
  '.settings-view .notification-settings-card',
  '.settings-view .admin-config-card',
  '.settings-view .account-manager',
  '.settings-view .audit-log-card',
].join(',');

function cardHeader(card: HTMLElement) {
  if (card.classList.contains('setting-card')) {
    return card.querySelector<HTMLElement>('.setting-copy');
  }
  return card.querySelector<HTMLElement>('.config-title');
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button,input,select,textarea,a,label,[role="switch"]'));
}

export default function SettingsCollapseCards() {
  useEffect(() => {
    let frame = 0;

    const setCollapsed = (card: HTMLElement, header: HTMLElement, collapsed: boolean) => {
      card.classList.toggle('is-settings-collapsed', collapsed);
      card.classList.toggle('is-settings-expanded', !collapsed);
      header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };

    const installHeader = (card: HTMLElement, header: HTMLElement) => {
      if (header.dataset.settingsCollapseReady === '1') return;
      header.dataset.settingsCollapseReady = '1';
      header.classList.add('settings-collapse-header');
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.setAttribute('aria-expanded', card.classList.contains('is-settings-expanded') ? 'true' : 'false');
      header.setAttribute('aria-label', `${header.querySelector('h3,strong')?.textContent?.trim() || 'Cài đặt'}: mở hoặc thu gọn`);

      const toggle = () => setCollapsed(card, header, !card.classList.contains('is-settings-collapsed'));
      header.addEventListener('click', (event) => {
        if (isInteractiveTarget(event.target)) return;
        toggle();
      });
      header.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (isInteractiveTarget(event.target) && event.target !== header) return;
        event.preventDefault();
        toggle();
      });
    };

    const installCard = (card: HTMLElement) => {
      const header = cardHeader(card);
      if (!header) return;
      card.classList.add('settings-collapse-card');
      if (card.dataset.settingsCollapseReady !== '1') {
        card.dataset.settingsCollapseReady = '1';
        setCollapsed(card, header, true);
      }
      installHeader(card, header);
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(installCard);
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <style>{`
    .settings-view .settings-collapse-card {
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }

    .settings-view .settings-collapse-header {
      position: relative;
      min-width: 0;
      padding-right: 36px !important;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
    .settings-view .settings-collapse-header::after {
      content: '⌄';
      position: absolute;
      top: 50%;
      right: 2px;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      transform: translateY(-50%);
      border: 1px solid #b98332;
      border-radius: 999px;
      background: #3a0705b8;
      color: #e8c66c;
      font-size: 16px;
      line-height: 1;
      box-shadow: inset 0 1px #f7dd8c20;
      transition: transform .18s ease, background .18s ease;
      pointer-events: none;
    }
    .settings-view .settings-collapse-card.is-settings-expanded > .settings-collapse-header::after,
    .settings-view .setting-card.is-settings-expanded > .setting-copy.settings-collapse-header::after {
      content: '⌃';
    }
    .settings-view .settings-collapse-header:active::after {
      background: #64110de0;
    }

    /* Main settings cards keep only their icon + title while collapsed. */
    .settings-view .setting-card.settings-collapse-card.is-settings-collapsed {
      grid-template-columns: auto minmax(0,1fr) !important;
      align-items: center !important;
      min-height: 64px;
    }
    .settings-view .setting-card.settings-collapse-card.is-settings-collapsed > :not(.setting-icon):not(.setting-copy) {
      display: none !important;
    }
    .settings-view .setting-card.settings-collapse-card.is-settings-collapsed > .setting-copy > :not(h3) {
      display: none !important;
    }
    .settings-view .setting-card.settings-collapse-card.is-settings-collapsed > .setting-copy {
      align-self: center !important;
      margin: 0 !important;
    }
    .settings-view .setting-card.settings-collapse-card.is-settings-collapsed > .setting-copy h3 {
      margin: 0 !important;
    }

    /* Other settings cards already have a dedicated title row. */
    .settings-view .notification-settings-card.settings-collapse-card.is-settings-collapsed > :not(.config-title),
    .settings-view .admin-config-card.settings-collapse-card.is-settings-collapsed > :not(.config-title),
    .settings-view .account-manager.settings-collapse-card.is-settings-collapsed > :not(.config-title),
    .settings-view .audit-log-card.settings-collapse-card.is-settings-collapsed > :not(.config-title) {
      display: none !important;
    }

    .settings-view .settings-collapse-card.is-settings-collapsed .config-title > button,
    .settings-view .settings-collapse-card.is-settings-collapsed .config-title [role='button'] {
      display: none !important;
    }

    .settings-view .notification-settings-card.settings-collapse-card.is-settings-collapsed,
    .settings-view .admin-config-card.settings-collapse-card.is-settings-collapsed,
    .settings-view .account-manager.settings-collapse-card.is-settings-collapsed,
    .settings-view .audit-log-card.settings-collapse-card.is-settings-collapsed {
      min-height: 58px;
    }

    @media (max-width: 740px) {
      .settings-view .settings-collapse-header {
        padding-right: 34px !important;
      }
      .settings-view .settings-collapse-header::after {
        right: 0;
        width: 27px;
        height: 27px;
        font-size: 15px;
      }
      .settings-view .setting-card.settings-collapse-card.is-settings-collapsed {
        min-height: 58px;
      }
    }
  `}</style>;
}
