'use client';

import { useEffect } from 'react';

type ResolvedMode = 'mobile' | 'desktop';

function detectMode(): ResolvedMode {
  const viewportWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const shortestViewport = Math.min(viewportWidth, viewportHeight);
  const screenWidth = Math.round(window.screen?.width ?? viewportWidth);
  const screenHeight = Math.round(window.screen?.height ?? viewportHeight);
  const shortestScreen = Math.min(screenWidth, screenHeight);
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchDevice = navigator.maxTouchPoints > 0 || coarsePointer || noHover;

  // Phones should always use the dedicated mobile layout, even when Safari's
  // viewport temporarily widens during rotation, address-bar changes or zoom.
  if (viewportWidth <= 740) return 'mobile';
  if (touchDevice && shortestScreen <= 520) return 'mobile';

  // Small/medium touch tablets in portrait benefit from the mobile chrome,
  // while larger tablets and landscape layouts keep the desktop workspace.
  if (touchDevice && viewportWidth <= 900 && shortestViewport <= 820) return 'mobile';

  return 'desktop';
}

export default function AutoDisplayResolver() {
  useEffect(() => {
    let frame = 0;
    let lastResolved: ResolvedMode | null = null;

    const updateStatus = (shell: HTMLElement, resolved: ResolvedMode | null) => {
      const status = shell.querySelector<HTMLElement>('.display-card .setting-meta span');
      if (!status) return;
      if (!shell.classList.contains('mode-auto') || !resolved) {
        if (status.textContent !== 'Auto Scale') status.textContent = 'Auto Scale';
        return;
      }
      const label = resolved === 'mobile' ? 'Mobile' : 'Desktop';
      const next = `Auto Scale · ${label}`;
      if (status.textContent !== next) status.textContent = next;
    };

    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const shell = document.querySelector<HTMLElement>('.app-shell');
        if (!shell) return;

        const automatic = shell.classList.contains('mode-auto');
        if (!automatic) {
          shell.classList.remove('auto-resolved-mobile', 'auto-resolved-desktop');
          shell.removeAttribute('data-auto-display');
          lastResolved = null;
          updateStatus(shell, null);
          return;
        }

        const resolved = detectMode();
        shell.dataset.autoDisplay = resolved;
        shell.classList.toggle('auto-resolved-mobile', resolved === 'mobile');
        shell.classList.toggle('auto-resolved-desktop', resolved === 'desktop');

        // Reuse the mature forced-mode CSS without changing the saved setting.
        shell.classList.toggle('mode-mobile', resolved === 'mobile');
        shell.classList.toggle('mode-desktop', resolved === 'desktop');

        if (resolved !== lastResolved) {
          lastResolved = resolved;
          window.dispatchEvent(new CustomEvent('gia-pha-auto-display-change', { detail: { mode: resolved } }));
        }
        updateStatus(shell, resolved);
      });
    };

    const classObserver = new MutationObserver((records) => {
      if (records.some((record) => record.target instanceof HTMLElement && record.target.classList.contains('app-shell'))) apply();
    });

    const attachObserver = () => {
      const shell = document.querySelector<HTMLElement>('.app-shell');
      if (shell) classObserver.observe(shell, { attributes: true, attributeFilter: ['class'] });
    };

    attachObserver();
    apply();

    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true });
    window.visualViewport?.addEventListener('resize', apply, { passive: true });
    window.visualViewport?.addEventListener('scroll', apply, { passive: true });
    window.screen.orientation?.addEventListener?.('change', apply);

    const bodyObserver = new MutationObserver(() => {
      if (!document.querySelector('.app-shell')) return;
      classObserver.disconnect();
      attachObserver();
      apply();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      classObserver.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      window.screen.orientation?.removeEventListener?.('change', apply);
      const shell = document.querySelector<HTMLElement>('.app-shell');
      if (shell?.classList.contains('mode-auto')) {
        shell.classList.remove('mode-mobile', 'mode-desktop', 'auto-resolved-mobile', 'auto-resolved-desktop');
        shell.removeAttribute('data-auto-display');
      }
    };
  }, []);

  return null;
}
