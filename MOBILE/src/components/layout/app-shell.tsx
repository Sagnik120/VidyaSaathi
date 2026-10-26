/**
 * The signed-in shell: a top bar (logo, search, language, profile) and the
 * floating tab bar. Staff get their portal's sections instead of the learning
 * tabs.
 */
import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { router, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Gauge, Home, Route, Search, Shield, Sparkles } from 'lucide-react-native';
import type { MessageKey } from '@/core/i18n';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { isStaff, tabsFor } from '@/lib/staff';
import { Avatar } from '@/components/brand/avatar';
import { Logo, type LogoHandle } from '@/components/brand/logo';
import type { IconType } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { CommandPalette } from './command-palette';
import { LanguageToggle } from './language-toggle';

/** Room a page leaves at the bottom so its last line clears the tab bar. */
export const TAB_BAR_SPACE = 100;

type NavItem = { id: string; href: Href; key: MessageKey; icon: IconType; match: (pathname: string, tab: string) => boolean };

const under = (base: string) => (pathname: string) => pathname === base || pathname.startsWith(`${base}/`);

const LEARNER_NAV: NavItem[] = [
  { id: 'dashboard', href: '/dashboard', key: 'nav.dashboard', icon: Home, match: under('/dashboard') },
  { id: 'new', href: '/new', key: 'nav.newLesson', icon: Sparkles, match: under('/new') },
  { id: 'path', href: '/path', key: 'nav.path', icon: Route, match: under('/path') },
  { id: 'lessons', href: '/lessons', key: 'nav.lessons', icon: BookOpen, match: under('/lessons') },
  { id: 'progress', href: '/progress', key: 'nav.progress', icon: Gauge, match: under('/progress') },
];

function useNav(): { items: NavItem[]; staff: boolean } {
  const { user } = useAuth();
  const staff = isStaff(user);
  if (!staff) return { items: LEARNER_NAV, staff };
  const items = tabsFor(user).slice(0, 5).map<NavItem>((x) => ({
    id: x.v, href: { pathname: '/admin', params: { tab: x.v } }, key: x.k, icon: x.icon,
    match: (pathname, tab) => pathname === '/admin' && tab === x.v,
  }));
  return { items, staff };
}

export function TopBar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [palette, setPalette] = useState(false);
  const logo = useRef<LogoHandle>(null);
  const staff = isStaff(user);
  return (
    <View style={[tw('border-b border-line bg-paper px-4 pb-3'), { paddingTop: insets.top + 12 }]}>
      <View style={tw('flex-row items-center justify-between')}>
        <View style={tw('flex-row items-center gap-2')}>
          <Press onPress={() => { logo.current?.loop(); router.navigate(staff ? '/admin' : '/dashboard'); }} hitSlop={8} accessibilityLabel="VidyaSaathi" testID="home-logo">
            <Logo ref={logo} size={28} withWord={false} />
          </Press>
          {staff && (
            <View style={tw('flex-row items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5')}>
              <Shield size={12} color={COLORS.white} />
              <Txt style={[tw('font-semibold text-white'), { fontSize: 11.2, lineHeight: 16 }]}>{t(user?.role === 'admin' ? 'staff.admin' : 'staff.teacher')}</Txt>
            </View>
          )}
        </View>
        <View style={tw('flex-row items-center gap-2')}>
          <Press onPress={() => setPalette(true)} accessibilityLabel={t('nav.command')} testID="open-search"
            style={tw('h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface')} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
            <Search size={16} color={COLORS.ink} />
          </Press>
          <LanguageToggle />
          <Press href="/profile" accessibilityLabel={t('nav.profile')} testID="open-profile"><Avatar user={user} size={34} /></Press>
        </View>
      </View>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </View>
  );
}

/** Height of the bar itself (the safe-area gap below it is added on top). */
const BAR_HEIGHT = 66;
const BAR_MAX_WIDTH = 560;
const INDICATOR = { width: 52, height: 32 };
const SPRING = { stiffness: 380, damping: 32, mass: 0.9 };

