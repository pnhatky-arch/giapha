'use client';

export default function EventsFilterFitRow() {
  return <style>{`
    @media (max-width: 740px) {
      .events-view .event-filter-bar {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 10px 24px 12px !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }
      .events-view .event-filter-button {
        width: 100% !important;
        min-width: 0 !important;
        height: 38px !important;
        padding: 0 4px !important;
        justify-content: center !important;
        gap: 0 !important;
        font-size: 10.5px !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: clip !important;
      }
      .events-view .event-filter-button > span {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: clip !important;
        white-space: nowrap !important;
      }
      .events-view .event-filter-button > small {
        display: none !important;
      }
    }

    @media (max-width: 390px) {
      .events-view .event-filter-bar {
        gap: 4px !important;
        padding-left: 18px !important;
        padding-right: 18px !important;
      }
      .events-view .event-filter-button {
        padding: 0 2px !important;
        font-size: 10px !important;
      }
    }

    @media (max-width: 340px) {
      .events-view .event-filter-bar {
        gap: 3px !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      .events-view .event-filter-button {
        font-size: 9.4px !important;
      }
    }

    .app-shell.mode-mobile .events-view .event-filter-bar {
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      gap: 6px !important;
      width: 100% !important;
      padding: 10px 24px 12px !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }
    .app-shell.mode-mobile .events-view .event-filter-button {
      width: 100% !important;
      min-width: 0 !important;
      height: 38px !important;
      padding: 0 4px !important;
      justify-content: center !important;
      gap: 0 !important;
      font-size: 10.5px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
    }
    .app-shell.mode-mobile .events-view .event-filter-button > small {
      display: none !important;
    }
  `}</style>;
}
