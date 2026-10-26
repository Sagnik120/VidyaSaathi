/**
 * The mark: a paper plane folded from a ruled notebook page. Its two creases
 * sit like "॥" — the Devanagari pause, and a pause button: the teacher who
 * stops to check you're with it. Touch it: it loops and leaves a flight trail.
 */
import { useCallback, useEffect, useImperativeHandle, type Ref } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Line, Path } from 'react-native-svg';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { EASE_OUT } from '@/components/motion';
import { Txt } from '@/components/ui/text';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

const PAUSE_LEN = 8.4; // length of each ॥ stroke, for drawing it in

export function PlaneMark({ size = 36, style, animateIn = false }: { size?: number; style?: StyleProp<ViewStyle>; animateIn?: boolean }) {
  const page = useSharedValue(animateIn ? 0 : 1);
  const wing = useSharedValue(animateIn ? 0 : 1);
  const mark1 = useSharedValue(animateIn ? 0 : 1);
  const mark2 = useSharedValue(animateIn ? 0 : 1);
  useEffect(() => {
    if (!animateIn) return;
    page.set(withTiming(1, { duration: 500, easing: EASE_OUT }));
    wing.set(withDelay(150, withTiming(1, { duration: 500, easing: EASE_OUT })));
    mark1.set(withDelay(350, withTiming(1, { duration: 350, easing: EASE_OUT })));
    mark2.set(withDelay(500, withTiming(1, { duration: 350, easing: EASE_OUT })));
  }, [animateIn, page, wing, mark1, mark2]);
  const pageProps = useAnimatedProps(() => ({ opacity: page.value }));
  const wingProps = useAnimatedProps(() => ({ opacity: wing.value }));
  const mark1Props = useAnimatedProps(() => ({ strokeDashoffset: PAUSE_LEN * (1 - mark1.value), opacity: mark1.value > 0 ? 1 : 0 }));
  const mark2Props = useAnimatedProps(() => ({ strokeDashoffset: PAUSE_LEN * (1 - mark2.value), opacity: mark2.value > 0 ? 1 : 0 }));

  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg viewBox="0 0 64 64" width={size} height={size}>
        <Defs>
          <ClipPath id="sk-body">
            <Path d="M6 30 L58 9 L27 37 Z" />
          </ClipPath>
        </Defs>
        {/* lower wing (in shadow) */}
        <AnimatedPath d="M27 37 L58 9 L35 56 Z" fill={COLORS['sky-100']} stroke={COLORS.ink} strokeWidth={1.6} strokeLinejoin="round" animatedProps={wingProps} />
        {/* fold flap */}
        <Path d="M27 37 L31 47 L35 56 Z" fill={COLORS['sky-200']} stroke={COLORS.ink} strokeWidth={1.4} strokeLinejoin="round" />
        {/* the page itself, with its ruled lines */}
        <AnimatedG animatedProps={pageProps}>
          <Path d="M6 30 L58 9 L27 37 Z" fill={COLORS.surface} stroke={COLORS.ink} strokeWidth={1.6} strokeLinejoin="round" />
          <G clipPath="url(#sk-body)" stroke={COLORS.rule} strokeWidth={1.1}>
            <Line x1="0" y1="20" x2="64" y2="20" />
            <Line x1="0" y1="26" x2="64" y2="26" />
            <Line x1="0" y1="32" x2="64" y2="32" />
            <Line x1="16" y1="0" x2="16" y2="64" stroke={COLORS.margin} strokeWidth={0.9} />
          </G>
        </AnimatedG>
        {/* ॥ — the pause */}
        <AnimatedLine x1="31" y1="21" x2="28.5" y2="29" stroke={COLORS['sky-600']} strokeWidth={2.6} strokeLinecap="round" strokeDasharray={`${PAUSE_LEN} ${PAUSE_LEN}`} animatedProps={mark1Props} />
        <AnimatedLine x1="37" y1="18.5" x2="34.5" y2="26.5" stroke={COLORS['sky-600']} strokeWidth={2.6} strokeLinecap="round" strokeDasharray={`${PAUSE_LEN} ${PAUSE_LEN}`} animatedProps={mark2Props} />
      </Svg>
    </View>
  );
}

