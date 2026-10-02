import FamilyApp from './family-app';
import { getInternalUser } from './internal-auth';
import GenerationSelectionGlow from '@/components/generation-selection-glow';
import BottomTabSelectionGlow from '@/components/bottom-tab-selection-glow';
import EventsHueEnhancements from '@/components/events-hue-enhancements';
import TombSweepingEvents from '@/components/tomb-sweeping-events';
import MaterialsMobileTune from '@/components/materials-mobile-tune';
import AutoDisplayResolver from '@/components/auto-display-resolver';
import TreeMobileGenerations from '@/components/tree-mobile-generations';
import TreeHeadingCenter from '@/components/tree-heading-center';
import TreeSingleGenerationCards from '@/components/tree-single-generation-cards';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getInternalUser();
  const canEdit = Boolean(user);
  return <><FamilyApp user={user ? { displayName: user.displayName, username: user.username, role: user.role, permissions: user.permissions } : null} /><AutoDisplayResolver /><GenerationSelectionGlow /><TreeMobileGenerations /><TreeSingleGenerationCards /><TreeHeadingCenter /><BottomTabSelectionGlow /><EventsHueEnhancements /><TombSweepingEvents canEdit={canEdit} /><MaterialsMobileTune /></>;
}
