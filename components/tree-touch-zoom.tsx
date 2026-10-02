'use client';

import { useEffect } from 'react';

type Gesture = {
  viewport: HTMLElement;
  startDistance: number;
  startScale: number;
  contentX: number;
  contentY: number;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;
const STEP = 0.1;

function isMobileTreeLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || shell?.dataset.autoDisplay === 'mobile';
}

function distance(a: Touch, b: Touch) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function midpoint(a: Touch, b: Touch, viewport: HTMLElement) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (a.clientX + b.clientX) / 2 - rect.left,
    y: (a.clientY + b.clientY) / 2 - rect.top,
  };
}

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 1000) / 1000));
}

function currentScale(viewport: HTMLElement) {
  const value = Number(viewport.dataset.treeTouchScale ?? '1');
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function hasTree(viewport: HTMLElement) {
  return Boolean(viewport.querySelector('.mobile-family-tree, .tree-scale'));
}

export default function TreeTouchZoom() {
  useEffect(() => {
    let gesture: Gesture | null = null;
    let hideTimer = 0;
    let syncFrame = 0;
    let retainedScale = 1;

    const updateControls = (viewport: HTMLElement, scale: number) => {
      const output = viewport.querySelector<HTMLOutputElement>('.tree-touch-zoom-value');
      if (output) output.textContent = `${Math.round(scale * 100)}%`;
    };

    const indicatorFor = (viewport: HTMLElement) => {
      let indicator = viewport.querySelector<HTMLOutputElement>('.tree-touch-zoom-indicator');
      if (!indicator) {
        indicator = document.createElement('output');
        indicator.className = 'tree-touch-zoom-indicator';
        indicator.setAttribute('aria-live', 'polite');
        viewport.appendChild(indicator);
      }
      return indicator;
    };

    const showIndicator = (viewport: HTMLElement, scale: number) => {
      updateControls(viewport, scale);
      const indicator = indicatorFor(viewport);
      indicator.textContent = `${Math.round(scale * 100)}%`;
      indicator.classList.add('visible');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => indicator?.classList.remove('visible'), 650);
    };

    const applyScale = (viewport: HTMLElement, scaleInput: number) => {
      const scale = clampScale(scaleInput);
      retainedScale = scale;
      viewport.dataset.treeTouchActive = 'true';
      viewport.dataset.treeTouchScale = String(scale);
      viewport.style.setProperty('--tree-touch-scale', String(scale));
      updateControls(viewport, scale);
      return scale;
    };

    const setScaleAroundPoint = (viewport: HTMLElement, nextScale: number, pointX: number, pointY: number) => {
      const previous = currentScale(viewport);
      const contentX = (viewport.scrollLeft + pointX) / previous;
      const contentY = (viewport.scrollTop + pointY) / previous;
      const scale = applyScale(viewport, nextScale);

      window.requestAnimationFrame(() => {
        viewport.scrollLeft = Math.max(0, contentX * scale - pointX);
        viewport.scrollTop = Math.max(0, contentY * scale - pointY);
      });
      showIndicator(viewport, scale);
    };

    const changeScale = (viewport: HTMLElement, delta: number) => {
      setScaleAroundPoint(viewport, currentScale(viewport) + delta, viewport.clientWidth / 2, viewport.clientHeight / 2);
    };

    const resetScale = (viewport: HTMLElement) => {
      setScaleAroundPoint(viewport, 1, viewport.clientWidth / 2, viewport.clientHeight / 2);
    };

    const installControls = (viewport: HTMLElement) => {
      if (!hasTree(viewport)) return;
      applyScale(viewport, viewport.dataset.treeTouchScale ? currentScale(viewport) : retainedScale);

      let controls = viewport.querySelector<HTMLElement>('.tree-touch-zoom-controls');
      if (controls) return;

      controls = document.createElement('div');
      controls.className = 'tree-touch-zoom-controls';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Điều chỉnh thu phóng cây gia phả');

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'tree-touch-zoom-minus';
      minus.setAttribute('aria-label', 'Thu nhỏ cây gia phả');
      minus.textContent = '−';
      minus.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        changeScale(viewport, -STEP);
      });

      const value = document.createElement('output');
      value.className = 'tree-touch-zoom-value';
      value.textContent = `${Math.round(currentScale(viewport) * 100)}%`;
      value.setAttribute('aria-live', 'polite');

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'tree-touch-zoom-plus';
      plus.setAttribute('aria-label', 'Phóng to cây gia phả');
      plus.textContent = '+';
      plus.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        changeScale(viewport, STEP);
      });

      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'tree-touch-zoom-reset';
      reset.setAttribute('aria-label', 'Đưa cây gia phả về 100 phần trăm');
      reset.textContent = '↺';
      reset.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        resetScale(viewport);
      });

      controls.append(minus, value, plus, reset);
      viewport.appendChild(controls);
    };

    const syncControls = () => {
      window.cancelAnimationFrame(syncFrame);
      syncFrame = window.requestAnimationFrame(() => {
        const viewports = [...document.querySelectorAll<HTMLElement>('.tree-viewport')];
        if (!isMobileTreeLayout()) {
          document.querySelectorAll('.tree-touch-zoom-controls').forEach((node) => node.remove());
          viewports.forEach((viewport) => {
            viewport.removeAttribute('data-tree-touch-active');
            viewport.removeAttribute('data-tree-touch-scale');
            viewport.style.removeProperty('--tree-touch-scale');
          });
          return;
        }
        viewports.forEach(installControls);
      });
    };

    const endGesture = () => {
      if (!gesture) return;
      showIndicator(gesture.viewport, currentScale(gesture.viewport));
      gesture = null;
      document.documentElement.removeAttribute('data-tree-pinching');
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!isMobileTreeLayout() || event.touches.length !== 2) return;
      const source = event.target instanceof Element ? event.target : null;
      const viewport = source?.closest<HTMLElement>('.tree-viewport');
      if (!viewport || !hasTree(viewport)) return;

      const first = event.touches[0];
      const second = event.touches[1];
      const scale = currentScale(viewport);
      const point = midpoint(first, second, viewport);

      gesture = {
        viewport,
        startDistance: Math.max(1, distance(first, second)),
        startScale: scale,
        contentX: (viewport.scrollLeft + point.x) / scale,
        contentY: (viewport.scrollTop + point.y) / scale,
      };

      document.documentElement.setAttribute('data-tree-pinching', 'true');
      showIndicator(viewport, scale);
      event.preventDefault();
      event.stopPropagation();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!gesture || event.touches.length < 2) return;
      event.preventDefault();
      event.stopPropagation();

      const first = event.touches[0];
      const second = event.touches[1];
      const ratio = distance(first, second) / gesture.startDistance;
      const scale = applyScale(gesture.viewport, gesture.startScale * ratio);
      const point = midpoint(first, second, gesture.viewport);

      gesture.viewport.scrollLeft = Math.max(0, gesture.contentX * scale - point.x);
      gesture.viewport.scrollTop = Math.max(0, gesture.contentY * scale - point.y);
      showIndicator(gesture.viewport, scale);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!gesture) return;
      event.stopPropagation();
      if (event.touches.length < 2) endGesture();
    };

    const onTouchCancel = (event: TouchEvent) => {
      if (!gesture) return;
      event.stopPropagation();
      endGesture();
    };

    const observer = new MutationObserver(syncControls);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-mobile-family-branches'] });
    document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: false, capture: true });
    window.addEventListener('resize', syncControls, { passive: true });
    window.addEventListener('orientationchange', syncControls);
    syncControls();

    return () => {
      observer.disconnect();
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', onTouchCancel, true);
      window.removeEventListener('resize', syncControls);
      window.removeEventListener('orientationchange', syncControls);
      window.cancelAnimationFrame(syncFrame);
      window.clearTimeout(hideTimer);
      document.documentElement.removeAttribute('data-tree-pinching');
      document.querySelectorAll('.tree-touch-zoom-indicator,.tree-touch-zoom-controls').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('.tree-viewport[data-tree-touch-active]').forEach((viewport) => {
        viewport.removeAttribute('data-tree-touch-active');
        viewport.removeAttribute('data-tree-touch-scale');
        viewport.style.removeProperty('--tree-touch-scale');
      });
    };
  }, []);

  return <style>{`
    @media (max-width: 740px) {
      .tree-viewport {
        touch-action: pan-x pan-y !important;
        overscroll-behavior: contain;
      }
      .tree-viewport[data-tree-touch-active='true'] > .tree-scale,
      .tree-viewport[data-tree-touch-active='true'] > .mobile-family-tree {
        transform: scale(var(--tree-touch-scale, 1)) !important;
        transform-origin: top left !important;
        transition: none !important;
        will-change: transform !important;
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: antialiased;
        backface-visibility: hidden;
      }
      html[data-tree-pinching='true'],
      html[data-tree-pinching='true'] body {
        overscroll-behavior: none !important;
      }
      .tree-touch-zoom-controls {
        position: fixed;
        z-index: 38;
        right: 16px;
        bottom: calc(82px + env(safe-area-inset-bottom, 0px));
        height: 44px;
        display: flex;
        align-items: stretch;
        overflow: hidden;
        border: 1px solid #c79435;
        border-radius: 11px;
        background: #350604e8;
        box-shadow: 0 7px 24px #1e010166;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .tree-touch-zoom-controls button,
      .tree-touch-zoom-value {
        width: 48px;
        min-width: 48px;
        height: 44px;
        margin: 0;
        display: grid;
        place-items: center;
        border: 0;
        border-right: 1px solid #8d611f55;
        background: transparent;
        color: #e4c573;
        font-size: 19px;
        line-height: 1;
      }
      .tree-touch-zoom-value {
        width: 58px;
        min-width: 58px;
        font-size: 11px;
        font-weight: 750;
      }
      .tree-touch-zoom-controls button:last-child {
        border-right: 0;
        font-size: 17px;
      }
      .tree-touch-zoom-controls button:active {
        background: #8e1b12;
      }
      .tree-touch-zoom-indicator {
        position: sticky;
        z-index: 30;
        top: 10px;
        left: calc(100% - 70px);
        width: 58px;
        height: 30px;
        margin: 0 10px -30px auto;
        display: grid;
        place-items: center;
        border: 1px solid #d6a63f;
        border-radius: 999px;
        background: #350604e8;
        box-shadow: 0 5px 16px #1d010160;
        color: #f2d285;
        font-size: 10px;
        font-weight: 750;
        opacity: 0;
        pointer-events: none;
        transition: opacity .16s ease;
      }
      .tree-touch-zoom-indicator.visible { opacity: 1; }
    }
  `}</style>;
}
