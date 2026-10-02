'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FamilyPerson } from '@/lib/family-tree';

type FamilyPayload = { family: FamilyPerson | null };
type AffinityInfo = { kind: 'Dâu' | 'Rể' | 'Vợ' | 'Chồng'; targetName: string };

function isMobileTreeLayout() {
  const shell = document.querySelector<HTMLElement>('.app-shell');
  return window.matchMedia('(max-width: 740px)').matches || shell?.classList.contains('mode-mobile') || shell?.dataset.autoDisplay === 'mobile';
}

function generationControlState() {
  const firstButton = document.querySelector<HTMLButtonElement>('.generation-list button');
  const select = document.querySelector<HTMLSelectElement>('.mobile-generation-select');
  if (firstButton) return { known: true, all: firstButton.classList.contains('selected') };
  if (select) return { known: true, all: select.value === '0' };
  return { known: false, all: false };
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('vi');
}

function affinityInfo(person: FamilyPerson): AffinityInfo | null {
  const value = (person.relationship ?? person.role ?? '').trim();
  const match = value.match(/^(?:con\s+)?(dâu|rể|vợ|chồng)\s+(?:của\s+)?(.+)$/i);
  if (!match) return null;
  const raw = match[1].toLocaleLowerCase('vi');
  const kind = raw === 'dâu' ? 'Dâu' : raw === 'rể' ? 'Rể' : raw === 'vợ' ? 'Vợ' : 'Chồng';
  return { kind, targetName: match[2].trim() };
}

function flattenFamily(root: FamilyPerson) {
  const people: FamilyPerson[] = [];
  const parentById = new Map<number, number>();
  const walk = (person: FamilyPerson) => {
    people.push(person);
    person.children?.forEach((child) => {
      parentById.set(child.id, person.id);
      walk(child);
    });
  };
  walk(root);
  return { people, parentById };
}

function openSourceCard(person: FamilyPerson) {
  const cards = [...document.querySelectorAll<HTMLButtonElement>('.tree .person-card')];
  const source = cards.find((card) => {
    const name = card.querySelector('strong')?.textContent?.trim();
    const generationText = card.querySelector('small')?.textContent ?? '';
    const generation = Number([...generationText.matchAll(/\d+/g)].at(-1)?.[0] ?? 0);
    return name === person.name && generation === person.generation;
  });
  source?.click();
}

function Avatar({ person }: { person: FamilyPerson }) {
  const fallback = person.generation === 1 ? '祖' : person.name.split(' ').at(-1)?.charAt(0);
  return <span className="family-branch-avatar">{person.avatar ? <img src={person.avatar} alt="" /> : fallback}</span>;
}

