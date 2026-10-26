/** After verification: "नमस्ते" is hand-written, then "hello" beneath it, then we fly on. */
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useI18n } from '@/providers/i18n';
import { tw } from '@/theme/tw';
import { PlaneMark } from '@/components/brand/logo';
import { Reveal, Written } from '@/components/motion';
import { Ruled } from '@/components/ui/paper';
import { Portal } from '@/components/ui/portal';
import { Txt } from '@/components/ui/text';

export function NamasteOverlay({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const fade = useSharedValue(0);
  const flight = useSharedValue(0);

  useEffect(() => {
    const id = setTimeout(onDone, 2600);
    return () => clearTimeout(id);
  }, [onDone]);
  useEffect(() => {
    fade.set(withTiming(1, { duration: 300 }));
    flight.set(withDelay(1400, withTiming(1, { duration: 1400, easing: Easing.in(Easing.quad) })));
  }, [fade, flight]);

  const screen = useAnimatedStyle(() => ({ opacity: fade.value }));
  const plane = useAnimatedStyle(() => ({
    transform: [
      { translateX: -0.55 * width + 1.15 * width * flight.value },
      { translateY: 0.2 * height - 0.5 * height * flight.value },
      { rotate: `${-10 + 18 * flight.value}deg` },
    ],
  }));

  const big = Math.min(144, Math.max(64, width * 0.2));
  const small = Math.min(56, Math.max(32, width * 0.09));
  return (
    <Portal>
      <Animated.View accessibilityRole="alert" testID="namaste" style={[StyleSheet.absoluteFill, tw('bg-paper'), screen]}>
        <Ruled style={[StyleSheet.absoluteFill, tw('items-center justify-center')]}>
          <View style={tw('items-center')}>
            <Written delay={0.15} duration={1.1}>
              <Txt style={[tw('font-display text-ink'), { fontSize: big, lineHeight: big * 1.5 }]}>नमस्ते</Txt>
            </Written>
            <Written delay={1.1} duration={0.7}>
              <Txt style={[tw('font-hand text-sky-600'), { fontSize: small, lineHeight: small * 1.4 }]}>hello</Txt>
            </Written>
            <Reveal delay={1.7} y={6} duration={0.4}><Txt style={tw('mt-6 text-center text-ink-2')}>{t('auth.namaste')}</Txt></Reveal>
          </View>
          <Animated.View style={[{ position: 'absolute' }, plane]}><PlaneMark size={64} /></Animated.View>
        </Ruled>
      </Animated.View>
    </Portal>
  );
}
