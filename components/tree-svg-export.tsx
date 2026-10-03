'use client';

import { useEffect } from 'react';

type FamilyPerson = {
  id: number;
  name: string;
  generation: number;
  role?: string;
  relationship?: string;
  birthDate?: string;
  deathDate?: string;
  children?: FamilyPerson[];
};

type FamilyResponse = { family?: FamilyPerson | null; dataMode?: string };
type LayoutNode = { person: FamilyPerson; x: number; y: number; children: LayoutNode[] };

const CARD_WIDTH = 360;
const CARD_HEIGHT = 132;
const SLOT_WIDTH = 420;
const LEVEL_GAP = 310;
const HEADER_HEIGHT = 190;
const TOP_MARGIN = 150;
const SIDE_MARGIN = 110;
const FOOTER_HEIGHT = 110;
const MIN_CANVAS_WIDTH = 1800;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[character] ?? character));
}

function flatten(root: FamilyPerson) {
  const result: FamilyPerson[] = [];
  const visit = (person: FamilyPerson) => {
    result.push(person);
    person.children?.forEach(visit);
  };
  visit(root);
  return result;
}

function leafCount(person: FamilyPerson): number {
  if (!person.children?.length) return 1;
  return person.children.reduce((sum, child) => sum + leafCount(child), 0);
}

function fitNameSize(name: string) {
  if (name.length <= 18) return 21;
  if (name.length <= 23) return 19;
  if (name.length <= 29) return 17;
  return 15;
}

function buildLayout(root: FamilyPerson) {
  let leafCursor = 0;
  const visit = (person: FamilyPerson): LayoutNode => {
    const children = (person.children ?? []).map(visit);
    let x: number;
    if (!children.length) {
      x = SIDE_MARGIN + leafCursor * SLOT_WIDTH + CARD_WIDTH / 2;
      leafCursor += 1;
    } else {
      x = (children[0].x + children[children.length - 1].x) / 2;
    }
    const y = HEADER_HEIGHT + TOP_MARGIN + (person.generation - 1) * LEVEL_GAP;
    return { person, x, y, children };
  };
  const tree = visit(root);
  const width = Math.max(MIN_CANVAS_WIDTH, SIDE_MARGIN * 2 + Math.max(1, leafCursor) * SLOT_WIDTH);
  const maxGeneration = Math.max(...flatten(root).map((person) => person.generation));
  const height = HEADER_HEIGHT + TOP_MARGIN + (maxGeneration - 1) * LEVEL_GAP + CARD_HEIGHT + FOOTER_HEIGHT + 120;
  return { tree, width, height, maxGeneration };
}

