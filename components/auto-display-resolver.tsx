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
  const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const screenWidth = Math.round(window.screen?.width ?? viewportWidth);
  const screenHeight = Math.round(window.screen?.height ?? viewportHeight);
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

  const naturalWidth = Math.max(1, scaleBox.scrollWidth, tree.scrollWidth, tree.offsetWidth, 1360);
  const naturalHeight = Math.max(1, scaleBox.scrollHeight, tree.scrollHeight, tree.offsetHeight);
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
  if (output && output.textContent !== `${percent}%`) output.textContent = `${percent}%`;
}

function clearAutoTreeFit() {
  const viewport = document.querySelector<HTMLElement>('.tree-viewport');
  const scaleBox = viewport?.querySelector<HTMLElement>('.tree-scale');
  if (viewport) viewport.style.removeProperty('overflow-x');
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
    let lastResolved: ResolvedMode | null = null;
    let applying = false;

    const updateStatus = (shell: HTMLElement, setting: DisplaySetting, resolved: ResolvedMode | null) => {
      const status = shell.querySelector<HTMLElement>('.display-card .setting-meta span');
      if (!status) return;
      if (setting !== 'auto' || !resolved) {
        if (status.textContent !== 'Auto Scale') status.textContent = 'Auto Scale';
        return;
      }
      const next = `Auto Scale · ${resolved === 'mobile' ? 'Mobile' : 'Desktop'}`;
      if (status.textContent !== next) status.textContent = next;
    };

    const scheduleTreeFit = (setting: DisplaySetting) => {
      window.cancelAnimationFrame(treeFrame);
      treeFrame = window.requestAnimationFrame(() => {
        if (setting === 'auto') fitTreeToViewport();
        else clearAutoTreeFit();
      });
    };

    const apply = () => {
      if (applying) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const shell = document.querySelector<HTMLElement>('.app-shell');
        if (!shell) return;
        const setting = configuredMode();
        const resolved = setting === 'auto' ? detectMode() : setting;

        applying = true;
        shell.dataset.displaySetting = setting;
        shell.dataset.autoDisplay = setting === 'auto' ? resolved : '';
        shell.classList.remove('mode-auto', 'mode-mobile', 'mode-desktop', 'auto-resolved-mobile', 'auto-resolved-desktop');
        shell.classList.add(`mode-${resolved}`);
        if (setting === 'auto') shell.classList.add(`auto-resolved-${resolved}`);
        applying = false;

        if (setting === 'auto' && resolved !== lastResolved) {
          lastResolved = resolved;
          window.dispatchEvent(new CustomEvent('gia-pha-auto-display-change', { detail: { mode: resolved } }));
        } else if (setting !== 'auto') {
          lastResolved = null;
        }

        updateStatus(shell, setting, setting === 'auto' ? resolved : null);
        scheduleTreeFit(setting);
      });
    };

    const classObserver = new MutationObserver(() => {
      if (!applying) apply();
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
      const shell = document.querySelector<HTMLElement>('.app-shell');
      if (!shell) return;
      classObserver.disconnect();
      attachObserver();
      apply();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(treeFrame);
      classObserver.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      window.screen.orientation?.removeEventListener?.('change', apply);
      clearAutoTreeFit();
    };
  }, []);

  return null;
}
