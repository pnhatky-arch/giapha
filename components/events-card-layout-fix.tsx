'use client';

export default function EventsCardLayoutFix() {
  return <style>{`
    /* Keep custom event lists on the same vertical rhythm as birthday/memorial cards. */
    .events-view .tomb-sweeping-list,
    .events-view .family-work-list {
      display: grid !important;
      gap: 10px !important;
    }

    /* Custom Chạp mộ / Việc họ cards use the same stable 3-column structure. */
    .events-view .family-tomb-event,
    .events-view .family-work-item {
      display: grid !important;
      grid-template-columns: 36px minmax(0, 1fr) auto !important;
      align-items: center !important;
      column-gap: 11px !important;
      row-gap: 7px !important;
      min-width: 0 !important;
    }

    .events-view .family-tomb-event .tomb-event-mark,
    .events-view .family-work-item .family-work-mark {
      grid-column: 1 !important;
      grid-row: 1 / span 2 !important;
      align-self: center !important;
      margin: 0 !important;
    }

    .events-view .family-tomb-event .event-copy,
    .events-view .family-work-item .event-copy {
      grid-column: 2 !important;
      grid-row: 1 !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }

    .events-view .family-tomb-event > time,
    .events-view .family-work-item > time {
      grid-column: 3 !important;
      grid-row: 1 !important;
      align-self: center !important;
      margin: 0 !important;
      white-space: nowrap !important;
    }

    .events-view .tomb-event-actions,
    .events-view .family-work-actions {
      grid-column: 2 / 4 !important;
      grid-row: 2 !important;
      justify-self: end !important;
      display: inline-flex !important;
      width: auto !important;
      margin: 0 !important;
      gap: 6px !important;
    }

    /* Never let long titles/notes collide with the date/actions. */
    .events-view .family-tomb-event .event-copy strong,
    .events-view .family-work-item .event-copy strong,
    .events-view .family-tomb-event .event-copy small,
    .events-view .family-work-item .event-copy small {
      display: block !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    @media (max-width: 740px) {
      .events-view .family-tomb-event,
      .events-view .family-work-item {
        grid-template-columns: 32px minmax(0, 1fr) auto !important;
        column-gap: 10px !important;
        row-gap: 8px !important;
      }

      .events-view .tomb-sweeping-list,
      .events-view .family-work-list {
        gap: 10px !important;
      }

      .events-view .tomb-event-actions,
      .events-view .family-work-actions {
        grid-column: 2 / 4 !important;
        grid-row: 2 !important;
        width: auto !important;
        margin: 0 !important;
        justify-self: end !important;
      }
    }

    .mode-mobile .events-view .family-tomb-event,
    .mode-mobile .events-view .family-work-item {
      grid-template-columns: 32px minmax(0, 1fr) auto !important;
      column-gap: 10px !important;
      row-gap: 8px !important;
    }

    .mode-mobile .events-view .tomb-sweeping-list,
    .mode-mobile .events-view .family-work-list {
      gap: 10px !important;
    }

    .mode-mobile .events-view .tomb-event-actions,
    .mode-mobile .events-view .family-work-actions {
      grid-column: 2 / 4 !important;
      grid-row: 2 !important;
      width: auto !important;
      margin: 0 !important;
      justify-self: end !important;
    }
  `}</style>;
}
