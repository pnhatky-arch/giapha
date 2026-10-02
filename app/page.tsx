import FamilyApp from './family-app';
import { getInternalUser } from './internal-auth';
import GenerationSelectionGlow from '@/components/generation-selection-glow';
import BottomTabSelectionGlow from '@/components/bottom-tab-selection-glow';
import EventsHueEnhancements from '@/components/events-hue-enhancements';
import TombSweepingEvents from '@/components/tomb-sweeping-events';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getInternalUser();
  return <><FamilyApp user={user ? { displayName: user.displayName, username: user.username, role: user.role, permissions: user.permissions } : null} /><GenerationSelectionGlow /><BottomTabSelectionGlow /><EventsHueEnhancements /><TombSweepingEvents /></>;
}
