'use client';

export const LOCAL_WORKSPACE_KEY = 'giapha:device-workspace:v1';
export const LOCAL_BACKUP_SCOPE = 'giapha-device-local';
export const LOCAL_WORKSPACE_EVENT = 'giapha:local-workspace-changed';

export type LocalChangeKind = 'family' | 'event' | 'material' | 'media';
export type LocalChange = {
  id: string;
  kind: LocalChangeKind;
  action: 'create' | 'update' | 'delete';
  label: string;
  before?: unknown;
  after?: unknown;
  changedAt: string;
};

export type LocalWorkspace = {
  version: 1;
  updatedAt: string;
  family?: unknown;
  familyDataMode?: 'sample' | 'official' | 'empty';
  events?: { family?: unknown[]; tomb?: unknown[] };
  materials?: unknown[];
  media?: unknown;
  pendingChanges: LocalChange[];
};

export function emptyLocalWorkspace(): LocalWorkspace {
  return { version: 1, updatedAt: new Date().toISOString(), pendingChanges: [] };
}

export function readLocalWorkspace(): LocalWorkspace {
  if (typeof window === 'undefined') return emptyLocalWorkspace();
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_WORKSPACE_KEY) || 'null') as LocalWorkspace | null;
    if (parsed?.version === 1 && Array.isArray(parsed.pendingChanges)) return parsed;
  } catch {}
  return emptyLocalWorkspace();
}

export function writeLocalWorkspace(value: LocalWorkspace) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ ...value, version: 1, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent(LOCAL_WORKSPACE_EVENT));
}

export function queueLocalChange(change: Omit<LocalChange, 'id' | 'changedAt'> & { id?: string }, patch: Partial<LocalWorkspace> = {}) {
  const current = readLocalWorkspace();
  const next: LocalChange = { ...change, id: change.id || crypto.randomUUID(), changedAt: new Date().toISOString() };
  writeLocalWorkspace({ ...current, ...patch, version: 1, pendingChanges: [...current.pendingChanges, next] });
  return next;
}

export function queueFamilySnapshot(family: unknown, label: string, before?: unknown, dataMode: 'sample' | 'official' | 'empty' = 'official') {
  queueLocalChange({ kind: 'family', action: 'update', label, before, after: { family, dataMode } }, { family, familyDataMode: dataMode });
}

export function markChangesSubmitted(ids: string[], requestId: string) {
  const current = readLocalWorkspace();
  const submitted = new Set(ids);
  const media = { ...(current.media && typeof current.media === 'object' ? current.media as Record<string, unknown> : {}), lastSubmittedRequestId: requestId };
  writeLocalWorkspace({ ...current, media, pendingChanges: current.pendingChanges.filter((change) => !submitted.has(change.id)) });
}

export function clearLocalWorkspace() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_WORKSPACE_KEY);
  window.dispatchEvent(new CustomEvent(LOCAL_WORKSPACE_EVENT));
}
