'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus } from 'lucide-react';

function buttonText(button: HTMLButtonElement) {
  return (button.textContent ?? '').trim().toLocaleLowerCase('vi');
}

export default function MaterialsMediaShortcut() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = document.querySelector<HTMLElement>('.materials-workspace .materials-toolbar > div:last-child');
        setTarget((current) => current === next ? current : next);
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const openMediaEditor = () => {
    const toolbar = document.querySelector<HTMLElement>('.materials-workspace .materials-toolbar');
    const contentButton = toolbar
      ? [...toolbar.querySelectorAll<HTMLButtonElement>('button')].find((button) => buttonText(button).includes('nội dung'))
      : undefined;

    contentButton?.click();

    let attempts = 0;
    const revealPicker = () => {
      attempts += 1;
      const picker = document.querySelector<HTMLElement>('.materials-workspace .material-media-picker');
      if (picker) {
        picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
        picker.classList.add('material-media-picker-attention');
        window.setTimeout(() => picker.classList.remove('material-media-picker-attention'), 900);
        return;
      }
      if (attempts < 20) window.setTimeout(revealPicker, 35);
    };
    window.setTimeout(revealPicker, 0);
  };

  if (!target) return null;

  return createPortal(<>
    <button type="button" className="materials-media-shortcut" onClick={openMediaEditor} aria-label="Thêm ảnh hoặc video vào kho tư liệu">
      <ImagePlus />
      <span>Ảnh / Video</span>
    </button>
    <style>{`
      .materials-workspace .materials-media-shortcut {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        min-width: 0 !important;
        min-height: 38px !important;
        padding: 0 6px !important;
        border: 1px solid #d4a23c !important;
        border-radius: 9px !important;
        background: #70140e !important;
        color: #f5d67c !important;
        font: inherit !important;
        font-size: 10px !important;
        white-space: nowrap !important;
      }
      .materials-workspace .materials-media-shortcut svg {
        width: 14px !important;
        height: 14px !important;
        flex: 0 0 auto !important;
      }
      .materials-workspace .material-media-pick-button {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .materials-workspace .material-media-pick-button.unavailable {
        opacity: .72 !important;
      }
      .materials-workspace .material-media-picker-attention {
        border-color: #f0c95b !important;
        box-shadow: 0 0 0 2px #f0c95b35, 0 0 18px #f0c95b24 !important;
      }
      @media (max-width: 390px) {
        .materials-workspace .materials-media-shortcut {
          padding: 0 4px !important;
          font-size: 9px !important;
          gap: 3px !important;
        }
        .materials-workspace .materials-media-shortcut svg {
          width: 12px !important;
          height: 12px !important;
        }
      }
    `}</style>
  </>, target);
}
