'use client';

export const LOCAL_WORKSPACE_KEY = 'giapha:device-workspace:v1';
export const LOCAL_BACKUP_SCOPE = 'giapha-device-local';

export type LocalWorkspace = {
  version: 1;
  updatedAt: string;
  family?: unknown;
  events?: unknown;
  materials?: unknown;
  media?: unknown;
  settings?: unknown;
  pendingChanges: Array<{ id: string; kind: string; action: 'create' | 'update' | 'delete'; label: string; before?: unknown; after?: unknown; changedAt: string }>;
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
  localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify({ ...value, version: 1, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent('giapha:local-workspace-changed'));
}

export function clearLocalWorkspace() {
  localStorage.removeItem(LOCAL_WORKSPACE_KEY);
  window.dispatchEvent(new CustomEvent('giapha:local-workspace-changed'));
}
