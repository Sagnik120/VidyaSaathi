/**
 * Slide-to-unlock, adapted: a deliberate gesture for a consequential action
 * (skipping a concept). Drag the handle to the end to confirm.
 */
import { useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { ChevronsRight, Loader2 } from 'lucide-react-native';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { Spin } from '@/components/motion';
import { haptic } from '@/lib/haptics';
import { Txt } from './text';

const HANDLE = 48;
const PAD = 4;

export function SlideToConfirm({ label, onConfirm, disabled, style, testID }: {
  label: string; onConfirm: () => Promise<void> | void; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const [busy, setBusy] = useState(false);
  const x = useSharedValue(0);
  const max = useSharedValue(200);
  // Where the finger and the handle were when the drag began.
  const drag = useRef({ pageX: 0, x: 0 });
  const locked = disabled || busy;

  const confirm = async () => {
    x.set(withTiming(max.get(), { duration: 150 }));
    setBusy(true);
    haptic.success();
    try { await onConfirm(); } finally {
      setBusy(false);
      x.set(withSpring(0, { stiffness: 300, damping: 28 }));
    }
  };
  const settle = () => x.set(withSpring(0, { stiffness: 400, damping: 30 }));

  const handle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + HANDLE }));
  const text = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, x.value / (max.value * 0.6 || 1)) }));

  return (
    <View
      accessibilityLabel={label}
      onLayout={(e) => max.set(Math.max(0, e.nativeEvent.layout.width - HANDLE - PAD * 2 - 2))}
      style={[tw('h-14 overflow-hidden rounded-full border border-line bg-paper-2'), locked ? { opacity: 0.6 } : null, style]}
    >
      <Animated.View style={[tw('absolute rounded-full bg-margin-100'), { left: PAD, top: PAD, bottom: PAD }, fill]} />
      <Animated.View style={[tw('absolute inset-0 items-center justify-center pl-10'), { pointerEvents: 'none' }, text]}>
        <Txt numberOfLines={1} style={tw('text-sm font-medium text-ink-2')}>{label}</Txt>
      </Animated.View>
      <Animated.View
        testID={testID}
        onStartShouldSetResponder={() => !locked}
        onMoveShouldSetResponder={() => !locked}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => { drag.current = { pageX: e.nativeEvent.pageX, x: x.get() }; }}
        onResponderMove={(e) => x.set(Math.min(max.get(), Math.max(0, drag.current.x + e.nativeEvent.pageX - drag.current.pageX)))}
        onResponderRelease={() => { if (x.get() >= max.get() * 0.85) void confirm(); else settle(); }}
        onResponderTerminate={settle}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => { if (!locked) void confirm(); }}
        style={[tw('absolute items-center justify-center rounded-full bg-margin'), { top: PAD, left: PAD, width: HANDLE, height: HANDLE, boxShadow: SHADOW.soft }, handle]}
      >
        {busy ? <Spin><Loader2 size={20} color={COLORS.white} /></Spin> : <ChevronsRight size={20} color={COLORS.white} />}
      </Animated.View>
    </View>
  );
}
