'use client';

import { useEffect } from 'react';

function isMobileLayout() {
  return window.matchMedia('(max-width: 740px)').matches || Boolean(document.querySelector('.app-shell.mode-mobile'));
}

export default function BottomTabSelectionGlow() {
  useEffect(() => {
    const clearLines = () => {
      document.querySelectorAll('.bottom-tab-gold-line').forEach((node) => node.remove());
    };

    const installLine = (button: HTMLButtonElement, animate: boolean) => {
      clearLines();
      if (!isMobileLayout()) return;

      const line = document.createElement('span');
      line.className = `bottom-tab-gold-line${animate ? ' run' : ' settled'}`;
      line.setAttribute('aria-hidden', 'true');
      button.appendChild(line);
    };

    const syncActiveLine = (animate = false) => {
      if (!isMobileLayout()) {
        clearLines();
        return;
      }
      const active = document.querySelector<HTMLButtonElement>('.tabs button.active');
      if (active) installLine(active, animate);
    };

    const handleClick = (event: MouseEvent) => {
      if (!isMobileLayout() || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('.tabs button');
      if (!button) return;

      // React applies the active class during this click. Wait one frame, then
      // draw the indicator on the tab that actually became active.
      window.requestAnimationFrame(() => {
        const active = document.querySelector<HTMLButtonElement>('.tabs button.active') ?? button;
        installLine(active, true);
      });
    };

    const handleResize = () => syncActiveLine(false);

    document.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize, { passive: true });
    window.requestAnimationFrame(() => syncActiveLine(false));

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      clearLines();
    };
  }, []);

  return <style>{`
    .bottom-tab-gold-line { display: none; }

    @media (max-width: 740px) {
      .tabs button {
        position: relative;
      }
      .tabs button::after {
        display: none !important;
      }
      .bottom-tab-gold-line {
        position: absolute;
        z-index: 3;
        display: block;
        top: 4px;
        left: 50%;
        width: 34px;
        height: 3px;
        border-radius: 999px;
        pointer-events: none;
        background: linear-gradient(90deg,#c89222 0%,#ffe48a 46%,#f0b92f 100%);
        box-shadow: 0 0 5px #ffd65f99,0 0 10px #ffc52f55;
        transform: translateX(-50%) scaleX(1);
        transform-origin: left center;
      }
      .bottom-tab-gold-line.run {
        animation: bottom-tab-gold-run .34s cubic-bezier(.22,.78,.28,1) forwards;
      }
      .bottom-tab-gold-line.run::after {
        content: '';
        position: absolute;
        top: -1px;
        left: -7px;
        width: 10px;
        height: 5px;
        border-radius: 999px;
        background: #fff7c7;
        box-shadow: 0 0 5px #fff0a8,0 0 9px #ffd044;
        animation: bottom-tab-gold-runner .34s cubic-bezier(.22,.78,.28,1) forwards;
      }
      .bottom-tab-gold-line.settled::after {
        display: none;
      }
    }

    .mode-mobile .tabs button {
      position: relative;
    }
    .mode-mobile .tabs button::after {
      display: none !important;
    }
    .mode-mobile .bottom-tab-gold-line {
      position: absolute;
      z-index: 3;
      display: block;
      top: 4px;
      left: 50%;
      width: 34px;
      height: 3px;
      border-radius: 999px;
      pointer-events: none;
      background: linear-gradient(90deg,#c89222 0%,#ffe48a 46%,#f0b92f 100%);
      box-shadow: 0 0 5px #ffd65f99,0 0 10px #ffc52f55;
      transform: translateX(-50%) scaleX(1);
      transform-origin: left center;
    }
    .mode-mobile .bottom-tab-gold-line.run {
      animation: bottom-tab-gold-run .34s cubic-bezier(.22,.78,.28,1) forwards;
    }
    .mode-mobile .bottom-tab-gold-line.run::after {
      content: '';
      position: absolute;
      top: -1px;
      left: -7px;
      width: 10px;
      height: 5px;
      border-radius: 999px;
      background: #fff7c7;
      box-shadow: 0 0 5px #fff0a8,0 0 9px #ffd044;
      animation: bottom-tab-gold-runner .34s cubic-bezier(.22,.78,.28,1) forwards;
    }

    @keyframes bottom-tab-gold-run {
      0% { transform: translateX(-50%) scaleX(0); opacity: .45; }
      100% { transform: translateX(-50%) scaleX(1); opacity: 1; }
    }
    @keyframes bottom-tab-gold-runner {
      0% { transform: translateX(0); opacity: 1; }
      88% { opacity: 1; }
      100% { transform: translateX(38px); opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .bottom-tab-gold-line.run,
      .bottom-tab-gold-line.run::after {
        animation: none !important;
      }
    }
  `}</style>;
}
