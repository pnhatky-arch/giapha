import FamilyApp from './family-app';
import { getInternalUser } from './internal-auth';
import GenerationSelectionGlow from '@/components/generation-selection-glow';
import GenerationFilterInfo from '@/components/generation-filter-info';
import BottomTabSelectionGlow from '@/components/bottom-tab-selection-glow';
import EventsHueEnhancements from '@/components/events-hue-enhancements';
import EventsFilterFitRow from '@/components/events-filter-fit-row';
import TombSweepingEvents from '@/components/tomb-sweeping-events';
import EventsCardLayoutFix from '@/components/events-card-layout-fix';
import EventsMediaEnhancements from '@/components/events-media-enhancements';
import EventsEditPermissionFix from '@/components/events-edit-permission-fix';
import MaterialsMobileTune from '@/components/materials-mobile-tune';
import MaterialsMediaStateFix from '@/components/materials-media-state-fix';
import AutoDisplayResolver from '@/components/auto-display-resolver';
import DynamicLanguageData from '@/components/dynamic-language-data';
import TreeMobileGenerations from '@/components/tree-mobile-generations';
import TreeHeadingCenter from '@/components/tree-heading-center';
import TreeSingleGenerationCards from '@/components/tree-single-generation-cards';
import TreeTouchZoom from '@/components/tree-touch-zoom';
import TreeSvgExport from '@/components/tree-svg-export';
import SampleFixtureEnhancements from '@/components/sample-fixture-enhancements';
import SystemBackupEnhancements from '@/components/system-backup-enhancements';
import SettingsCollapseCards from '@/components/settings-collapse-cards';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getInternalUser();
  const canEdit = Boolean(user);
  return <><FamilyApp user={user ? { displayName: user.displayName, username: user.username, role: user.role, permissions: user.permissions } : null} /><DynamicLanguageData /><AutoDisplayResolver /><GenerationSelectionGlow /><GenerationFilterInfo /><TreeMobileGenerations /><TreeSingleGenerationCards /><TreeTouchZoom /><TreeSvgExport /><TreeHeadingCenter /><BottomTabSelectionGlow /><EventsHueEnhancements /><EventsFilterFitRow /><TombSweepingEvents canEdit={canEdit} /><EventsCardLayoutFix /><EventsMediaEnhancements canEdit={canEdit} /><EventsEditPermissionFix canEdit={canEdit} /><MaterialsMobileTune /><MaterialsMediaStateFix /><SampleFixtureEnhancements /><SystemBackupEnhancements /><SettingsCollapseCards /></>;
}
