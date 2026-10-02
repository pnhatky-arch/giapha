import { getDatabase } from '@/db';
import { flattenFamily, type FamilyDataMode, type FamilyPerson } from '@/lib/family-tree';

export const FAMILY_DATA_MODE_KEY = 'family_data_mode';
const TREE_ID = 'primary';
const SAMPLE_TREE_COUNTS = new Set([16, 68, 168]);

export function isFamilyDataMode(value: unknown): value is FamilyDataMode {
  return value === 'sample' || value === 'official' || value === 'empty';
}

export async function getStoredFamilyDataMode(): Promise<FamilyDataMode | null> {
  const row = await getDatabase().prepare('SELECT value FROM app_settings WHERE key = ?')
    .bind(FAMILY_DATA_MODE_KEY).first<{ value: string }>();
  return isFamilyDataMode(row?.value) ? row.value : null;
}

function looksLikeSampleTree(value: unknown): value is FamilyPerson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const root = value as Partial<FamilyPerson>;
  if (root.id !== 1 || root.name !== 'Phạm Văn An') return false;
  try {
    return SAMPLE_TREE_COUNTS.has(flattenFamily(value as FamilyPerson).length);
  } catch {
    return false;
  }
}

export async function getFamilyDataMode(): Promise<FamilyDataMode> {
  const saved = await getStoredFamilyDataMode();
  if (saved) return saved;

  const row = await getDatabase().prepare('SELECT data FROM family_tree WHERE id = ?')
    .bind(TREE_ID).first<{ data: string }>();
  if (!row) return 'sample';
  if (row.data === 'null') return 'empty';

  try {
    const parsed = JSON.parse(row.data) as unknown;
    return looksLikeSampleTree(parsed) ? 'sample' : 'official';
  } catch {
    return 'sample';
  }
}
