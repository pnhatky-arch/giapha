'use client';

import { useEffect } from 'react';

const GLOW_DURATION = 860;

export default function GenerationSelectionGlow() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('.generation-list button');
      if (!button) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      button.getAnimations().forEach((animation) => animation.cancel());

      if (reduceMotion) {
        button.animate(
          [
            { boxShadow: 'inset 0 0 0 1px #f6d77d, 0 0 0 1px #f6d77d, 0 0 13px #ffd45e99' },
            { boxShadow: 'inset 0 0 0 1px #e7b845, 0 0 0 1px #e7b845, 0 0 6px #ffd45e55' },
          ],
          { duration: 320, easing: 'ease-out' },
        );
        return;
      }

      button.animate(
        [
          { offset: 0, borderColor: '#ffe39a', boxShadow: '0 -3px 0 #fff3b2, 0 -5px 13px #ffd34fcc, inset 0 0 0 1px #e6b342' },
          { offset: 0.24, borderColor: '#ffd55f', boxShadow: '3px 0 0 #fff3b2, 5px 0 13px #ffd34fcc, inset 0 0 0 1px #e6b342' },
          { offset: 0.49, borderColor: '#ffd55f', boxShadow: '0 3px 0 #fff3b2, 0 5px 13px #ffd34fcc, inset 0 0 0 1px #e6b342' },
          { offset: 0.74, borderColor: '#ffd55f', boxShadow: '-3px 0 0 #fff3b2, -5px 0 13px #ffd34fcc, inset 0 0 0 1px #e6b342' },
          { offset: 1, borderColor: '#f0bf47', boxShadow: '0 -3px 0 #fff3b2, 0 -5px 13px #ffd34fcc, inset 0 0 0 1px #e6b342' },
        ],
        { duration: GLOW_DURATION, easing: 'linear', iterations: 1 },
      );
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return <style>{`
    .generation-list button {
      transition: border-color .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease, transform .12s ease;
    }
    .generation-list button:active {
      transform: scale(.985);
    }
    .generation-list button.selected {
      border-color: #e4b33e;
      box-shadow: inset 3px 0 #efc65a, 0 0 10px #eabf4938;
    }
  `}</style>;
}
