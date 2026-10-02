'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type CardSnapshot = {
  id: string;
  generation: number;
  name: string;
  meta: string;
  avatarText: string;
  avatarSrc: string | null;
  source: HTMLButtonElement;
};

type GenerationGroup = {
  generation: number;
  cards: CardSnapshot[];
};

function isMobileTreeLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  const resolvedAutoMobile = shell?.dataset.autoDisplay === 'mobile';
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || resolvedAutoMobile;
}

function readGeneration(card: HTMLButtonElement) {
  const small = card.querySelector('small')?.textContent ?? '';
  const matches = [...small.matchAll(/\d+/g)];
  const last = matches.at(-1)?.[0];
  return last ? Number(last) : null;
}

function readCard(card: HTMLButtonElement, sequence: number): CardSnapshot | null {
  const generation = readGeneration(card);
  const name = card.querySelector('strong')?.textContent?.trim() ?? '';
  if (!generation || !name) return null;

  if (!card.dataset.mobileTreeSourceId) card.dataset.mobileTreeSourceId = `tree-card-${sequence}`;

  const avatar = card.querySelector<HTMLElement>('.avatar-mark');
  const image = avatar?.querySelector<HTMLImageElement>('img');

  return {
    id: card.dataset.mobileTreeSourceId,
    generation,
    name,
    meta: card.querySelector('small')?.textContent?.trim() ?? `Đời thứ ${generation}`,
    avatarText: image ? '' : (avatar?.textContent?.trim() ?? name.charAt(0)),
    avatarSrc: image?.src ?? null,
    source: card,
  };
}

