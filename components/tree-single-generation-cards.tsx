'use client';

import { useEffect } from 'react';
import type { FamilyPerson } from '@/lib/family-tree';

type FamilyPayload = { family: FamilyPerson | null };

function isMobileTreeLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || shell?.dataset.autoDisplay === 'mobile';
}

function selectedGenerationIndex() {
  const select = document.querySelector<HTMLSelectElement>('.mobile-generation-select');
  if (select) return Number(select.value || 0);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.generation-list button')];
  const index = buttons.findIndex((button) => button.classList.contains('selected'));
  return index >= 0 ? index : 0;
}

function flatten(root: FamilyPerson) {
  const output: FamilyPerson[] = [];
  const walk = (person: FamilyPerson) => {
    output.push(person);
    person.children?.forEach(walk);
  };
  walk(root);
  return output;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('vi');
}

function formatDate(value?: string) {
  if (!value) return '';
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return matched ? `${matched[3]}/${matched[2]}/${matched[1]}` : value;
}

export default function TreeSingleGenerationCards() {
  useEffect(() => {
    let family: FamilyPerson | null = null;
    let people: FamilyPerson[] = [];
    let frame = 0;
    let cancelled = false;
    let lastActive = false;

    const restoreCards = () => {
      document.querySelectorAll<HTMLElement>('.tree .person-card[data-generation-card-tuned="true"]').forEach((card) => {
        const small = card.querySelector<HTMLElement>('.person-copy small');
        if (small?.dataset.originalText !== undefined) {
          small.textContent = small.dataset.originalText;
          delete small.dataset.originalText;
        }
        card.querySelector('.generation-card-dates')?.remove();
        card.removeAttribute('data-generation-card-tuned');
      });
    };

    const personForCard = (card: HTMLElement) => {
      const name = card.querySelector('strong')?.textContent?.trim() ?? '';
      const small = card.querySelector('small')?.textContent ?? '';
      const generation = Number([...small.matchAll(/\d+/g)].at(-1)?.[0] ?? 0);
      const exact = people.find((person) => normalize(person.name) === normalize(name) && person.generation === generation);
      return exact ?? people.find((person) => normalize(person.name) === normalize(name));
    };

    const tuneCards = () => {
      document.querySelectorAll<HTMLElement>('.tree .person-card').forEach((card) => {
        const person = personForCard(card);
        if (!person) return;
        const copy = card.querySelector<HTMLElement>('.person-copy');
        const small = copy?.querySelector<HTMLElement>('small');
        if (!copy || !small) return;

        if (small.dataset.originalText === undefined) small.dataset.originalText = small.textContent ?? '';
        const details = [`Đời thứ ${person.generation}`];
        if (person.role) details.push(person.role);
        if (person.relationship) details.push(person.relationship);
        small.textContent = details.join(' · ');

        let dates = card.querySelector<HTMLElement>('.generation-card-dates');
        const dateParts: string[] = [];
        if (person.birthDate) dateParts.push(`Sinh ${formatDate(person.birthDate)}`);
        if (person.deathDate) dateParts.push(`Mất ${formatDate(person.deathDate)}`);
        if (person.memorialDate) dateParts.push(`Kỵ ${formatDate(person.memorialDate)}`);
        if (dateParts.length) {
          if (!dates) {
            dates = document.createElement('span');
            dates.className = 'generation-card-dates';
            copy.appendChild(dates);
          }
          dates.textContent = dateParts.join(' · ');
        } else {
          dates?.remove();
        }
        card.setAttribute('data-generation-card-tuned', 'true');
      });
    };

    const centerTree = () => {
      const viewport = document.querySelector<HTMLElement>('.tree-viewport');
      if (!viewport) return;
      window.requestAnimationFrame(() => {
        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        viewport.scrollLeft = Math.round(maxScroll / 2);
        viewport.scrollTop = 0;
      });
    };

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const active = isMobileTreeLayout() && selectedGenerationIndex() > 0;
        document.documentElement.toggleAttribute('data-mobile-generation-detail', active);
        if (active) {
          tuneCards();
          if (!lastActive) centerTree();
        } else {
          restoreCards();
        }
        lastActive = active;
      });
    };

    const loadFamily = async () => {
      try {
        const response = await fetch('/api/family', { cache: 'no-store' });
        const payload = await response.json() as FamilyPayload;
        if (cancelled) return;
        family = payload.family ?? null;
        people = family ? flatten(family) : [];
        sync();
      } catch {
        if (!cancelled) {
          family = null;
          people = [];
          sync();
        }
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('change', sync);
    document.addEventListener('click', sync);
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync);
    void loadFamily();
    sync();

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener('change', sync);
      document.removeEventListener('click', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.cancelAnimationFrame(frame);
      document.documentElement.removeAttribute('data-mobile-generation-detail');
      restoreCards();
    };
  }, []);

  return <style>{`
    html[data-mobile-generation-detail] .tree-viewport {
      overflow-x: auto !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
    }
    html[data-mobile-generation-detail] .tree-scale {
      width: 1450px !important;
      height: auto !important;
      min-height: 800px !important;
      margin: 22px auto 120px !important;
      transform: none !important;
      transform-origin: top center !important;
    }
    html[data-mobile-generation-detail] .zoom-controls {
      display: none !important;
    }
    html[data-mobile-generation-detail] .tree .person-card,
    html[data-mobile-generation-detail] .tree .root-card,
    html[data-mobile-generation-detail] .tree .child-stack > .person-card,
    html[data-mobile-generation-detail] .tree .child-stack .person-card + .person-card {
      width: 210px !important;
      min-width: 210px !important;
      max-width: 210px !important;
      height: 108px !important;
      min-height: 108px !important;
      max-height: 108px !important;
      padding: 10px 11px !important;
      gap: 9px !important;
      align-items: center !important;
      overflow: hidden !important;
    }
    html[data-mobile-generation-detail] .tree .avatar-mark,
    html[data-mobile-generation-detail] .tree .root-card .avatar-mark {
      width: 38px !important;
      height: 38px !important;
      flex: 0 0 38px !important;
      font-size: 12px !important;
    }
    html[data-mobile-generation-detail] .tree .person-copy {
      min-width: 0 !important;
      width: 100% !important;
      display: grid !important;
      gap: 4px !important;
      overflow: visible !important;
    }
    html[data-mobile-generation-detail] .tree .person-copy strong,
    html[data-mobile-generation-detail] .tree .root-card .person-copy strong {
      margin: 0 !important;
      max-width: 100% !important;
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      font-size: 13px !important;
      line-height: 1.15 !important;
    }
    html[data-mobile-generation-detail] .tree .person-copy small {
      max-width: 100% !important;
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      font-size: 9px !important;
      line-height: 1.25 !important;
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
    }
    html[data-mobile-generation-detail] .tree .generation-card-dates {
      display: block !important;
      max-width: 100%;
      color: #805d3d;
      font-size: 8px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: clip;
    }
    html[data-mobile-generation-detail] .tree .children-row {
      gap: 14px !important;
    }
  `}</style>;
}
