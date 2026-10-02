'use client';

import { useEffect } from 'react';

export default function EventsEditPermissionFix({ canEdit }: { canEdit: boolean }) {
  useEffect(() => {
    if (canEdit) return;

    const closeUnauthorizedEditors = () => {
      document.querySelectorAll('.event-editor-dialog,.tomb-event-dialog').forEach((node) => node.remove());
    };

    const observer = new MutationObserver(closeUnauthorizedEditors);
    observer.observe(document.body, { childList: true, subtree: true });
    closeUnauthorizedEditors();

    return () => observer.disconnect();
  }, [canEdit]);

  if (canEdit) return null;

  return <style>{`
    /* Guest mode is strictly read-only for both custom event types. */
    .events-view .family-work-actions,
    .events-view .tomb-event-actions,
    .events-view .event-context-toolbar,
    .events-view .tomb-event-add {
      display: none !important;
    }
  `}</style>;
}
