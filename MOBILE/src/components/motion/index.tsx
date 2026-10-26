/**
 * The motion vocabulary, ported from the website: things arrive by lifting off
 * the page; a few things float, pulse, spin or shake. One easing curve
 * (--ease-out-soft) everywhere. All of it honours the system "reduce motion".
 */
import { Children, createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { COLORS, EASE } from '@/theme/tokens';
import { Txt } from '@/components/ui/text';

export const EASE_OUT = Easing.bezier(EASE[0], EASE[1], EASE[2], EASE[3]);
export const EASE_IN_OUT = Easing.inOut(Easing.ease);
export const SPRINGY = { stiffness: 380, damping: 30, mass: 0.8 } as const;

/* -- arriving ------------------------------------------------------------- */

/** A section that reveals its children only once it has scrolled into view. */
const InView = createContext(true);
export const InViewProvider = InView.Provider;
/** Whether the surrounding section has scrolled into view (always true outside the welcome story). */
export const useInView = () => useContext(InView);

export function Reveal({ children, style, delay = 0, y = 18, x = 0, duration = 0.7, scale, rotate }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; delay?: number; y?: number; x?: number; duration?: number;
  /** start scale / rotation (degrees); both settle at rest */
  scale?: number; rotate?: number;
}) {
  const inView = useContext(InView);
  const p = useSharedValue(0);
  useEffect(() => {
    if (inView) p.set(withDelay(delay * 1000, withTiming(1, { duration: duration * 1000, easing: EASE_OUT })));
  }, [inView, delay, duration, p]);
  const animated = useAnimatedStyle(() => {
    const left = 1 - p.value;
    return {
      opacity: p.value,
      transform: [
        { translateX: left * x }, { translateY: left * y },
        { scale: scale === undefined ? 1 : scale + (1 - scale) * p.value },
        { rotate: `${rotate === undefined ? 0 : rotate * left}deg` },
      ],
    };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Children arrive one after another. */
export function Stagger({ children, style, gap = 0.07, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; delay?: number }) {
  return (
    <View style={style}>
      {Children.map(children, (child, i) => <StaggerIndex.Provider value={delay + i * gap}>{child}</StaggerIndex.Provider>)}
    </View>
  );
}
const StaggerIndex = createContext(0);

export function StaggerItem({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const delay = useContext(StaggerIndex);
  return <Reveal style={style} delay={delay} y={14} duration={0.55}>{children}</Reveal>;
}

/** Every page change: the page lifts into place (the website's template.tsx). */
export function PageLift({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      p.set(0);
      p.set(withTiming(1, { duration: 400, easing: EASE_OUT }));
    }, [p]),
  );
  const animated = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
  return <Animated.View style={[{ flex: 1 }, style, animated]}>{children}</Animated.View>;
}

/** Counts up when it appears; `format` localises the digits. */
export function CountUp({ to, decimals = 0, suffix = '', format, style }: {
  to: number; decimals?: number; suffix?: string; format?: (s: string) => string; style?: StyleProp<TextStyle>;
}) {
  const inView = useContext(InView);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const duration = 1400;
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(to * (1 - Math.pow(1 - t, 4))); // the same soft ease-out, evaluated in JS
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to]);
  const text = value.toFixed(decimals) + suffix;
  return <Txt style={[{ fontVariant: ['tabular-nums'] }, style]}>{format ? format(text) : text}</Txt>;
}

/* -- loops ---------------------------------------------------------------- */

/** Gentle float and tilt, for the plane and other mascots (.animate-float-soft). */
export function Float({ children, style, distance = 8, tilt = 1, duration = 6000 }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; distance?: number; tilt?: number; duration?: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: duration / 2, easing: EASE_IN_OUT }), -1, true));
    return () => cancelAnimation(p);
  }, [p, duration]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: -distance * p.value }, { rotate: `${-tilt + 2 * tilt * p.value}deg` }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Opacity breathing (.animate-pulse). */
