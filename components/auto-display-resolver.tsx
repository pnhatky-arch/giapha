'use client';

import { useEffect } from 'react';

type ResolvedMode = 'mobile' | 'desktop';
type DisplaySetting = 'auto' | ResolvedMode;

function configuredMode(): DisplaySetting {
  const saved = localStorage.getItem('gia-pha-display-mode');
  return saved === 'mobile' || saved === 'desktop' ? saved : 'auto';
}

function detectMode(): ResolvedMode {
  const viewportWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const screenWidth = Math.round(window.screen?.width ?? viewportWidth);
  const screenHeight = Math.round(window.screen?.height ?? window.innerHeight);
  const shortestScreen = Math.min(screenWidth, screenHeight);
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchDevice = navigator.maxTouchPoints > 0 || coarsePointer || noHover;
  const phoneUserAgent = /iPhone|iPod|Android.+Mobile|Mobile/i.test(navigator.userAgent);

  if (phoneUserAgent) return 'mobile';
  if (shortestScreen <= 600) return 'mobile';
  if (viewportWidth <= 740) return 'mobile';
  if (touchDevice && viewportWidth <= 900) return 'mobile';
  return 'desktop';
}

function fitTreeToViewport() {
  const viewport = document.querySelector<HTMLElement>('.tree-viewport');
  const scaleBox = viewport?.querySelector<HTMLElement>('.tree-scale');
  const tree = scaleBox?.querySelector<HTMLElement>('.tree');
  if (!viewport || !scaleBox || !tree) return;

  const naturalWidth = Math.max(1, tree.scrollWidth, tree.offsetWidth, 1360);
  const naturalHeight = Math.max(1, tree.scrollHeight, tree.offsetHeight, 680);
  const availableWidth = Math.max(1, viewport.clientWidth - 20);
  const availableHeight = Math.max(1, viewport.clientHeight - 20);
  const scale = Math.max(0.18, Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight));
  const percent = Math.max(18, Math.min(100, Math.floor(scale * 100)));

  scaleBox.style.setProperty('transform-origin', 'top left', 'important');
  scaleBox.style.setProperty('transform', `scale(${percent / 100})`, 'important');
  scaleBox.style.setProperty('margin-left', '10px', 'important');
  scaleBox.style.setProperty('margin-right', '0', 'important');
  viewport.style.setProperty('overflow-x', 'hidden', 'important');

  const output = viewport.querySelector<HTMLOutputElement>('.zoom-controls output');
  if (output) output.textContent = `${percent}%`;
}

function clearAutoTreeFit() {
  const viewport = document.querySelector<HTMLElement>('.tree-viewport');
  const scaleBox = viewport?.querySelector<HTMLElement>('.tree-scale');
  viewport?.style.removeProperty('overflow-x');
  if (!scaleBox) return;
  scaleBox.style.removeProperty('transform-origin');
  scaleBox.style.removeProperty('margin-left');
  scaleBox.style.removeProperty('margin-right');
  scaleBox.style.removeProperty('transform');
}

