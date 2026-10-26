/**
 * Snapping slider with a liquid-glass thumb: the thumb rides the track and
 * squashes while dragged. Tap a stop's label to jump straight to it.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { Press } from './press';
import { Txt } from './text';

const THUMB_W = 64;

export function GlassSlider({ stops, value, onChange, format, ariaLabel }: {
  stops: number[]; value: number; onChange: (v: number) => void; format: (v: number) => ReactNode; ariaLabel: string;
}) {
  const idx = Math.max(0, stops.indexOf(value));
  const last = stops.length - 1;
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState(false);
  const pct = useSharedValue(idx / last);
  const squash = useSharedValue(0);
  // Where the finger was, and where on the track it landed, when the drag began.
  const origin = useRef({ pageX: 0, at: 0 });

  useEffect(() => { if (!drag) pct.set(withSpring(idx / last, { stiffness: 500, damping: 40 })); }, [idx, drag, pct, last]);
  useEffect(() => { squash.set(withSpring(drag ? 1 : 0, { stiffness: 400, damping: 22 })); }, [drag, squash]);

  const move = (px: number) => {
    if (!width) return;
    const p = Math.min(1, Math.max(0, px / width));
    pct.set(p);
    const i = Math.round(p * last);
    if (stops[i] !== value) { haptic.tap(); onChange(stops[i]); }
  };

  const fill = useAnimatedStyle(() => ({ width: pct.value * width }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: pct.value * width - THUMB_W / 2 }, { scaleX: 1 + 0.15 * squash.value }, { scaleY: 1 - 0.12 * squash.value }],
  }));

  return (
    <View>
      <View
        testID="time-slider"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => { origin.current = { pageX: e.nativeEvent.pageX, at: e.nativeEvent.locationX }; setDrag(true); move(e.nativeEvent.locationX); }}
        onResponderMove={(e) => move(origin.current.at + e.nativeEvent.pageX - origin.current.pageX)}
        onResponderRelease={() => setDrag(false)}
        onResponderTerminate={() => setDrag(false)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={ariaLabel}
        accessibilityValue={{ min: stops[0], max: stops[last], now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onChange(stops[Math.min(last, idx + 1)]);
          if (e.nativeEvent.actionName === 'decrement') onChange(stops[Math.max(0, idx - 1)]);
        }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={tw('h-12 justify-center')}
      >
        {/* everything inside ignores touches, so the track itself measures them */}
        <View style={[tw('absolute inset-0 justify-center'), { pointerEvents: 'none' }]}>
          <View style={[tw('h-3 rounded-full bg-paper-3'), { boxShadow: SHADOW.press }]} />
          <Animated.View style={[tw('absolute left-0 h-3 overflow-hidden rounded-full'), fill]}>
            <LinearGradient colors={[COLORS['sky-300'], COLORS['sky-600']]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: Math.max(width, 1), height: 12 }} />
          </Animated.View>
          {stops.map((s, i) => (
            <View key={s} style={[tw('absolute h-1.5 w-1.5 rounded-full'), { left: (i / last) * width - 3, backgroundColor: i <= idx ? 'rgba(255,255,255,0.9)' : COLORS['line-2'] }]} />
          ))}
          <Animated.View
            style={[
              tw('absolute left-0 h-10 rounded-full border'),
              {
                width: THUMB_W, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.45)',
                boxShadow: '0 6px 20px -6px rgba(30, 41, 66, 0.35), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -6px 12px rgba(59, 102, 174, 0.12)',
              },
              thumb,
            ]}
          />
        </View>
      </View>
      <View style={tw('mt-2 flex-row justify-between')}>
        {stops.map((s) => (
          <Press key={s} onPress={() => onChange(s)} hitSlop={8} testID={`time-${s}`} style={tw('min-w-8 items-center rounded-md px-1')}>
            <Txt style={[tw('text-xs'), { color: s === value ? COLORS.ink : COLORS['ink-3'], fontWeight: s === value ? '600' : '400' }]}>{format(s)}</Txt>
          </Press>
        ))}
      </View>
    </View>
  );
}
