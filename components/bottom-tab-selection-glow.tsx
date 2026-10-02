'use client';

import { useEffect } from 'react';

const TRACE_DURATION = 440;

function isMobileLayout() {
  return window.matchMedia('(max-width: 740px)').matches || Boolean(document.querySelector('.app-shell.mode-mobile'));
}

export default function BottomTabSelectionGlow() {
  useEffect(() => {
    let removeTimer = 0;

    const clearTrace = () => {
      window.clearTimeout(removeTimer);
      document.querySelectorAll('.bottom-tab-gold-trace').forEach((node) => node.remove());
    };

    const drawTrace = (icon: SVGElement) => {
      clearTrace();
      const rect = icon.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;

      const padding = 7;
      const trace = document.createElement('div');
      trace.className = 'bottom-tab-gold-trace';
      trace.style.left = `${rect.left - padding}px`;
      trace.style.top = `${rect.top - padding}px`;
      trace.style.width = `${rect.width + padding * 2}px`;
      trace.style.height = `${rect.height + padding * 2}px`;
      trace.setAttribute('aria-hidden', 'true');

      for (const side of ['top', 'right', 'bottom', 'left']) {
        const segment = document.createElement('span');
        segment.className = `bottom-tab-gold-segment ${side}`;
        trace.appendChild(segment);
      }

      document.body.appendChild(trace);
      removeTimer = window.setTimeout(clearTrace, TRACE_DURATION + 80);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isMobileLayout() || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('.tabs button');
      if (!button) return;
      const icon = button.querySelector<SVGElement>('svg:not(.tab-lock)');
      if (!icon) return;
      window.requestAnimationFrame(() => drawTrace(icon));
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      clearTrace();
    };
  }, []);

  return <style>{`
    .bottom-tab-gold-trace {
      position: fixed;
      z-index: 2147483001;
      pointer-events: none;
      box-sizing: border-box;
      overflow: visible;
      border: 1px solid rgba(239,190,69,.18);
      border-radius: 10px;
      box-shadow: 0 0 7px rgba(255,210,74,.30), inset 0 0 5px rgba(255,225,125,.10);
    }
    .bottom-tab-gold-segment {
      position: absolute;
      display: block;
      pointer-events: none;
      opacity: 0;
      background: linear-gradient(90deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
      filter: drop-shadow(0 0 3px #ffe38a) drop-shadow(0 0 6px #ffc62f);
    }
    .bottom-tab-gold-segment.top {
      top: -1px;
      left: 6px;
      height: 3px;
      width: calc(100% - 12px);
      transform: scaleX(0);
      transform-origin: left center;
      animation: bottom-tab-trace-x .10s linear 0s forwards;
    }
    .bottom-tab-gold-segment.right {
      top: 6px;
      right: -1px;
      width: 3px;
      height: calc(100% - 12px);
      transform: scaleY(0);
      transform-origin: center top;
      animation: bottom-tab-trace-y .10s linear .10s forwards;
      background: linear-gradient(180deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
    }
    .bottom-tab-gold-segment.bottom {
      right: 6px;
      bottom: -1px;
      height: 3px;
      width: calc(100% - 12px);
      transform: scaleX(0);
      transform-origin: right center;
      animation: bottom-tab-trace-x .10s linear .20s forwards;
    }
    .bottom-tab-gold-segment.left {
      left: -1px;
      bottom: 6px;
      width: 3px;
      height: calc(100% - 12px);
      transform: scaleY(0);
      transform-origin: center bottom;
      animation: bottom-tab-trace-y .10s linear .30s forwards;
      background: linear-gradient(180deg, transparent 0%, #ffd55d 22%, #fff7c7 52%, #ffd04a 76%, transparent 100%);
    }
    @keyframes bottom-tab-trace-x {
      0% { transform: scaleX(0); opacity: 0; }
      12% { opacity: 1; }
      88% { opacity: 1; }
      100% { transform: scaleX(1); opacity: .95; }
    }
    @keyframes bottom-tab-trace-y {
      0% { transform: scaleY(0); opacity: 0; }
      12% { opacity: 1; }
      88% { opacity: 1; }
      100% { transform: scaleY(1); opacity: .95; }
    }
    @media (prefers-reduced-motion: reduce) {
      .bottom-tab-gold-segment {
        animation-duration: .01ms !important;
        animation-delay: 0s !important;
      }
    }
  `}</style>;
}