export default function TreeMobileGenerations() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [family, setFamily] = useState<FamilyPerson | null>(null);
  const [active, setActive] = useState(false);
  const lockedRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    let reloadTimer = 0;
    let cancelled = false;

    const setGlobalLock = (enabled: boolean) => {
      lockedRef.current = enabled;
      if (enabled) document.documentElement.setAttribute('data-mobile-family-tree', 'true');
      else document.documentElement.removeAttribute('data-mobile-family-tree');
    };

    const loadFamily = async () => {
      try {
        const response = await fetch('/api/family', { cache: 'no-store' });
        const payload = await response.json() as FamilyPayload;
        if (!cancelled) setFamily(payload.family ?? null);
      } catch {
        if (!cancelled) setFamily(null);
      }
    };

    const sync = (forceSelectionCheck = false) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewport = document.querySelector<HTMLElement>('.tree-viewport');
        const mobile = isMobileTreeLayout();
        const selection = generationControlState();

        if (!mobile) {
          setGlobalLock(false);
        } else if (selection.known && (forceSelectionCheck || !lockedRef.current || !selection.all)) {
          setGlobalLock(selection.all);
        }

        const enabled = mobile && lockedRef.current;
        if (viewport) {
          if (enabled) viewport.setAttribute('data-mobile-family-branches', 'true');
          else viewport.removeAttribute('data-mobile-family-branches');
        }

        if (enabled) {
          setActive(true);
          if (viewport) setTarget(viewport);
        } else {
          setActive(false);
          setTarget(null);
        }
      });
    };

    const observer = new MutationObserver((records) => {
      sync(false);
      if (records.some((record) => record.target instanceof Element && record.target.closest('.tree'))) {
        window.clearTimeout(reloadTimer);
        reloadTimer = window.setTimeout(loadFamily, 180);
      }
    });

    const onChange = () => sync(true);
    const onClick = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      const generationControl = element?.closest('.generation-list, .mobile-generation-control');
      sync(Boolean(generationControl));
    };

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    window.addEventListener('resize', () => sync(false), { passive: true });
    window.addEventListener('orientationchange', () => sync(false));
    window.visualViewport?.addEventListener('resize', () => sync(false), { passive: true });

    const initial = generationControlState();
    if (isMobileTreeLayout() && initial.known && initial.all) setGlobalLock(true);
    sync(false);
    void loadFamily();

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener('click', onClick);
      document.removeEventListener('change', onChange);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(reloadTimer);
      setGlobalLock(false);
      document.querySelectorAll<HTMLElement>('.tree-viewport').forEach((node) => node.removeAttribute('data-mobile-family-branches'));
    };
  }, []);

  const model = useMemo(() => {
    if (!family) return null;
    const { people, parentById } = flattenFamily(family);
    const peopleByName = new Map<string, FamilyPerson[]>();
    people.forEach((person) => {
      const key = normalizeName(person.name);
      peopleByName.set(key, [...(peopleByName.get(key) ?? []), person]);
    });

    const affinityIds = new Set<number>();
    const affinityByTargetId = new Map<number, FamilyPerson[]>();

    people.forEach((person) => {
      const info = affinityInfo(person);
      if (!info) return;
      affinityIds.add(person.id);
      const candidates = peopleByName.get(normalizeName(info.targetName))?.filter((candidate) => candidate.id !== person.id) ?? [];
      const target = [...candidates].sort((a, b) => Math.abs(a.generation - person.generation) - Math.abs(b.generation - person.generation))[0];
      const fallbackParentId = parentById.get(person.id);
      const targetId = target?.id ?? fallbackParentId;
      if (!targetId) return;
      affinityByTargetId.set(targetId, [...(affinityByTargetId.get(targetId) ?? []), person]);
    });

    return { affinityIds, affinityByTargetId };
  }, [family]);

  const style = <style>{`
    .person-card .person-copy{min-width:0!important;overflow:hidden!important}
    .person-card .person-copy strong,.person-card .person-copy small{display:block!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    html[data-mobile-family-tree='true'] .tree-viewport{overflow-x:hidden!important;overflow-y:auto!important;scroll-behavior:smooth}
    html[data-mobile-family-tree='true'] .tree-viewport>.tree-scale,html[data-mobile-family-tree='true'] .tree-viewport>.zoom-controls{display:none!important}
    .tree-viewport[data-mobile-family-branches='true']{overflow-x:hidden!important;overflow-y:auto!important;scroll-behavior:smooth}
    .mobile-family-tree{position:relative;z-index:5;width:100%;min-height:100%;padding:16px 12px 120px;color:#35120b}
    .family-tree-loading{min-height:240px;display:grid;place-items:center;color:#eac56f;font-size:11px;letter-spacing:.04em}
    .family-branch-node{position:relative;min-width:0}
    .family-branch-node.root-node>.family-person-card{max-width:330px;margin:0 auto;background:linear-gradient(135deg,#fff2bd,#e7bb51)}
    .family-branch-caption{margin:2px 0 7px;color:#f4d77f;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .family-person-card{width:100%;min-width:0;min-height:58px;padding:8px 9px;display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:8px;border:1.5px solid #d5a435;border-radius:11px;background:linear-gradient(140deg,#fff9e9,#efd99d);color:#48110a;box-shadow:0 5px 13px #24010035,inset 0 0 0 2px #fff8dc,inset 0 0 0 3px #c9942f;text-align:left}
    .family-person-card:active{transform:scale(.99)}
    .family-branch-avatar{width:36px;height:36px;display:grid;place-items:center;overflow:hidden;border:2px solid #d3a13a;border-radius:50%;background:#79150e;color:#f5d782;font-family:var(--font-serif),Georgia,serif;font-size:13px;font-weight:800}
    .family-branch-avatar img{width:100%;height:100%;object-fit:cover}
    .family-person-copy{min-width:0;display:grid;gap:3px}
    .family-person-copy strong,.family-person-copy small{display:block;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .family-person-copy strong{font-family:var(--font-serif),Georgia,serif;font-size:13px;line-height:1.1;font-weight:800;color:#4c120b}
    .family-person-copy small{font-size:9px;line-height:1.15;color:#805d3d}
    .family-generation-chip{padding:4px 6px;border:1px solid #bd8b31;border-radius:999px;background:#fff4d3;color:#7b3d16;font-size:8px;font-weight:800;white-space:nowrap}
    .family-affinity-list{margin:7px 0 0 17px;padding-left:10px;border-left:1px dashed #d7a83e99;display:grid;gap:7px}
    .family-affinity-row{position:relative}.family-affinity-row:before{content:'';position:absolute;left:-10px;top:29px;width:10px;border-top:1px dashed #d7a83e99}
    .family-affinity-label{margin:0 0 4px;color:#f1c96b;font-size:8.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .family-affinity-card{background:linear-gradient(140deg,#f8ead0,#e8cf9b);border-style:dashed;box-shadow:0 3px 10px #24010022,inset 0 0 0 2px #fff8dc}
    .family-children{margin:12px 0 0 8px;padding-left:9px;border-left:1.5px solid #d7a83e;display:grid;gap:13px}
    .family-child-branch{position:relative;min-width:0}.family-child-branch:before{content:'';position:absolute;left:-9px;top:31px;width:9px;border-top:1.5px solid #d7a83e}
    .family-parent-label{margin:0 0 5px;padding-left:2px;color:#efc96f;font-size:8.5px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:350px){.mobile-family-tree{padding-left:8px;padding-right:8px}.family-children{margin-left:5px;padding-left:7px}.family-child-branch:before{left:-7px;width:7px}.family-person-card{grid-template-columns:32px minmax(0,1fr) auto}.family-branch-avatar{width:32px;height:32px}}
  `}</style>;

  if (!active || !target) return style;
  if (!family || !model) return <>{createPortal(<div className="mobile-family-tree"><div className="family-tree-loading">Đang tải cây gia phả…</div></div>, target)}{style}</>;

  const renderNode = (person: FamilyPerson, parentName?: string, ancestry = new Set<number>()) => {
    if (ancestry.has(person.id)) return null;
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(person.id);
    const affinities = model.affinityByTargetId.get(person.id) ?? [];
    const childrenMap = new Map<number, FamilyPerson>();
    (person.children ?? []).filter((child) => !model.affinityIds.has(child.id)).forEach((child) => childrenMap.set(child.id, child));
    affinities.forEach((relative) => (relative.children ?? []).filter((child) => !model.affinityIds.has(child.id)).forEach((child) => childrenMap.set(child.id, child)));
    const children = [...childrenMap.values()];

    return <section className={`family-branch-node ${person.generation === 1 ? 'root-node' : ''}`} key={person.id}>
      {person.generation === 2 && <div className="family-branch-caption">Nhánh · {person.name}</div>}
      <button type="button" className="family-person-card" title={person.name} onClick={() => openSourceCard(person)}>
        <Avatar person={person} />
        <span className="family-person-copy"><strong>{person.name}</strong><small>{parentName ? `Con của ${parentName}` : (person.role || person.relationship || 'Thủy tổ')}</small></span>
        <span className="family-generation-chip">Đời {person.generation}</span>
      </button>

      {affinities.length > 0 && <div className="family-affinity-list">
        {affinities.map((relative) => {
          const info = affinityInfo(relative);
          const relation = relative.relationship || `${info?.kind ?? 'Hôn phối'} của ${person.name}`;
          return <div className="family-affinity-row" key={relative.id}>
            <div className="family-affinity-label">{relation}</div>
            <button type="button" className="family-person-card family-affinity-card" title={relative.name} onClick={() => openSourceCard(relative)}>
              <Avatar person={relative} />
              <span className="family-person-copy"><strong>{relative.name}</strong><small>{relation}</small></span>
              <span className="family-generation-chip">{info?.kind ?? 'Hôn phối'}</span>
            </button>
          </div>;
        })}
      </div>}

      {children.length > 0 && <div className="family-children">
        {children.map((child) => <div className="family-child-branch" key={child.id}>
          <div className="family-parent-label">Con của {person.name}</div>
          {renderNode(child, person.name, nextAncestry)}
        </div>)}
      </div>}
    </section>;
  };

  return <>{createPortal(<div className="mobile-family-tree">{renderNode(family)}</div>, target)}{style}</>;
}
