'use client';

import { useEffect } from 'react';

const TRACE_DURATION = 490;

export default function GenerationSelectionGlow() {
  useEffect(() => {
    let removeTimer = 0;

    const clearTrace = () => {
      window.clearTimeout(removeTimer);
      document.querySelectorAll('.generation-gold-trace').forEach((node) => node.remove());
    };

    const closeMobileMenu = (button: HTMLButtonElement) => {
      const panel = button.closest<HTMLElement>('.filter-panel');
      if (!panel?.classList.contains('open')) return;

      const isMobileViewport = window.matchMedia('(max-width: 740px)').matches;
      const isForcedMobileMode = Boolean(button.closest('.mode-mobile'));
      if (!isMobileViewport && !isForcedMobileMode) return;

      window.requestAnimationFrame(() => {
        const closeButton = panel.querySelector<HTMLButtonElement>('.close-menu');
        closeButton?.click();
      });
    };

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('.generation-list button');
      if (!button) return;

      clearTrace();

      const rect = button.getBoundingClientRect();
      const computed = window.getComputedStyle(button);
      const trace = document.createElement('div');
      trace.className = 'generation-gold-trace';
      trace.style.left = `${rect.left - 2}px`;
      trace.style.top = `${rect.top - 2}px`;
      trace.style.width = `${rect.width + 4}px`;
      trace.style.height = `${rect.height + 4}px`;
      trace.style.borderRadius = computed.borderRadius || '11px';
      trace.setAttribute('aria-hidden', 'true');

      for (const side of ['top', 'right', 'bottom', 'left']) {
        const segment = document.createElement('span');
        segment.className = `generation-gold-segment ${side}`;
        trace.appendChild(segment);
      }

      document.body.appendChild(trace);
      removeTimer = window.setTimeout(clearTrace, TRACE_DURATION + 60);
      closeMobileMenu(button);
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearTrace();
    };
  }, []);

  return <style>{`
    .generation-list button {
      transition: border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease, transform .12s ease;
    }
    .generation-list button:active {
      transform: scale(.985);
    }
    .generation-list button.selected {
      border-color: #edbf4d !important;
      box-shadow: inset 3px 0 #f4cd65, 0 0 12px #ffd45e52 !important;
    }

    .generation-gold-trace {
      position: fixed;
      z-index: 2147483000;
      pointer-events: none;
      box-sizing: border-box;
      overflow: visible;
      border: 1px solid rgba(239,190,69,.24);
      box-shadow: 0 0 8px rgba(255,210,74,.34), inset 0 0 6px rgba(255,225,125,.12);
    }
    .generation-gold-segment {
      position: absolute;
      display: block;
      pointer-events: none;
      opacity: 0;
      background: linear-gradient(90deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
      filter: drop-shadow(0 0 3px #ffe38a) drop-shadow(0 0 7px #ffc62f);
    }
    .generation-gold-segment.top {
      top: -1px;
      left: 8px;
      height: 3px;
      width: calc(100% - 16px);
      transform: scaleX(0);
      transform-origin: left center;
      animation: generation-trace-x .11s linear 0s forwards;
    }
    .generation-gold-segment.right {
      top: 8px;
      right: -1px;
      width: 3px;
      height: calc(100% - 16px);
      transform: scaleY(0);
      transform-origin: center top;
      animation: generation-trace-y .11s linear .11s forwards;
      background: linear-gradient(180deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
    }
    .generation-gold-segment.bottom {
      right: 8px;
      bottom: -1px;
      height: 3px;
      width: calc(100% - 16px);
      transform: scaleX(0);
      transform-origin: right center;
      animation: generation-trace-x .11s linear .22s forwards;
    }
    .generation-gold-segment.left {
      left: -1px;
      bottom: 8px;
      width: 3px;
      height: calc(100% - 16px);
      transform: scaleY(0);
      transform-origin: center bottom;
      animation: generation-trace-y .11s linear .33s forwards;
      background: linear-gradient(180deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
    }
    @keyframes generation-trace-x {
      0% { transform: scaleX(0); opacity: 0; }
      12% { opacity: 1; }
      86% { opacity: 1; }
      100% { transform: scaleX(1); opacity: .92; }
    }
    @keyframes generation-trace-y {
      0% { transform: scaleY(0); opacity: 0; }
      12% { opacity: 1; }
      86% { opacity: 1; }
      100% { transform: scaleY(1); opacity: .92; }
    }
    @media (prefers-reduced-motion: reduce) {
      .generation-gold-segment {
        animation-duration: .01ms !important;
        animation-delay: 0s !important;
      }
    }
  `}</style>;
}