export function Pulse({ children, style, duration = 2000 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; duration?: number }) {
  const p = useSharedValue(1);
  useEffect(() => {
    p.set(withRepeat(withTiming(0.5, { duration: duration / 2, easing: EASE_IN_OUT }), -1, true));
    return () => cancelAnimation(p);
  }, [p, duration]);
  const animated = useAnimatedStyle(() => ({ opacity: p.value }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Continuous rotation (.animate-spin). */
export function Spin({ children, style, duration = 1000 }: { children: ReactNode; style?: StyleProp<ViewStyle>; duration?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(p);
  }, [p, duration]);
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${p.value * 360}deg` }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A little hop (.animate-bounce). */
export function Bounce({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withSequence(
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }),
    ), -1, false));
    return () => cancelAnimation(p);
  }, [p]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * p.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Text whose ink breathes while "the teacher is working…". */
export function Shimmer({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 1100, easing: EASE_IN_OUT }), -1, true));
    return () => cancelAnimation(p);
  }, [p]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * p.value }));
  return (
    <Animated.View style={animated}>
      <Txt style={[{ color: COLORS.ink }, style]}>{children}</Txt>
    </Animated.View>
  );
}

/* -- reactions ------------------------------------------------------------ */

/** `const [style, shake] = useShake()` — nudge a field once when it's wrong. */
export function useShake(distance = 6) {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = useCallback(() => {
    const step = (to: number) => withTiming(to, { duration: 70 });
    x.set(withSequence(step(-distance), step(distance), step(-distance / 2), step(distance / 2), step(0)));
  }, [x, distance]);
  return [style, shake] as const;
}

/* -- bars and writing ----------------------------------------------------- */

/** A progress bar whose fill grows to `value` (0–100) — every `motion.div` width animation on the web. */
export function ProgressBar({ value, color = COLORS['sky-500'], track = COLORS['paper-3'], height = 8, duration = 0.9, delay = 0, style }: {
  value: number; color?: string; track?: string; height?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle>;
}) {
  const inView = useContext(InView);
  const p = useSharedValue(0);
  const target = Math.max(0, Math.min(100, value || 0));
  useEffect(() => {
    if (inView) p.set(withDelay(delay * 1000, withTiming(target, { duration: duration * 1000, easing: EASE_OUT })));
  }, [inView, target, delay, duration, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value}%` }));
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}

/** Uncovers its child from left to right, as if being written (the web's clip-path reveals). */
export function Written({ delay = 0, duration = 0.6, children }: { delay?: number; duration?: number; children: ReactNode }) {
  const [width, setWidth] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay * 1000, withTiming(1, { duration: duration * 1000, easing: Easing.bezier(0.65, 0, 0.35, 1) })));
  }, [p, delay, duration]);
  const mask = useAnimatedStyle(() => ({ width: width * p.value }));
  return (
    <View>
      {/* invisible copy: gives the line its final size so nothing reflows */}
      <View style={{ opacity: 0 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{children}</View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, mask]}>
        <View style={{ width: width || undefined }}>{children}</View>
      </Animated.View>
    </View>
  );
}

/** A ring that swells and fades behind something live (.animate-ping). */
export function Ping({ style, color = 'rgba(127, 165, 221, 0.4)' }: { style?: StyleProp<ViewStyle>; color?: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.bezier(0, 0, 0.2, 1) }), -1, false));
    return () => cancelAnimation(p);
  }, [p]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 1 + p.value }] }));
  return <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 9999, backgroundColor: color, pointerEvents: 'none' }, style, animated]} />;
}

/** Opens and closes its content by height (the web's `height: auto` animations). */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const [height, setHeight] = useState(0);
  const p = useSharedValue(open ? 1 : 0);
  useEffect(() => { p.set(withTiming(open ? 1 : 0, { duration: 300, easing: EASE_OUT })); }, [open, p]);
  const style = useAnimatedStyle(() => ({ height: height * p.value, opacity: p.value }));
  return (
    <Animated.View style={[{ overflow: 'hidden', pointerEvents: open ? 'auto' : 'none' }, style]}>
      {/* laid out at its natural height, out of flow, so it can be measured while closed */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>{children}</View>
    </Animated.View>
  );
}

/** A column that grows from the baseline to `value` percent of its parent's height. */
export function GrowColumn({ value, color, delay = 0, style }: { value: number; color: string; delay?: number; style?: StyleProp<ViewStyle> }) {
  const inView = useContext(InView);
  const p = useSharedValue(0);
  useEffect(() => {
    if (inView) p.set(withDelay(delay * 1000, withTiming(value, { duration: 500, easing: EASE_OUT })));
  }, [inView, value, delay, p]);
  const grow = useAnimatedStyle(() => ({ height: `${p.value}%` }));
  return <Animated.View style={[{ width: '100%', backgroundColor: color }, style, grow]} />;
}
