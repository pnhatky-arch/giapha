'use client';

import { useEffect } from 'react';

export default function FamilyEventFilter() {
  useEffect(() => {
    let syncFrame = 0;
    let traceTimer = 0;

    const clearTrace = () => {
      window.clearTimeout(traceTimer);
      document.querySelectorAll('.event-filter-gold-trace.family-work-trace').forEach((node) => node.remove());
    };

    const runTrace = (button: HTMLButtonElement) => {
      clearTrace();
      const rect = button.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      const computed = window.getComputedStyle(button);
      const trace = document.createElement('div');
      trace.className = 'event-filter-gold-trace family-work-trace';
      trace.style.left = `${rect.left - 2}px`;
      trace.style.top = `${rect.top - 2}px`;
      trace.style.width = `${rect.width + 4}px`;
      trace.style.height = `${rect.height + 4}px`;
      trace.style.borderRadius = computed.borderRadius || '10px';
      trace.setAttribute('aria-hidden', 'true');
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const segment = document.createElement('span');
        segment.className = `event-filter-gold-segment ${side}`;
        trace.appendChild(segment);
      }
      document.body.appendChild(trace);
      traceTimer = window.setTimeout(clearTrace, 560);
    };

    const applyFamilyFilter = (button: HTMLButtonElement) => {
      const view = document.querySelector<HTMLElement>('.events-view');
      if (!view) return;
      view.querySelectorAll<HTMLElement>('.family-event').forEach((event) => { event.hidden = true; });
      view.querySelectorAll<HTMLButtonElement>('.event-filter-button').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      const standardEmpty = view.querySelector<HTMLElement>('.event-filter-empty');
      if (standardEmpty) standardEmpty.hidden = true;
      const familyEmpty = view.querySelector<HTMLElement>('.family-work-empty');
      if (familyEmpty) familyEmpty.hidden = false;
      window.requestAnimationFrame(() => runTrace(button));
    };

    const install = () => {
      const view = document.querySelector<HTMLElement>('.events-view');
      if (!view) return;

      const title = view.querySelector<HTMLElement>('.events-heading h2');
      if (title && (title.textContent?.trim() === 'Việc họ' || title.textContent?.trim() === 'Sự kiện gia đình')) {
        title.textContent = 'Sự Kiện';
      }

      const bar = view.querySelector<HTMLElement>('.event-filter-bar');
      if (!bar) return;

      let familyButton = bar.querySelector<HTMLButtonElement>('.event-filter-button[data-filter="family"]');
      if (!familyButton) {
        familyButton = document.createElement('button');
        familyButton.type = 'button';
        familyButton.className = 'event-filter-button';
        familyButton.dataset.filter = 'family';
        familyButton.setAttribute('aria-pressed', 'false');
        familyButton.innerHTML = '<span>Việc họ</span><small>0</small>';
        familyButton.addEventListener('click', () => applyFamilyFilter(familyButton!));
        bar.appendChild(familyButton);
      }

      let familyEmpty = view.querySelector<HTMLElement>('.family-work-empty');
      if (!familyEmpty) {
        familyEmpty = document.createElement('div');
        familyEmpty.className = 'event-filter-empty family-work-empty';
        familyEmpty.hidden = true;
        familyEmpty.innerHTML = '<strong>Chưa có việc họ nào được ghi</strong><span>Các việc chung của dòng họ sẽ được hiển thị tại mục ni.</span>';
        bar.insertAdjacentElement('afterend', familyEmpty);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('.event-filter-button');
      if (!button || button.dataset.filter === 'family') return;
      const view = button.closest<HTMLElement>('.events-view');
      const familyEmpty = view?.querySelector<HTMLElement>('.family-work-empty');
      if (familyEmpty) familyEmpty.hidden = true;
    };

    const sync = () => {
      window.cancelAnimationFrame(syncFrame);
      syncFrame = window.requestAnimationFrame(install);
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
      window.cancelAnimationFrame(syncFrame);
      clearTrace();
      document.querySelectorAll('.event-filter-button[data-filter="family"],.family-work-empty').forEach((node) => node.remove());
    };
  }, []);

  return null;
}
