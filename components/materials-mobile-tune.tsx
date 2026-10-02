'use client';

export default function MaterialsMobileTune() {
  return <style>{`
    /* Tư liệu: remove the redundant introduction card. */
    .materials-workspace .materials-isolation {
      display: none !important;
    }

    /* Keep all three creation actions on one row, including narrow iPhones. */
    .materials-workspace .materials-toolbar > div:last-child {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
      width: min(100%, 430px);
    }
    .materials-workspace .materials-toolbar > div:last-child > button {
      min-width: 0 !important;
      width: 100% !important;
      padding: 0 8px !important;
      white-space: nowrap;
    }
    .materials-workspace .materials-toolbar > div:last-child > button svg {
      flex: 0 0 auto;
      width: 15px !important;
      height: 15px !important;
    }

    /* Edit/delete controls: same compact footprint and icon size. */
    .materials-workspace .material-entry-actions {
      gap: 6px !important;
    }
    .materials-workspace .material-entry-actions button {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      min-height: 28px !important;
      padding: 0 !important;
      border-radius: 7px !important;
    }
    .materials-workspace .material-entry-actions button svg {
      width: 14px !important;
      height: 14px !important;
      stroke-width: 2 !important;
    }

    @media (max-width: 740px) {
      .materials-workspace .materials-toolbar {
        display: grid !important;
        gap: 11px !important;
      }
      .materials-workspace .materials-toolbar > div:last-child {
        width: 100%;
      }
      .materials-workspace .materials-toolbar > div:last-child > button {
        min-height: 38px !important;
        font-size: 11px !important;
        gap: 5px !important;
      }
      .materials-workspace .material-entry-actions {
        flex-direction: column !important;
      }
    }

    @media (max-width: 390px) {
      .materials-workspace .materials-toolbar > div:last-child {
        gap: 6px !important;
      }
      .materials-workspace .materials-toolbar > div:last-child > button {
        padding: 0 5px !important;
        font-size: 10px !important;
      }
      .materials-workspace .materials-toolbar > div:last-child > button svg {
        width: 13px !important;
        height: 13px !important;
      }
    }
  `}</style>;
}