export default function TreeMobileGenerations() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [groups, setGroups] = useState<GenerationGroup[]>([]);
  const modelKeyRef = useRef('');

  useEffect(() => {
    let frame = 0;
    let sourceSequence = 0;

    const clearMobileLayout = () => {
      const viewport = document.querySelector<HTMLElement>('.tree-viewport');
      viewport?.removeAttribute('data-mobile-generation-layout');
      modelKeyRef.current = '';
      setTarget(null);
      setGroups([]);
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewport = document.querySelector<HTMLElement>('.tree-viewport');
        const tree = document.querySelector<HTMLElement>('.tree');

        if (!viewport || !tree || !isMobileTreeLayout()) {
          clearMobileLayout();
          return;
        }

        const cards = [...tree.querySelectorAll<HTMLButtonElement>('.person-card')];
        const parsed = cards
          .map((card) => readCard(card, ++sourceSequence))
          .filter((card): card is CardSnapshot => Boolean(card));

        if (!parsed.length) {
          clearMobileLayout();
          return;
        }

        const grouped = new Map<number, CardSnapshot[]>();
        for (const card of parsed) {
          const current = grouped.get(card.generation) ?? [];
          current.push(card);
          grouped.set(card.generation, current);
        }

        const nextGroups = [...grouped.entries()]
          .sort(([left], [right]) => left - right)
          .map(([generation, generationCards]) => ({ generation, cards: generationCards }));

        const nextKey = nextGroups
          .map((group) => `${group.generation}:${group.cards.map((card) => card.id).join(',')}`)
          .join('|');

        if (viewport.dataset.mobileGenerationLayout !== 'true') viewport.dataset.mobileGenerationLayout = 'true';
        setTarget((current) => current === viewport ? current : viewport);

        if (nextKey !== modelKeyRef.current) {
          modelKeyRef.current = nextKey;
          setGroups(nextGroups);
        }
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', sync);
    document.addEventListener('change', sync);
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync);
    window.visualViewport?.addEventListener('resize', sync, { passive: true });
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', sync);
      document.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.cancelAnimationFrame(frame);
      document.querySelector('.tree-viewport')?.removeAttribute('data-mobile-generation-layout');
    };
  }, []);

  const style = <style>{`
    .person-card .person-copy {
      min-width: 0 !important;
      overflow: hidden !important;
    }
    .person-card .person-copy strong,
    .person-card .person-copy small {
      display: block !important;
      max-width: 100% !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .tree-viewport[data-mobile-generation-layout='true'] {
      overflow-x: hidden !important;
      overflow-y: auto !important;
      scroll-behavior: smooth;
    }
    .tree-viewport[data-mobile-generation-layout='true'] > .tree-scale,
    .tree-viewport[data-mobile-generation-layout='true'] > .zoom-controls {
      display: none !important;
    }

    .mobile-generation-tree {
      position: relative;
      z-index: 5;
      width: 100%;
      min-height: 100%;
      padding: 18px 14px 112px;
      display: grid;
      gap: 24px;
      color: #35120b;
    }
    .mobile-generation-section {
      position: relative;
      display: grid;
      gap: 12px;
    }
    .mobile-generation-section + .mobile-generation-section::before {
      content: '';
      position: absolute;
      top: -24px;
      left: 50%;
      width: 1px;
      height: 18px;
      background: linear-gradient(#d7a83e55, #d7a83e);
    }
    .mobile-generation-label {
      display: grid;
      grid-template-columns: minmax(26px,1fr) auto minmax(26px,1fr);
      align-items: center;
      gap: 10px;
      width: min(100%, 320px);
      margin: 0 auto;
    }
    .mobile-generation-label span {
      height: 1px;
      background: linear-gradient(90deg, transparent, #d7a83e);
    }
    .mobile-generation-label span:last-child {
      background: linear-gradient(90deg, #d7a83e, transparent);
    }
    .mobile-generation-label strong {
      color: #f5d77e;
      font-family: var(--font-serif), Georgia, serif;
      font-size: 12px;
      line-height: 1;
      letter-spacing: .16em;
      white-space: nowrap;
    }
    .mobile-generation-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
      align-items: stretch;
    }
    .mobile-generation-card {
      min-width: 0;
      min-height: 58px;
      padding: 8px 9px;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      border: 1.5px solid #d5a435;
      border-radius: 11px;
      background: linear-gradient(140deg, #fff9e9, #efd99d);
      color: #48110a;
      box-shadow: 0 5px 13px #24010035, inset 0 0 0 2px #fff8dc, inset 0 0 0 3px #c9942f;
      text-align: left;
    }
    .mobile-generation-card:active { transform: scale(.985); }
    .mobile-generation-card:first-child:last-child,
    .mobile-generation-card:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      width: calc((100% - 9px) / 2);
      min-width: 150px;
      justify-self: center;
    }
    .mobile-generation-card.generation-root {
      width: min(100%, 235px) !important;
      grid-column: 1 / -1;
      justify-self: center;
      background: linear-gradient(135deg, #fff2bd, #e8bd54);
    }
    .mobile-generation-avatar {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border: 2px solid #d3a13a;
      border-radius: 50%;
      background: #79150e;
      color: #f5d782;
      font-family: var(--font-serif), Georgia, serif;
      font-size: 13px;
      font-weight: 800;
    }
    .mobile-generation-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .mobile-generation-copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }
    .mobile-generation-copy strong,
    .mobile-generation-copy small {
      display: block;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .mobile-generation-copy strong {
      color: #4c120b;
      font-family: var(--font-serif), Georgia, serif;
      font-size: 12.5px;
      line-height: 1.1;
      font-weight: 800;
    }
    .mobile-generation-copy small {
      color: #805d3d;
      font-size: 8.5px;
      line-height: 1.15;
    }

    @media (max-width: 350px) {
      .mobile-generation-tree { padding-left: 10px; padding-right: 10px; }
      .mobile-generation-grid { grid-template-columns: 1fr; }
      .mobile-generation-card,
      .mobile-generation-card:first-child:last-child,
      .mobile-generation-card:last-child:nth-child(odd) {
        width: 100% !important;
        grid-column: auto !important;
      }
    }
  `}</style>;

  if (!target || !groups.length) return style;

  return <>
    {createPortal(<div className="mobile-generation-tree">
      {groups.map((group) => <section className="mobile-generation-section" key={group.generation}>
        <div className="mobile-generation-label" aria-hidden="true"><span /><strong>ĐỜI THỨ {group.generation}</strong><span /></div>
        <div className="mobile-generation-grid">
          {group.cards.map((card) => <button
            type="button"
            className={`mobile-generation-card ${card.generation === 1 ? 'generation-root' : ''}`}
            key={card.id}
            title={card.name}
            onClick={() => card.source.click()}
          >
            <span className="mobile-generation-avatar">{card.avatarSrc ? <img src={card.avatarSrc} alt="" /> : card.avatarText}</span>
            <span className="mobile-generation-copy"><strong>{card.name}</strong><small>{card.meta}</small></span>
          </button>)}
        </div>
      </section>)}
    </div>, target)}
    {style}
  </>;
}
