'use client';

import { useEffect } from 'react';

function textOf(element: Element | null) {
  return (element?.textContent ?? '').trim().toLocaleLowerCase('vi');
}

export default function MaterialsMediaShortcut() {
  useEffect(() => {
    let frame = 0;
    let pickerTimer = 0;

    const openPicker = () => {
      const input = document.querySelector<HTMLInputElement>('.materials-workspace .material-editor .material-media-pick-button input[type="file"]');
      if (!input) return false;
      if (input.disabled) {
        const warning = document.querySelector<HTMLElement>('.materials-workspace .material-media-warning');
        if (warning) warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      input.click();
      return true;
    };

    const createMediaDraftAndOpen = () => {
      if (openPicker()) return;
      const toolbar = document.querySelector<HTMLElement>('.materials-workspace .materials-toolbar');
      if (!toolbar) return;
      const contentButton = [...toolbar.querySelectorAll<HTMLButtonElement>('button')].find((button) => textOf(button).includes('nội dung'));
      contentButton?.click();

      let attempts = 0;
      const waitForEditor = () => {
        attempts += 1;
        if (openPicker() || attempts >= 12) return;
        pickerTimer = window.setTimeout(waitForEditor, 40);
      };
      pickerTimer = window.setTimeout(waitForEditor, 0);
    };

    const install = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const toolbar = document.querySelector<HTMLElement>('.materials-workspace .materials-toolbar > div:last-child');
        if (!toolbar || toolbar.querySelector('.materials-media-shortcut')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'materials-media-shortcut';
        button.setAttribute('aria-label', 'Thêm ảnh hoặc video vào kho tư liệu');
        button.innerHTML = '<span class="materials-media-shortcut-icon" aria-hidden="true">▣</span><span>Ảnh / Video</span>';
        button.addEventListener('click', createMediaDraftAndOpen);
        toolbar.appendChild(button);
      });
    };

    const observer = new MutationObserver(install);
    observer.observe(document.body, { childList: true, subtree: true });
    install();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(pickerTimer);
      document.querySelector('.materials-media-shortcut')?.remove();
    };
  }, []);

  return <style>{`
    .materials-media-shortcut-icon {
      display: inline-grid;
      place-items: center;
      width: 15px;
      height: 15px;
      color: currentColor;
      font-size: 14px;
      line-height: 1;
    }
    .materials-workspace .material-media-pick-button {
      visibility: visible !important;
      opacity: 1 !important;
    }
    .materials-workspace .material-media-pick-button.unavailable {
      opacity: .72 !important;
    }
  `}</style>;
}
