/** A plain continuous slider (the web's `<input type="range">`), for the lab's dials. */
import { useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';

const THUMB = 22;

export function RangeSlider({ min, max, step, value, onChange, disabled, style, ariaLabel, testID }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; disabled?: boolean; style?: StyleProp<ViewStyle>; ariaLabel?: string; testID?: string;
}) {
  const [width, setWidth] = useState(0);
  // Where the finger was, and where on the track it landed, when the drag began.
  const origin = useRef({ pageX: 0, at: 0 });
  const snap = (raw: number) => Number((Math.min(max, Math.max(min, Math.round((raw - min) / step) * step + min))).toFixed(4));

  const move = (px: number) => {
    const usable = width - THUMB;
    if (usable <= 0) return;
    const next = snap(min + (Math.min(usable, Math.max(0, px - THUMB / 2)) / usable) * (max - min));
    if (next !== value) onChange(next);
  };

  const pct = (value - min) / (max - min);
  const left = pct * Math.max(0, width - THUMB);
  return (
    <View
      testID={testID}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => { origin.current = { pageX: e.nativeEvent.pageX, at: e.nativeEvent.locationX }; move(e.nativeEvent.locationX); }}
      onResponderMove={(e) => move(origin.current.at + e.nativeEvent.pageX - origin.current.pageX)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={ariaLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(snap(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height: 32, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={[tw('absolute inset-0 justify-center'), { pointerEvents: 'none' }]}>
        <View style={[tw('rounded-full bg-paper-3'), { height: 5 }]} />
        <View style={[tw('absolute rounded-full bg-sky-600'), { left: 0, height: 5, width: left + THUMB / 2 }]} />
        <View style={[tw('absolute rounded-full bg-sky-600'), { left, width: THUMB, height: THUMB, borderWidth: 3, borderColor: COLORS.surface, boxShadow: '0 1px 4px rgba(30, 41, 66, 0.3)' }]} />
      </View>
    </View>
  );
}
