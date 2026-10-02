'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type GenerationBand = {
  generation: number;
  top: number;
};

function selectedAllGenerations() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.generation-list button')];
  if (!buttons.length) return false;
  return buttons[0].classList.contains('selected');
}

function readGeneration(card: HTMLElement) {
  const small = card.querySelector('small');
  const match = small?.textContent?.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

export default function TreeGenerationBands() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [bands, setBands] = useState<GenerationBand[]>([]);

  useEffect(() => {
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;

    const calculate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const tree = document.querySelector<HTMLElement>('.tree');
        if (!tree || !selectedAllGenerations()) {
          setTarget(tree ?? null);
          setBands([]);
          return;
        }

        const cards = [...tree.querySelectorAll<HTMLElement>('.person-card')];
        if (!cards.length) {
          setTarget(tree);
          setBands([]);
          return;
        }

        const treeRect = tree.getBoundingClientRect();
        const scale = tree.offsetWidth > 0 ? treeRect.width / tree.offsetWidth : 1;
        const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
        const groups = new Map<number, { top: number; bottom: number }>();

        for (const card of cards) {
          const generation = readGeneration(card);
          if (!generation) continue;
          const rect = card.getBoundingClientRect();
          const top = (rect.top - treeRect.top) / safeScale;
          const bottom = (rect.bottom - treeRect.top) / safeScale;
          const current = groups.get(generation);
          groups.set(generation, current
            ? { top: Math.min(current.top, top), bottom: Math.max(current.bottom, bottom) }
            : { top, bottom });
        }

        const ordered = [...groups.entries()].sort(([left], [right]) => left - right);
        const nextBands: GenerationBand[] = ordered.map(([generation, group], index) => {
          if (index === 0) return { generation, top: Math.max(8, group.top - 34) };
          const previous = ordered[index - 1][1];
          const middle = previous.bottom + Math.max(14, (group.top - previous.bottom) / 2);
          return { generation, top: Math.min(group.top - 12, middle) };
        });

        tree.classList.add('tree-generation-banded');
        setTarget(tree);
        setBands(nextBands);

        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(calculate);
        resizeObserver.observe(tree);
      });
    };

    const observer = new MutationObserver(calculate);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    document.addEventListener('click', calculate);
    window.addEventListener('resize', calculate, { passive: true });
    window.visualViewport?.addEventListener('resize', calculate, { passive: true });
    calculate();

    return () => {
      observer.disconnect();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      document.removeEventListener('click', calculate);
      window.removeEventListener('resize', calculate);
      window.visualViewport?.removeEventListener('resize', calculate);
      document.querySelector('.tree')?.classList.remove('tree-generation-banded');
    };
  }, []);

  if (!target || !bands.length) return <style>{baseStyle}</style>;

  return <>
    {createPortal(<div className="tree-generation-bands" aria-hidden="true">
      {bands.map((band) => <div className="tree-generation-band" key={band.generation} style={{ top: band.top }}>
        <span />
        <strong>ĐỜI THỨ {band.generation}</strong>
        <span />
      </div>)}
    </div>, target)}
    <style>{baseStyle}</style>
  </>;
}

const baseStyle = `
  .tree-generation-banded {
    position: relative !important;
  }
  .tree-generation-bands {
    position: absolute;
    inset: 0;
    z-index: 8;
    pointer-events: none;
    overflow: visible;
  }
  .tree-generation-band {
    position: absolute;
    left: 50%;
    width: min(620px, 58%);
    transform: translate(-50%, -50%);
    display: grid;
    grid-template-columns: minmax(48px, 1fr) auto minmax(48px, 1fr);
    align-items: center;
    gap: 15px;
  }
  .tree-generation-band > span {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(187, 126, 27, .82));
  }
  .tree-generation-band > span:last-child {
    background: linear-gradient(90deg, rgba(187, 126, 27, .82), transparent);
  }
  .tree-generation-band strong {
    padding: 2px 9px;
    color: #8a5712;
    background: rgba(255, 247, 225, .92);
    border: 1px solid rgba(185, 125, 28, .18);
    border-radius: 999px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 700;
    letter-spacing: .18em;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(116, 56, 10, .08);
  }
  @media (max-width: 740px) {
    .tree-generation-band {
      width: min(760px, 72%);
      gap: 18px;
    }
    .tree-generation-band strong {
      font-size: 22px;
      padding: 3px 11px;
      letter-spacing: .2em;
    }
  }
`;
