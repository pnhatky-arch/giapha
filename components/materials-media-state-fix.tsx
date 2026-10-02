'use client';

import { useEffect } from 'react';

export default function MaterialsMediaStateFix() {
  useEffect(() => {
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const workspace = document.querySelector<HTMLElement>('.materials-workspace');
        if (!workspace) return;

        const builtInNames = new Set<string>();
        workspace.querySelectorAll<HTMLElement>('.material-media-item').forEach((figure) => {
          const link = figure.querySelector<HTMLAnchorElement>('a[href*="/sample-materials/"]');
          if (!link) return;
          const name = figure.querySelector<HTMLElement>('figcaption span')?.textContent?.trim();
          if (name) builtInNames.add(name);
          const remove = figure.querySelector<HTMLButtonElement>('.material-media-delete');
          if (remove) {
            remove.hidden = true;
            remove.setAttribute('aria-hidden', 'true');
            remove.tabIndex = -1;
          }
          figure.dataset.builtInSampleMedia = 'true';
        });

        workspace.querySelectorAll<HTMLElement>('.material-editor-existing-media > div').forEach((row) => {
          const name = row.querySelector<HTMLElement>('span')?.textContent?.trim() ?? '';
          if (!builtInNames.has(name)) return;
          const remove = row.querySelector<HTMLButtonElement>('button');
          if (remove) {
            remove.hidden = true;
            remove.setAttribute('aria-hidden', 'true');
            remove.tabIndex = -1;
          }
          row.dataset.builtInSampleMedia = 'true';
          if (!row.querySelector('.sample-media-lock')) {
            const note = document.createElement('em');
            note.className = 'sample-media-lock';
            note.textContent = 'Ảnh mẫu';
            row.appendChild(note);
          }
        });

        const walker = document.createTreeWalker(workspace, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode() as Text | null;
        while (node) {
          if (node.data.includes('Kho ảnh/video R2 chưa được cấu hình')) {
            node.data = node.data.replace('Kho ảnh/video R2 chưa được cấu hình trên Worker.', 'Kho ảnh/video tạm thời không khả dụng.')
              .replace('Kho ảnh/video R2 chưa được cấu hình.', 'Kho ảnh/video tạm thời không khả dụng.');
          }
          node = walker.nextNode() as Text | null;
        }
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    sync();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <style>{`
    .materials-workspace [data-built-in-sample-media='true'] .material-media-delete,
    .materials-workspace .material-editor-existing-media [data-built-in-sample-media='true'] > button {
      display:none!important;
    }
    .materials-workspace .sample-media-lock {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:22px;
      padding:0 6px;
      border:1px solid #9a733a55;
      border-radius:999px;
      color:#bca16f;
      font-size:8px;
      font-style:normal;
      white-space:nowrap;
    }
  `}</style>;
}