/** One tab: an icon that springs when it becomes current, and a label that shrinks rather than truncates. */
function TabButton({ item, on, label, width, onPress }: { item: NavItem; on: boolean; label: string; width: number; onPress: () => void }) {
  const pop = useSharedValue(1);
  const lit = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lit.set(withTiming(on ? 1 : 0, { duration: 220 }));
    if (on) pop.set(withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { stiffness: 520, damping: 14 })));
  }, [on, lit, pop]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }, { translateY: -lit.value }] }));
  const tint = on ? COLORS.white : COLORS['ink-3'];
  return (
    <Press onPress={onPress} scaleTo={0.92} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} testID={`tab-${item.id}`}
      style={[tw('items-center justify-center'), { width, height: BAR_HEIGHT }]}>
      <Animated.View style={[tw('items-center justify-center'), { width: INDICATOR.width, height: INDICATOR.height }, iconStyle]}>
        <item.icon size={19} color={tint} strokeWidth={on ? 2.2 : 1.9} />
      </Animated.View>
      <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
        style={[tw(on ? 'font-semibold' : 'font-medium'), { marginTop: 3, fontSize: 10.5, lineHeight: 14, color: on ? COLORS.ink : COLORS['ink-3'], maxWidth: width - 6, textAlign: 'center' }]}>
        {label}
      </Txt>
    </Press>
  );
}

/**
 * The floating tab bar: equal slots on every screen width (centred and capped
 * on tablets), with an ink capsule that glides to the current tab.
 */
export function TabBar() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ tab?: string }>();
  const { items } = useNav();
  const tab = typeof params.tab === 'string' ? params.tab : 'overview';
  const index = items.findIndex((i) => i.match(pathname, tab));

  const barWidth = Math.min(screen - 24, BAR_MAX_WIDTH);
  const inner = barWidth - 12;
  const slot = inner / items.length;

  const x = useSharedValue(0);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (index < 0) { shown.set(withTiming(0, { duration: 160 })); return; }
    const to = 6 + index * slot + (slot - INDICATOR.width) / 2;
    if (shown.value < 0.5) x.set(to); else x.set(withSpring(to, SPRING));
    shown.set(withTiming(1, { duration: 160 }));
  }, [index, slot, x, shown]);
  const indicator = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value }, { scale: 0.85 + 0.15 * shown.value }] }));

  const bottom = Math.max(insets.bottom - 6, 10);
  return (
    <>
    {/* the page dissolves into the paper before it reaches the bar */}
    <LinearGradient colors={['rgba(251, 250, 246, 0)', 'rgba(251, 250, 246, 0.92)', COLORS.paper]} locations={[0, 0.55, 1]}
      style={[tw('absolute inset-x-0 bottom-0'), { height: bottom + BAR_HEIGHT + 28, pointerEvents: 'none' }]} />
    <View style={[tw('absolute inset-x-0 items-center'), { bottom, pointerEvents: 'box-none' }]}>
      <View accessibilityRole="tablist"
        style={[tw('flex-row items-center border border-line'), {
          width: barWidth, height: BAR_HEIGHT, paddingHorizontal: 6, borderRadius: 26,
          backgroundColor: COLORS.surface,
          boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 18px 40px -18px rgba(29, 42, 68, 0.45), 0 4px 12px -6px rgba(29, 42, 68, 0.18)',
        }]}>
        <Animated.View style={[tw('absolute rounded-full bg-ink'), {
          left: 0, top: (BAR_HEIGHT - INDICATOR.height - 17) / 2 - 1, width: INDICATOR.width, height: INDICATOR.height, pointerEvents: 'none',
          boxShadow: '0 6px 14px -6px rgba(29, 42, 68, 0.7)',
        }, indicator]} />
        {items.map((item, i) => (
          <TabButton key={item.id} item={item} on={i === index} label={t(item.key)} width={slot}
            onPress={() => { if (i !== index) haptic.tap(); router.navigate(item.href); }} />
        ))}
      </View>
    </View>
    </>
  );
}
