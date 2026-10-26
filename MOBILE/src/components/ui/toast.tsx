/**
 * Toasts, styled like the website's (a paper card rising from the bottom).
 * `toast.success("Saved")` works from anywhere; <Toaster /> shows them.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { EASE_OUT } from '@/components/motion';
import { Txt } from './text';

type Tone = 'info' | 'success' | 'warning' | 'error';
type Item = { id: number; text: string; tone: Tone };

const LIFETIME = 4000;
let items: Item[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

function show(text: string, tone: Tone) {
  if (!text) return;
  const item = { id: nextId++, text, tone };
  items = [...items.slice(-2), item];
  emit();
  setTimeout(() => dismiss(item.id), LIFETIME);
}
function dismiss(id: number) {
  if (!items.some((i) => i.id === id)) return;
  items = items.filter((i) => i.id !== id);
  emit();
}

export const toast = Object.assign((text: string) => show(text, 'info'), {
  info: (text: string) => show(text, 'info'),
  success: (text: string) => show(text, 'success'),
  warning: (text: string) => show(text, 'warning'),
  error: (text: string) => show(text, 'error'),
});

const ICONS: Record<Tone, React.ReactNode> = {
  info: <Info size={18} color={COLORS['sky-600']} />,
  success: <CircleCheck size={18} color={COLORS.sage} />,
  warning: <TriangleAlert size={18} color={COLORS.amber} />,
  error: <CircleAlert size={18} color={COLORS.rose} />,
};

function ToastCard({ item }: { item: Item }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withTiming(1, { duration: 350, easing: EASE_OUT })); }, [p]);
  const animated = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 24 }, { scale: 0.96 + 0.04 * p.value }] }));
  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={() => dismiss(item.id)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[tw('flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5'), { boxShadow: SHADOW.lift }]}
      >
        {ICONS[item.tone]}
        <Txt style={tw('flex-1 text-sm font-medium text-ink')}>{item.text}</Txt>
      </Pressable>
    </Animated.View>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);
  const insets = useSafeAreaInsets();
  // Inside the app the floating tab bar owns the bottom edge; toasts sit just above it.
  const aboveTabs = useSegments()[0] === '(app)';
  if (!list.length) return null;
  return (
    <View style={[tw('absolute inset-x-0 items-center px-4'), { bottom: insets.bottom + (aboveTabs ? 104 : 16), pointerEvents: 'box-none' }]}>
      <View style={[tw('w-full gap-2'), { maxWidth: 420, pointerEvents: 'box-none' }]}>
        {list.map((item) => <ToastCard key={item.id} item={item} />)}
      </View>
    </View>
  );
}