export type LogoHandle = { loop: () => void };

const LOOP_X = [0, 10, 16, 8, -2, 0];
const LOOP_Y = [0, -10, -2, 8, 4, 0];
const LOOP_R = [0, -24, -120, -250, -350, -360];
const LOOP_AT = [0, 0.2, 0.4, 0.6, 0.8, 1];
const TRAIL_LEN = 96;

export function Logo({ style, withWord = true, size = 34, ref }: { style?: StyleProp<ViewStyle>; withWord?: boolean; size?: number; ref?: Ref<LogoHandle> }) {
  const takeoff = useSharedValue(0);
  const loop = useSharedValue(0);
  const trail = useSharedValue(0);

  // Replays a little take-off each time it appears.
  useEffect(() => { takeoff.set(withTiming(1, { duration: 800, easing: EASE_OUT })); }, [takeoff]);

  const play = useCallback(() => {
    loop.set(0);
    loop.set(withTiming(1, { duration: 1100, easing: EASE_OUT }));
    trail.set(0);
    trail.set(withSequence(withTiming(1, { duration: 600, easing: EASE_OUT }), withTiming(2, { duration: 600, easing: EASE_OUT })));
  }, [loop, trail]);
  useImperativeHandle(ref, () => ({ loop: play }), [play]);

  const plane = useAnimatedStyle(() => {
    const rest = 1 - takeoff.value;
    return {
      opacity: takeoff.value,
      transform: [
        { translateX: -10 * rest + interpolate(loop.value, LOOP_AT, LOOP_X) },
        { translateY: 6 * rest + interpolate(loop.value, LOOP_AT, LOOP_Y) },
        { rotate: `${-14 * rest + interpolate(loop.value, LOOP_AT, LOOP_R)}deg` },
      ],
    };
  });
  // 0 → 1 draws the dashed trail, 1 → 2 fades it away.
  const trailProps = useAnimatedProps(() => ({
    strokeDashoffset: TRAIL_LEN * (1 - Math.min(1, trail.value)),
    opacity: trail.value <= 0 ? 0 : trail.value <= 1 ? 1 : 2 - trail.value,
  }));

  return (
    <View style={[tw('flex-row items-center gap-2.5'), style]} onTouchStart={play}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg viewBox="0 0 64 64" width={size * 1.5} height={size * 1.5} style={{ position: 'absolute', left: -16, top: -12, pointerEvents: 'none' }}>
          <AnimatedPath
            d="M4 58 C 14 40, 30 64, 40 46 S 60 30, 46 20"
            fill="none" stroke={COLORS['sky-300']} strokeWidth={1.6} strokeLinecap="round"
            strokeDasharray={`${TRAIL_LEN} ${TRAIL_LEN}`} animatedProps={trailProps}
          />
        </Svg>
        <Animated.View style={plane}><PlaneMark size={size} /></Animated.View>
      </View>
      {withWord && (
        <View>
          <Txt style={[tw('font-display text-ink'), { fontSize: 24.8, lineHeight: 28, letterSpacing: -0.6 }]}>
            VidyaSaathi<Txt style={tw('text-sky-600')}>.</Txt>
          </Txt>
          <View style={[tw('flex-row items-center'), { marginTop: 1 }]}>
            <Txt style={[tw('font-medium text-ink-3'), { fontSize: 9.9, lineHeight: 15 }]}>शिक्षक ·</Txt>
            <Txt style={[tw('font-medium uppercase text-ink-3'), { fontSize: 9.9, lineHeight: 15, letterSpacing: 2.2 }]}> AI teacher</Txt>
          </View>
        </View>
      )}
    </View>
  );
}