export default function AutoDisplayResolver() {
  useEffect(() => {
    let frame = 0;
    let treeFrame = 0;

    const updateStatus = (shell: HTMLElement, resolved: ResolvedMode | null) => {
      const status = shell.querySelector<HTMLElement>('.display-card .setting-meta span');
      if (!status) return;
      status.textContent = resolved ? `Auto Scale · ${resolved === 'mobile' ? 'Mobile' : 'Desktop'}` : 'Auto Scale';
    };

    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const shell = document.querySelector<HTMLElement>('.app-shell');
        if (!shell) return;

        const setting = configuredMode();
        if (setting !== 'auto') {
          shell.removeAttribute('data-auto-display');
          updateStatus(shell, null);
          clearAutoTreeFit();
          return;
        }

        const resolved = detectMode();
        shell.dataset.autoDisplay = resolved;
        updateStatus(shell, resolved);

        window.cancelAnimationFrame(treeFrame);
        treeFrame = window.requestAnimationFrame(() => {
          if (document.querySelector('.tree-viewport')) fitTreeToViewport();
        });
      });
    };

    const classObserver = new MutationObserver(apply);
    const bodyObserver = new MutationObserver(() => {
      const shell = document.querySelector<HTMLElement>('.app-shell');
      if (!shell) return;
      classObserver.disconnect();
      classObserver.observe(shell, { attributes: true, attributeFilter: ['class'] });
      apply();
    });

    const shell = document.querySelector<HTMLElement>('.app-shell');
    if (shell) classObserver.observe(shell, { attributes: true, attributeFilter: ['class'] });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true });
    window.visualViewport?.addEventListener('resize', apply, { passive: true });
    window.screen.orientation?.addEventListener?.('change', apply);
    apply();

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(treeFrame);
      classObserver.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.screen.orientation?.removeEventListener?.('change', apply);
      const current = document.querySelector<HTMLElement>('.app-shell');
      current?.removeAttribute('data-auto-display');
      clearAutoTreeFit();
    };
  }, []);

  return <style>{`
    /* Auto mode is resolved through a data attribute instead of rewriting the
       React-owned className. This keeps automatic layout stable after rerenders. */
    .app-shell.mode-auto[data-auto-display="mobile"] {
      width: min(430px, 100%) !important;
      margin: 0 auto !important;
      border-inline: 1px solid #c38b3252;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .topbar {
      height: 68px !important;
      align-items: center !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .topbar::after { display: none !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .mobile-menu {
      display: grid !important;
      place-items: center !important;
      margin-left: 12px !important;
      width: 38px !important;
      height: 38px !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .brand {
      width: auto !important;
      flex: 1 !important;
      border: 0 !important;
      padding: 8px 12px !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .brand p { display: none !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .brand h1 { font-size: 16px !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .crest { width: 36px !important; height: 36px !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .account-name,
    .app-shell.mode-auto[data-auto-display="mobile"] .logout-action span { display: none !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .language-select select { width: 70px !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .tabs {
      position: fixed !important;
      z-index: 30 !important;
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
      width: min(430px, 100%) !important;
      bottom: 0 !important;
      height: 64px !important;
      background: #390604 !important;
      border-top: 1px solid #b77d2c !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .tabs button {
      flex: 1 !important;
      min-width: 0 !important;
      padding: 8px 2px 7px !important;
      flex-direction: column !important;
      gap: 2px !important;
      font-size: 8px !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .tabs svg { display: block !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .workspace { height: calc(100vh - 132px) !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .filter-panel { display: none !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .content-heading {
      height: 68px !important;
      padding: 11px 16px !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .tree-scale {
      margin-top: 16px !important;
      transform-origin: top left !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .zoom-controls {
      bottom: 78px !important;
      right: max(10px, calc((100vw - 430px) / 2 + 10px)) !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .settings-view {
      width: calc(100% - 28px) !important;
      padding: 24px 0 78px !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .settings-heading h2 { font-size: 28px !important; }
    .app-shell.mode-auto[data-auto-display="mobile"] .setting-card {
      grid-template-columns: auto minmax(0, 1fr) !important;
      padding: 18px !important;
      gap: 14px !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .setting-card > button,
    .app-shell.mode-auto[data-auto-display="mobile"] .setting-card > [data-slot="alert-dialog-trigger"],
    .app-shell.mode-auto[data-auto-display="mobile"] .display-switch,
    .app-shell.mode-auto[data-auto-display="mobile"] .language-card select {
      grid-column: 1 / -1 !important;
      width: 100% !important;
    }
    .app-shell.mode-auto[data-auto-display="mobile"] .display-switch button {
      flex: 1 !important;
      justify-content: center !important;
      padding-inline: 4px !important;
    }

    .app-shell.mode-auto[data-auto-display="desktop"] {
      width: 100% !important;
      min-width: 1100px !important;
      margin: 0 !important;
      border-inline: 0 !important;
    }
  `}</style>;
}
