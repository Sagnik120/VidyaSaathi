import { useEffect } from 'react';
import { router, usePathname, Tabs } from 'expo-router';
import { useAuth } from '@/providers/auth';
import { COLORS } from '@/theme/tokens';
import { LEARNER_ONLY, isStaff } from '@/lib/staff';
import { TabBar, TopBar } from '@/components/layout/app-shell';

const renderHeader = () => <TopBar />;
const renderTabBar = () => <TabBar />;

export default function AppLayout() {
  const { user } = useAuth();
  const pathname = usePathname();
  // Staff get their own portal; the learning pages send them there.
  const misplaced = isStaff(user) && LEARNER_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  useEffect(() => { if (misplaced) router.replace('/admin'); }, [misplaced]);

  return (
    <Tabs
      backBehavior="history"
      tabBar={renderTabBar}
      screenOptions={{ header: renderHeader, sceneStyle: { backgroundColor: COLORS.paper }, animation: 'none' }}
    />
  );
}
