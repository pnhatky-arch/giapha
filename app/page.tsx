import FamilyApp from './family-app';
import { getInternalUser } from './internal-auth';
import GenerationSelectionGlow from '@/components/generation-selection-glow';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getInternalUser();
  return <><FamilyApp user={user ? { displayName: user.displayName, username: user.username, role: user.role, permissions: user.permissions } : null} /><GenerationSelectionGlow /></>;
}