function svgForFamily(root: FamilyPerson, projectName: string) {
  const members = flatten(root);
  const { tree, width, height, maxGeneration } = buildLayout(root);
  const rootCenter = tree.x;
  const parts: string[] = [];
  const add = (value: string) => parts.push(value);

  const renderBadge = (x: number, y: number, generation: number) => {
    const label = `Đời thứ ${generation}`;
    const badgeWidth = 146;
    add(`<g><rect x="${x - badgeWidth / 2}" y="${y - 18}" width="${badgeWidth}" height="36" rx="18" fill="#5d0a07" stroke="#c69735" stroke-width="2"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#f7de96">${escapeXml(label)}</text></g>`);
  };

  const renderConnectors = (node: LayoutNode) => {
    if (!node.children.length) return;
    const parentBottom = node.y + CARD_HEIGHT / 2;
    const childrenTop = node.children[0].y - CARD_HEIGHT / 2;
    const branchY = parentBottom + (childrenTop - parentBottom) * 0.55;
    add(`<path d="M ${node.x} ${parentBottom} V ${branchY}" fill="none" stroke="#b4862e" stroke-width="4" stroke-linecap="round"/>`);
    renderBadge(node.x, parentBottom + (branchY - parentBottom) * 0.48, node.person.generation + 1);
    if (node.children.length > 1) {
      add(`<path d="M ${node.children[0].x} ${branchY} H ${node.children[node.children.length - 1].x}" fill="none" stroke="#b4862e" stroke-width="4" stroke-linecap="round"/>`);
    }
    node.children.forEach((child) => {
      add(`<circle cx="${child.x}" cy="${branchY}" r="5.5" fill="#c69735"/>`);
      add(`<path d="M ${child.x} ${branchY} V ${childrenTop}" fill="none" stroke="#b4862e" stroke-width="4"/>`);
      renderConnectors(child);
    });
  };

  const renderCard = (node: LayoutNode) => {
    const person = node.person;
    const x = node.x - CARD_WIDTH / 2;
    const y = node.y - CARD_HEIGHT / 2;
    const isRoot = person.generation === 1;
    const initial = isRoot ? '祖' : (person.name.trim().split(/\s+/).at(-1)?.charAt(0) || '?');
    const nameSize = fitNameSize(person.name);
    const role = person.role?.trim() || '';
    const relationship = person.relationship?.trim() || '';
    const dates = [person.birthDate ? `Sinh ${person.birthDate}` : '', person.deathDate ? `Mất ${person.deathDate}` : ''].filter(Boolean).join(' · ');
    add('<g filter="url(#shadow)">');
    add(`<rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="20" fill="${isRoot ? '#fff5db' : '#fffdf8'}" stroke="${isRoot ? '#c69735' : '#d9c18a'}" stroke-width="${isRoot ? 3 : 2}"/>`);
    add(`<rect x="${x}" y="${y}" width="8" height="${CARD_HEIGHT}" rx="4" fill="#5d0a07"/>`);
    add(`<circle cx="${x + 54}" cy="${node.y}" r="28" fill="#f1e2c0" stroke="#c69735" stroke-width="1.7"/>`);
    add(`<text x="${x + 54}" y="${node.y + 8}" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#5d0a07">${escapeXml(initial)}</text>`);
    add(`<text x="${x + 98}" y="${node.y - 29}" font-family="Arial,sans-serif" font-size="${nameSize}" font-weight="700" fill="#37241e">${escapeXml(person.name)}</text>`);
    if (role) add(`<text x="${x + 98}" y="${node.y - 1}" font-family="Arial,sans-serif" font-size="13" fill="#776459">${escapeXml(role)}</text>`);
    if (relationship) add(`<text x="${x + 98}" y="${node.y + 23}" font-family="Arial,sans-serif" font-size="12" fill="#776459">${escapeXml(relationship)}</text>`);
    if (dates) add(`<text x="${x + 98}" y="${node.y + 46}" font-family="Arial,sans-serif" font-size="10.5" fill="#927c6d">${escapeXml(dates)}</text>`);
    add('</g>');
    node.children.forEach(renderCard);
  };

  add(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  add(`<defs><linearGradient id="header" x1="0" x2="1"><stop offset="0" stop-color="#5d0a07"/><stop offset="1" stop-color="#350302"/></linearGradient><filter id="shadow" x="-20%" y="-25%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#38120a" flood-opacity=".13"/></filter></defs>`);
  add(`<rect width="100%" height="100%" fill="#f6f0e5"/><rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="28" fill="none" stroke="#c69735" stroke-width="3"/>`);
  add(`<rect x="28" y="28" width="${width - 56}" height="154" rx="28" fill="url(#header)"/>`);
  add('<circle cx="108" cy="105" r="46" fill="none" stroke="#e8c66c" stroke-width="3"/><text x="108" y="117" text-anchor="middle" font-family="Georgia,serif" font-size="39" font-weight="700" fill="#e8c66c">P</text>');
  add(`<text x="182" y="88" font-family="Georgia,serif" font-size="38" font-weight="700" fill="#fff4d5">${escapeXml(`CÂY GIA PHẢ · ${projectName.toUpperCase()}`)}</text>`);
  add('<text x="182" y="130" font-family="Arial,sans-serif" font-size="20" fill="#e7ceaa">Gìn giữ cội nguồn · Kết nối thế hệ</text>');
  add(`<text x="${width - 150}" y="90" text-anchor="end" font-family="Arial,sans-serif" font-size="19" fill="#f5deb4">${members.length} thành viên · ${maxGeneration} đời</text>`);
  add(`<text x="${width - 150}" y="126" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#cfaf83">SVG vector</text>`);
  renderBadge(rootCenter, HEADER_HEIGHT + 72, 1);
  add(`<path d="M ${rootCenter} ${HEADER_HEIGHT + 90} V ${tree.y - CARD_HEIGHT / 2}" fill="none" stroke="#b4862e" stroke-width="4"/>`);
  renderConnectors(tree);
  renderCard(tree);
  const footerY = height - 88;
  add(`<line x1="80" y1="${footerY - 35}" x2="${width - 80}" y2="${footerY - 35}" stroke="#d7c39a" stroke-width="1.5"/>`);
  add(`<text x="80" y="${footerY}" font-family="Arial,sans-serif" font-size="14" fill="#776459">SVG vector · card đồng kích thước · nhãn đời nằm trên nhánh · bố cục tự mở rộng theo dữ liệu</text>`);
  add('</svg>');
  return { svg: parts.join(''), width, height, memberCount: members.length, generationCount: maxGeneration };
}

function downloadIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 16v3h14v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export default function TreeSvgExport() {
  useEffect(() => {
    let frame = 0;
    let previewUrl = '';

    const closePreview = () => {
      document.querySelector('.tree-svg-preview')?.remove();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = '';
      }
    };

    const exportFile = (svg: string) => {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `cay-gia-pha-${date}.svg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const openPreview = async (button: HTMLButtonElement) => {
      closePreview();
      button.disabled = true;
      button.classList.add('loading');
      try {
        const response = await fetch('/api/family', { cache: 'no-store' });
        const data = await response.json() as FamilyResponse;
        if (!response.ok || !data.family) throw new Error('Không có dữ liệu cây gia phả để xuất.');
        const projectName = document.querySelector<HTMLElement>('.system-name')?.textContent?.trim() || 'Gia phả họ Phạm Văn';
        const generated = svgForFamily(data.family, projectName);
        const blob = new Blob([generated.svg], { type: 'image/svg+xml;charset=utf-8' });
        previewUrl = URL.createObjectURL(blob);

        const dialog = document.createElement('div');
        dialog.className = 'tree-svg-preview';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'Xem trước file SVG cây gia phả');
        dialog.innerHTML = `
          <div class="tree-svg-preview-card">
            <div class="tree-svg-preview-head">
              <div><strong>Xem trước SVG cây gia phả</strong><span>${generated.memberCount} thành viên · ${generated.generationCount} đời · ${generated.width} × ${generated.height}px</span></div>
              <button type="button" class="tree-svg-preview-close" aria-label="Đóng">×</button>
            </div>
            <div class="tree-svg-preview-stage"><img src="${previewUrl}" alt="Bản xem trước cây gia phả SVG"></div>
            <div class="tree-svg-preview-actions"><button type="button" class="tree-svg-preview-cancel">Hủy</button><button type="button" class="tree-svg-preview-download">Xuất SVG</button></div>
          </div>`;
        document.body.appendChild(dialog);
        dialog.querySelector('.tree-svg-preview-close')?.addEventListener('click', closePreview);
        dialog.querySelector('.tree-svg-preview-cancel')?.addEventListener('click', closePreview);
        dialog.querySelector('.tree-svg-preview-download')?.addEventListener('click', () => exportFile(generated.svg));
        dialog.addEventListener('click', (event) => { if (event.target === dialog) closePreview(); });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Không thể tạo file SVG.');
      } finally {
        button.disabled = false;
        button.classList.remove('loading');
      }
    };

    const install = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>('.content-heading');
        const treeViewport = document.querySelector('.tree-viewport');
        if (!heading || !treeViewport) {
          document.querySelector('.tree-svg-export-button')?.remove();
          closePreview();
          return;
        }
        if (heading.querySelector('.tree-svg-export-button')) return;
        const count = heading.querySelector<HTMLElement>('.view-chip');
        if (!count) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tree-svg-export-button';
        button.setAttribute('aria-label', 'Xem trước và xuất cây gia phả SVG');
        button.title = 'Xuất SVG';
        button.innerHTML = downloadIcon();
        button.addEventListener('click', () => void openPreview(button));
        count.insertAdjacentElement('afterend', button);
      });
    };

    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePreview(); });
    install();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      closePreview();
      document.querySelector('.tree-svg-export-button')?.remove();
    };
  }, []);

  return <style>{`
    .tree-svg-export-button {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid #bd8d35;
      border-radius: 10px;
      background: #3a0705;
      color: #efca68;
      box-shadow: inset 0 1px #f3d87b24;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .tree-svg-export-button svg { width: 19px; height: 19px; }
    .tree-svg-export-button:active { transform: scale(.96); }
    .tree-svg-export-button:disabled { opacity: .58; }
    .tree-svg-export-button.loading svg { animation: tree-export-pulse .7s ease-in-out infinite alternate; }
    @keyframes tree-export-pulse { to { opacity: .35; } }

    .tree-svg-preview {
      position: fixed;
      inset: 0;
      z-index: 2147483200;
      display: grid;
      place-items: center;
      padding: 18px;
      background: #180302c7;
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
    }
    .tree-svg-preview-card {
      width: min(1050px, 100%);
      max-height: min(900px, 92dvh);
      display: grid;
      grid-template-rows: auto minmax(0,1fr) auto;
      overflow: hidden;
      border: 1px solid #c69735;
      border-radius: 18px;
      background: #4a0906;
      box-shadow: 0 24px 70px #0009, inset 0 1px #f4d77a24;
    }
    .tree-svg-preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid #c6973545;
    }
    .tree-svg-preview-head strong { display:block; color:#f5d77d; font-size:16px; }
    .tree-svg-preview-head span { display:block; margin-top:4px; color:#bda382; font-size:10px; }
    .tree-svg-preview-close {
      width: 36px; height: 36px; display:grid; place-items:center; padding:0;
      border:1px solid #a97936; border-radius:50%; background:#2c0504; color:#e4c584; font-size:23px;
    }
    .tree-svg-preview-stage {
      min-height: 260px;
      overflow: auto;
      padding: 14px;
      background: #21100c;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    .tree-svg-preview-stage img {
      display: block;
      width: 100%;
      min-width: 760px;
      height: auto;
      border-radius: 10px;
      background: #f6f0e5;
    }
    .tree-svg-preview-actions {
      display:flex; justify-content:flex-end; gap:9px; padding:12px 16px 14px;
      border-top:1px solid #c6973545;
    }
    .tree-svg-preview-actions button { height:38px; padding:0 15px; border-radius:9px; font-size:11px; font-weight:700; }
    .tree-svg-preview-cancel { border:1px solid #936831; background:#2b0504; color:#c8aa85; }
    .tree-svg-preview-download { border:1px solid #e0b447; background:linear-gradient(100deg,#871b13,#5d0d09); color:#ffe08a; box-shadow:inset 0 -2px #e7bb4f; }

    @media (max-width: 740px) {
      .content-heading { grid-template-columns: minmax(0,1fr) auto auto auto !important; gap:7px !important; }
      .tree-svg-export-button { width:38px; height:38px; flex-basis:38px; border-radius:9px; }
      .tree-svg-preview { align-items:end; padding:0; }
      .tree-svg-preview-card { width:100%; max-height:90dvh; border-radius:18px 18px 0 0; border-bottom:0; }
      .tree-svg-preview-stage { min-height:300px; padding:10px; }
      .tree-svg-preview-stage img { min-width:880px; }
    }
    .mode-mobile .content-heading { grid-template-columns: minmax(0,1fr) auto auto auto !important; gap:7px !important; }
    .mode-mobile .tree-svg-preview { align-items:end; padding:0; }
    .mode-mobile .tree-svg-preview-card { width:100%; max-height:90dvh; border-radius:18px 18px 0 0; border-bottom:0; }
    .mode-mobile .tree-svg-preview-stage img { min-width:880px; }
  `}</style>;
}
