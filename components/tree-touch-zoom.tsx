'use client';

import { useEffect } from 'react';

type PinchGesture = {
  viewport: HTMLElement;
  startDistance: number;
  startScale: number;
  worldX: number;
  worldY: number;
};

type PanGesture = {
  viewport: HTMLElement;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;
const STEP = 0.1;
const SAFE_PAN_MARGIN = 72;

function isMobileTreeLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || shell?.dataset.autoDisplay === 'mobile';
}

function distance(a: Touch, b: Touch) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 1000) / 1000));
}

function treeTarget(viewport: HTMLElement) {
  return viewport.querySelector<HTMLElement>('.mobile-family-tree') ?? viewport.querySelector<HTMLElement>('.tree-scale');
}

function currentScale(viewport: HTMLElement) {
  const value = Number(viewport.dataset.treeTouchScale ?? '1');
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function currentPan(viewport: HTMLElement) {
  const x = Number(viewport.dataset.treePanX ?? '0');
  const y = Number(viewport.dataset.treePanY ?? '0');
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

function targetSize(target: HTMLElement) {
  return {
    width: Math.max(1, target.scrollWidth, target.offsetWidth),
    height: Math.max(1, target.scrollHeight, target.offsetHeight),
  };
}

function panBounds(viewport: HTMLElement, target: HTMLElement, scale: number) {
  const size = targetSize(target);
  const scaledWidth = size.width * scale;
  const scaledHeight = size.height * scale;
  const viewWidth = viewport.clientWidth;
  const viewHeight = viewport.clientHeight;

  const centeredX = (viewWidth - scaledWidth) / 2;
  const centeredY = (viewHeight - scaledHeight) / 2;

  return {
    minX: scaledWidth <= viewWidth ? centeredX : viewWidth - scaledWidth - SAFE_PAN_MARGIN,
    maxX: scaledWidth <= viewWidth ? centeredX : SAFE_PAN_MARGIN,
    minY: scaledHeight <= viewHeight ? centeredY : viewHeight - scaledHeight - SAFE_PAN_MARGIN,
    maxY: scaledHeight <= viewHeight ? centeredY : SAFE_PAN_MARGIN,
    scaledWidth,
    scaledHeight,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function TreeTouchZoom() {
  useEffect(() => {
    let pinch: PinchGesture | null = null;
    let pan: PanGesture | null = null;
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

    const applyView = (viewport: HTMLElement, scaleInput: number, xInput: number, yInput: number) => {
      const target = treeTarget(viewport);
      if (!target) return null;

      const scale = clampScale(scaleInput);
      const bounds = panBounds(viewport, target, scale);
      const x = clamp(xInput, bounds.minX, bounds.maxX);
      const y = clamp(yInput, bounds.minY, bounds.maxY);

      retainedScale = scale;
      viewport.dataset.treeTouchActive = 'true';
      viewport.dataset.treeTouchScale = String(scale);
      viewport.dataset.treePanX = String(x);
      viewport.dataset.treePanY = String(y);
      viewport.style.setProperty('--tree-touch-scale', String(scale));
      viewport.style.setProperty('--tree-pan-x', `${x}px`);
      viewport.style.setProperty('--tree-pan-y', `${y}px`);
      updateControls(viewport, scale);

      return { scale, x, y, bounds };
    };

    const centerTree = (viewport: HTMLElement, scaleInput = currentScale(viewport), resetVertical = false) => {
      const target = treeTarget(viewport);
      if (!target) return;
      const scale = clampScale(scaleInput);
      const bounds = panBounds(viewport, target, scale);
      const x = (viewport.clientWidth - bounds.scaledWidth) / 2;
      const previous = currentPan(viewport);
      const y = resetVertical && bounds.scaledHeight > viewport.clientHeight ? 0 : previous.y;
      applyView(viewport, scale, x, y);
    };

    const zoomAroundCenter = (viewport: HTMLElement, nextScale: number) => {
      const previousScale = currentScale(viewport);
      const previousPan = currentPan(viewport);
      const centerX = viewport.clientWidth / 2;
      const centerY = viewport.clientHeight / 2;
      const worldX = (centerX - previousPan.x) / previousScale;
      const worldY = (centerY - previousPan.y) / previousScale;
      const scale = clampScale(nextScale);
      const x = centerX - worldX * scale;
      const y = centerY - worldY * scale;
      const applied = applyView(viewport, scale, x, y);
      if (applied) showIndicator(viewport, applied.scale);
    };

    const changeScale = (viewport: HTMLElement, delta: number) => {
      zoomAroundCenter(viewport, currentScale(viewport) + delta);
    };

    const resetScale = (viewport: HTMLElement) => {
      const target = treeTarget(viewport);
      if (!target) return;
      const scale = 1;
      const bounds = panBounds(viewport, target, scale);
      const x = (viewport.clientWidth - bounds.scaledWidth) / 2;
      const y = bounds.scaledHeight <= viewport.clientHeight ? (viewport.clientHeight - bounds.scaledHeight) / 2 : 0;
      const applied = applyView(viewport, scale, x, y);
      if (applied) showIndicator(viewport, applied.scale);
    };

    const installControls = (viewport: HTMLElement) => {
      if (!treeTarget(viewport)) return;

      if (!viewport.dataset.treeTouchActive) {
        const target = treeTarget(viewport)!;
        const scale = retainedScale;
        const bounds = panBounds(viewport, target, scale);
        const x = (viewport.clientWidth - bounds.scaledWidth) / 2;
        const y = bounds.scaledHeight <= viewport.clientHeight ? (viewport.clientHeight - bounds.scaledHeight) / 2 : 0;
        applyView(viewport, scale, x, y);
      } else {
        const panValue = currentPan(viewport);
        applyView(viewport, currentScale(viewport), panValue.x, panValue.y);
      }

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
            viewport.removeAttribute('data-tree-pan-x');
            viewport.removeAttribute('data-tree-pan-y');
            viewport.style.removeProperty('--tree-touch-scale');
            viewport.style.removeProperty('--tree-pan-x');
            viewport.style.removeProperty('--tree-pan-y');
          });
          return;
        }
        viewports.forEach(installControls);
      });
    };

    const endGesture = () => {
      if (pinch) showIndicator(pinch.viewport, currentScale(pinch.viewport));
      pinch = null;
      pan = null;
      document.documentElement.removeAttribute('data-tree-pinching');
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!isMobileTreeLayout()) return;
      const source = event.target instanceof Element ? event.target : null;
      const viewport = source?.closest<HTMLElement>('.tree-viewport');
      if (!viewport || !treeTarget(viewport) || source?.closest('.tree-touch-zoom-controls')) return;

      if (event.touches.length === 2) {
        const first = event.touches[0];
        const second = event.touches[1];
        const scale = currentScale(viewport);
        const current = currentPan(viewport);
        const centerX = viewport.clientWidth / 2;
        const centerY = viewport.clientHeight / 2;

        pinch = {
          viewport,
          startDistance: Math.max(1, distance(first, second)),
          startScale: scale,
          worldX: (centerX - current.x) / scale,
          worldY: (centerY - current.y) / scale,
        };
        pan = null;
        document.documentElement.setAttribute('data-tree-pinching', 'true');
        showIndicator(viewport, scale);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const current = currentPan(viewport);
        pan = {
          viewport,
          startX: touch.clientX,
          startY: touch.clientY,
          startPanX: current.x,
          startPanY: current.y,
        };
        pinch = null;
        event.preventDefault();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pinch && event.touches.length >= 2) {
        event.preventDefault();
        event.stopPropagation();
        const ratio = distance(event.touches[0], event.touches[1]) / pinch.startDistance;
        const scale = clampScale(pinch.startScale * ratio);
        const centerX = pinch.viewport.clientWidth / 2;
        const centerY = pinch.viewport.clientHeight / 2;
        const x = centerX - pinch.worldX * scale;
        const y = centerY - pinch.worldY * scale;
        const applied = applyView(pinch.viewport, scale, x, y);
        if (applied) showIndicator(pinch.viewport, applied.scale);
        return;
      }

      if (pan && event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        const x = pan.startPanX + (touch.clientX - pan.startX);
        const y = pan.startPanY + (touch.clientY - pan.startY);
        applyView(pan.viewport, currentScale(pan.viewport), x, y);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (pinch && event.touches.length < 2) {
        endGesture();
        return;
      }
      if (pan && event.touches.length === 0) pan = null;
    };

    const onTouchCancel = () => endGesture();

    const onResize = () => {
      document.querySelectorAll<HTMLElement>('.tree-viewport[data-tree-touch-active]').forEach((viewport) => {
        const current = currentPan(viewport);
        applyView(viewport, currentScale(viewport), current.x, current.y);
        centerTree(viewport, currentScale(viewport), false);
      });
      syncControls();
    };

    const observer = new MutationObserver(syncControls);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-mobile-family-branches'] });
    document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: false, capture: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize);
    syncControls();

    return () => {
      observer.disconnect();
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', onTouchCancel, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.cancelAnimationFrame(syncFrame);
      window.clearTimeout(hideTimer);
      document.documentElement.removeAttribute('data-tree-pinching');
      document.querySelectorAll('.tree-touch-zoom-indicator,.tree-touch-zoom-controls').forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('.tree-viewport[data-tree-touch-active]').forEach((viewport) => {
        viewport.removeAttribute('data-tree-touch-active');
        viewport.removeAttribute('data-tree-touch-scale');
        viewport.removeAttribute('data-tree-pan-x');
        viewport.removeAttribute('data-tree-pan-y');
        viewport.style.removeProperty('--tree-touch-scale');
        viewport.style.removeProperty('--tree-pan-x');
        viewport.style.removeProperty('--tree-pan-y');
      });
    };
  }, []);

  return <style>{`
    @media (max-width: 740px) {
      .tree-viewport[data-tree-touch-active='true'] {
        position: relative !important;
        overflow: hidden !important;
        touch-action: none !important;
        overscroll-behavior: none !important;
      }
      .tree-viewport[data-tree-touch-active='true'] > .tree-scale,
      .tree-viewport[data-tree-touch-active='true'] > .mobile-family-tree {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        transform: translate3d(var(--tree-pan-x, 0px), var(--tree-pan-y, 0px), 0) scale(var(--tree-touch-scale, 1)) !important;
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
        position: absolute;
        z-index: 30;
        top: 10px;
        right: 10px;
        width: 58px;
        height: 30px;
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
