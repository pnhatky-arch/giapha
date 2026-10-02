'use client';

import { useEffect } from 'react';

function allGenerationsSelected() {
  const firstButton = document.querySelector<HTMLButtonElement>('.generation-list button');
  if (firstButton?.classList.contains('selected')) return true;
  const mobileSelect = document.querySelector<HTMLSelectElement>('.mobile-generation-select');
  return mobileSelect?.value === '0';
}

export default function TreeAutoFit() {
  useEffect(() => {
    let frame = 0;
    let manualZoom = false;
    let observedViewport: HTMLElement | null = null;
    let observedTree: HTMLElement | null = null;

    const resizeObserver = new ResizeObserver(() => {
      manualZoom = false;
      scheduleFit();
    });

    const clearFit = () => {
      const viewport = document.querySelector<HTMLElement>('.tree-viewport');
      const scale = document.querySelector<HTMLElement>('.tree-scale');
      viewport?.removeAttribute('data-auto-tree-fit');
      scale?.style.removeProperty('--tree-auto-fit');
    };

    const attachResizeObservers = () => {
      const viewport = document.querySelector<HTMLElement>('.tree-viewport');
      const tree = document.querySelector<HTMLElement>('.tree');
      if (viewport === observedViewport && tree === observedTree) return;
      resizeObserver.disconnect();
      observedViewport = viewport;
      observedTree = tree;
      if (viewport) resizeObserver.observe(viewport);
      if (tree) resizeObserver.observe(tree);
    };

    const fit = () => {
      attachResizeObservers();
      const viewport = document.querySelector<HTMLElement>('.tree-viewport');
      const scaleLayer = document.querySelector<HTMLElement>('.tree-scale');
      const tree = document.querySelector<HTMLElement>('.tree');
      if (!viewport || !scaleLayer || !tree || !allGenerationsSelected() || manualZoom) {
        if (!manualZoom) clearFit();
        return;
      }

      const naturalWidth = Math.max(tree.scrollWidth, tree.offsetWidth, scaleLayer.scrollWidth);
      const naturalHeight = Math.max(tree.scrollHeight, tree.offsetHeight, scaleLayer.scrollHeight);
      if (naturalWidth < 1 || naturalHeight < 1) return;

      const horizontalPadding = 24;
      const verticalPadding = 82;
      const availableWidth = Math.max(120, viewport.clientWidth - horizontalPadding);
      const availableHeight = Math.max(180, viewport.clientHeight - verticalPadding);
      const widthScale = availableWidth / naturalWidth;
      const heightScale = availableHeight / naturalHeight;
      const nextScale = Math.max(0.08, Math.min(1, widthScale, heightScale));

      viewport.setAttribute('data-auto-tree-fit', 'true');
      scaleLayer.style.setProperty('--tree-auto-fit', nextScale.toFixed(4));

      const output = viewport.querySelector<HTMLOutputElement>('.zoom-controls output');
      if (output) output.textContent = `${Math.round(nextScale * 100)}%`;
    };

    function scheduleFit() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(fit);
      });
    }

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const generationButton = event.target.closest('.generation-list button');
      if (generationButton) {
        manualZoom = false;
        scheduleFit();
        return;
      }

      const zoomButton = event.target.closest<HTMLButtonElement>('.zoom-controls button');
      if (!zoomButton) return;
      const buttons = [...zoomButton.parentElement!.querySelectorAll<HTMLButtonElement>('button')];
      const isFitButton = buttons.at(-1) === zoomButton;
      if (isFitButton) {
        manualZoom = false;
        scheduleFit();
      } else {
        manualZoom = true;
        clearFit();
      }
    };

    const onChange = (event: Event) => {
      if (!(event.target instanceof HTMLSelectElement) || !event.target.classList.contains('mobile-generation-select')) return;
      manualZoom = false;
      scheduleFit();
    };

    const mutationObserver = new MutationObserver(() => {
      attachResizeObservers();
      if (!manualZoom) scheduleFit();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    window.addEventListener('orientationchange', scheduleFit);
    window.visualViewport?.addEventListener('resize', scheduleFit, { passive: true });
    attachResizeObservers();
    scheduleFit();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener('click', onClick);
      document.removeEventListener('change', onChange);
      window.removeEventListener('orientationchange', scheduleFit);
      window.visualViewport?.removeEventListener('resize', scheduleFit);
      clearFit();
    };
  }, []);

  return <style>{`
    .tree-viewport[data-auto-tree-fit='true'] .tree-scale {
      transform: scale(var(--tree-auto-fit)) !important;
      transform-origin: top center !important;
    }

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

    @media (max-width: 740px) {
      .person-card .person-copy strong {
        font-size: 16px !important;
        line-height: 1.15 !important;
      }
      .person-card .person-copy small {
        font-size: 11px !important;
      }
    }
  `}</style>;
}
