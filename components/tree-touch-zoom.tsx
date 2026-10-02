'use client';

import { useEffect } from 'react';

type SavedStyle = {
  zoom: string;
  zoomPriority: string;
  transform: string;
  transformPriority: string;
  transformOrigin: string;
  transformOriginPriority: string;
  transition: string;
  transitionPriority: string;
};

type Gesture = {
  viewport: HTMLElement;
  target: HTMLElement;
  startDistance: number;
  startScale: number;
  contentX: number;
  contentY: number;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

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
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function zoomTarget(viewport: HTMLElement) {
  const branchTree = viewport.querySelector<HTMLElement>('.mobile-family-tree');
  if (branchTree) return branchTree;
  return viewport.querySelector<HTMLElement>('.tree-scale');
}

export default function TreeTouchZoom() {
  useEffect(() => {
    let gesture: Gesture | null = null;
    let hideTimer = 0;
    const savedStyles = new Map<HTMLElement, SavedStyle>();
    const supportsCssZoom = typeof CSS !== 'undefined' && CSS.supports?.('zoom', '1');

    const rememberStyle = (target: HTMLElement) => {
      if (savedStyles.has(target)) return;
      savedStyles.set(target, {
        zoom: target.style.getPropertyValue('zoom'),
        zoomPriority: target.style.getPropertyPriority('zoom'),
        transform: target.style.getPropertyValue('transform'),
        transformPriority: target.style.getPropertyPriority('transform'),
        transformOrigin: target.style.getPropertyValue('transform-origin'),
        transformOriginPriority: target.style.getPropertyPriority('transform-origin'),
        transition: target.style.getPropertyValue('transition'),
        transitionPriority: target.style.getPropertyPriority('transition'),
      });
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
      const indicator = indicatorFor(viewport);
      indicator.textContent = `${Math.round(scale * 100)}%`;
      indicator.classList.add('visible');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => indicator?.classList.remove('visible'), 650);
    };

    const currentScale = (target: HTMLElement) => {
      const value = Number(target.dataset.treeTouchScale ?? '1');
      return Number.isFinite(value) && value > 0 ? value : 1;
    };

    const applyScale = (target: HTMLElement, scale: number) => {
      rememberStyle(target);
      target.dataset.treeTouchScale = String(scale);
      target.style.setProperty('transition', 'none', 'important');
      if (supportsCssZoom) {
        target.style.setProperty('zoom', String(scale), 'important');
      } else {
        target.style.setProperty('transform-origin', 'top left', 'important');
        target.style.setProperty('transform', `scale(${scale})`, 'important');
      }
    };

    const endGesture = () => {
      if (!gesture) return;
      const scale = currentScale(gesture.target);
      showIndicator(gesture.viewport, scale);
      gesture = null;
      document.documentElement.removeAttribute('data-tree-pinching');
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!isMobileTreeLayout() || event.touches.length !== 2) return;
      const source = event.target instanceof Element ? event.target : null;
      const viewport = source?.closest<HTMLElement>('.tree-viewport');
      if (!viewport) return;
      const target = zoomTarget(viewport);
      if (!target) return;

      const first = event.touches[0];
      const second = event.touches[1];
      const startScale = currentScale(target);
      const point = midpoint(first, second, viewport);

      gesture = {
        viewport,
        target,
        startDistance: Math.max(1, distance(first, second)),
        startScale,
        contentX: (viewport.scrollLeft + point.x) / startScale,
        contentY: (viewport.scrollTop + point.y) / startScale,
      };

      document.documentElement.setAttribute('data-tree-pinching', 'true');
      showIndicator(viewport, startScale);
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
      const scale = clampScale(gesture.startScale * ratio);
      const point = midpoint(first, second, gesture.viewport);

      applyScale(gesture.target, scale);
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

    document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: false, capture: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchmove', onTouchMove, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', onTouchCancel, true);
      window.clearTimeout(hideTimer);
      document.documentElement.removeAttribute('data-tree-pinching');
      document.querySelectorAll('.tree-touch-zoom-indicator').forEach((node) => node.remove());

      savedStyles.forEach((saved, target) => {
        if (!target.isConnected) return;
        target.style.setProperty('zoom', saved.zoom, saved.zoomPriority);
        target.style.setProperty('transform', saved.transform, saved.transformPriority);
        target.style.setProperty('transform-origin', saved.transformOrigin, saved.transformOriginPriority);
        target.style.setProperty('transition', saved.transition, saved.transitionPriority);
        delete target.dataset.treeTouchScale;
      });
    };
  }, []);

  return <style>{`
    @media (max-width: 740px) {
      .tree-viewport {
        touch-action: pan-x pan-y !important;
        overscroll-behavior: contain;
      }
      html[data-tree-pinching='true'],
      html[data-tree-pinching='true'] body {
        overscroll-behavior: none !important;
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
