/**
 * A form field in the notebook style: the label sits on the line, an ink
 * stroke draws under the field while it has focus, and an error nudges the
 * field once and writes itself in underneath. No zooming.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { EASE_OUT, Reveal, useShake } from '@/components/motion';
import { FieldFocus } from './primitives';
import { Txt } from './text';

export function Field({ label, hint, optional, error, children, style, index = 0 }: {
  label: ReactNode; hint?: ReactNode; optional?: string; error?: string | null; children: ReactNode; style?: StyleProp<ViewStyle>; index?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [shakeStyle, shake] = useShake(6);
  // Nudge once when an error appears. Animating (not re-keying) keeps the
  // input mounted, so nothing the user typed is lost.
  useEffect(() => { if (error) shake(); }, [error, shake]);

  const stroke = useSharedValue(0);
  useEffect(() => { stroke.set(withTiming(focused ? 1 : 0, { duration: 500, easing: EASE_OUT })); }, [focused, stroke]);
  const [width, setWidth] = useState(0);
  // Grows from the left edge, like the web's `origin-left scale-x`.
  const strokeStyle = useAnimatedStyle(() => ({ width: Math.max(0, width - 32) * stroke.value }));

  return (
    <Reveal style={style} delay={0.08 + index * 0.06} duration={0.55} y={0} x={-10}>
      <View style={tw('mb-1.5 flex-row items-baseline justify-between gap-2')}>
        <View style={tw('shrink flex-row flex-wrap items-center gap-1.5')}>
          {typeof label === 'string'
            ? <Txt style={[tw('text-sm font-medium'), { color: focused ? COLORS['sky-700'] : COLORS.ink }]}>{label}</Txt>
            : label}
          {optional ? (
            <View style={tw('rounded-full bg-paper-2 px-1.5')}>
              <Txt style={[tw('text-ink-3'), { fontSize: 10.9, lineHeight: 16 }]}>{optional}</Txt>
            </View>
          ) : null}
        </View>
        {typeof hint === 'string' ? <Txt style={tw('text-xs text-ink-3')}>{hint}</Txt> : hint}
      </View>
      <Animated.View style={shakeStyle} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <FieldFocus.Provider value={setFocused}>{children}</FieldFocus.Provider>
        <Animated.View style={[tw('absolute bottom-0 left-4 h-[2px] rounded-full bg-sky-500'), { pointerEvents: 'none' }, strokeStyle]} />
      </Animated.View>
      {error ? <FieldMessage key={error}>{error}</FieldMessage> : null}
    </Reveal>
  );
}

/** The error writes itself in from the left. */
function FieldMessage({ children }: { children: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(40, withTiming(1, { duration: 350, easing: EASE_OUT }))); }, [p]);
  const animated = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: (1 - p.value) * -8 }] }));
  return (
    <Animated.View style={animated}>
      <Txt accessibilityRole="alert" style={tw('mt-1.5 text-sm text-rose')}>{children}</Txt>
    </Animated.View>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
