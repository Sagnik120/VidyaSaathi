/**
 * The notebook's textures: ruled paper (with the coral margin line), dot-grid
 * paper, paper grain and the marigold highlighter. On the web these are CSS
 * background images; here they are drawn behind the content.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/theme/tokens';
import { EASE_OUT } from '@/components/motion';
import { Txt } from './text';

const LINE_GAP = 32;
const MARGIN_AT = 63;

const NO_TOUCH: ViewStyle = { pointerEvents: 'none' };

/**
 * Ruled notebook paper behind `children`: a blue line every 32px and, with
 * `margin`, the coral margin line 64px from the left edge (.ruled / .ruled-plain).
 */
export function Ruled({ children, style, margin = true, opacity = 1, lineColor = COLORS.rule }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; margin?: boolean; opacity?: number; lineColor?: string;
}) {
  const [height, setHeight] = useState(0);
  const count = Math.floor((height + 1) / LINE_GAP);
  return (
    <View style={style} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={[StyleSheet.absoluteFill, NO_TOUCH, { opacity, overflow: 'hidden' }]}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * LINE_GAP - 1, height: 1, backgroundColor: lineColor }} />
        ))}
        {margin && <View style={{ position: 'absolute', top: 0, bottom: 0, left: MARGIN_AT, width: 1, backgroundColor: COLORS.margin }} />}
      </View>
      {children}
    </View>
  );
}

/** Dot-grid paper (.dotted): a dot every `gap` px. Fills its parent. */
export function Dots({ gap = 18, color = COLORS['line-2'], opacity = 1, radius = 1 }: { gap?: number; color?: string; opacity?: number; radius?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, setBox] = useState({ w: 0, h: 0 });
  return (
    <View style={[StyleSheet.absoluteFill, NO_TOUCH, { opacity }]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && (
        <Svg width={box.w} height={box.h}>
          <Defs>
            <Pattern id={`dots${id}`} x="0" y="0" width={gap} height={gap} patternUnits="userSpaceOnUse">
              <Circle cx={gap / 2} cy={gap / 2} r={radius} fill={color} />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width={box.w} height={box.h} fill={`url(#dots${id})`} />
        </Svg>
      )}
    </View>
  );
}

/** Subtle paper noise over a surface (.paper-grain). Fills its parent. */
export function Grain({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <Image
      source={require('@/assets/images/grain.png')}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity }, NO_TOUCH as object]}
    />
  );
}

/**
 * Text with the marigold highlighter stroked behind it (.highlight); with
 * `sweep` the stroke draws itself in (.highlight-sweep).
 */
export function Highlight({ children, style, sweep = false, delay = 0 }: { children: ReactNode; style?: StyleProp<TextStyle>; sweep?: boolean; delay?: number }) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const size = typeof flat.fontSize === 'number' ? flat.fontSize : 16;
  const p = useSharedValue(sweep ? 0 : 1);
  useEffect(() => {
    if (sweep) p.set(withDelay(delay * 1000, withTiming(1, { duration: 1100, easing: EASE_OUT })));
  }, [sweep, delay, p]);
  const band = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: size * 0.12 }}>
      <Animated.View style={[{ position: 'absolute', left: 0, bottom: '10%', height: size * 0.62, borderRadius: size * 0.2, overflow: 'hidden' }, NO_TOUCH, band]}>
        <LinearGradient
          colors={['rgba(249,225,154,0)', COLORS['marigold-200'], COLORS['marigold-100'], 'rgba(253,240,203,0)']}
          locations={[0, 0.03, 0.96, 1]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Txt style={style}>{children}</Txt>
    </View>
  );
}
