/**
 * The button. Variants by intent, an ink ripple on press, and a `status`
 * mode (idle -> working -> done ✓ / error ✕) — the label and icon morph
 * instead of the button being swapped. Same variants and sizes as the web.
 */
import { isValidElement, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import { Check, LoaderCircle, X } from 'lucide-react-native';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { EASE_OUT, Spin } from '@/components/motion';
import { Txt } from './text';

type Variant = 'primary' | 'ink' | 'marigold' | 'outline' | 'soft' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';
export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';
export type IconType = ComponentType<{ size?: number | string; color?: string; strokeWidth?: number | string }>;

type Look = { bg: string; fg: string; border?: string; shadow?: string; activeBg: string; activeFg?: string; activeBorder?: string };

const LOOKS: Record<Variant, Look> = {
  primary: { bg: COLORS['sky-600'], fg: COLORS.white, activeBg: COLORS['sky-700'], shadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 6px 18px -8px rgba(59, 102, 174, 0.7)' },
  ink: { bg: COLORS.ink, fg: COLORS.paper, activeBg: COLORS['ink-2'], shadow: '0 6px 18px -10px rgba(30, 41, 66, 0.8)' },
  marigold: { bg: COLORS['marigold-400'], fg: COLORS.ink, activeBg: COLORS['marigold-200'], shadow: '0 6px 18px -10px rgba(196, 140, 24, 0.8)' },
  outline: { bg: COLORS.surface, fg: COLORS.ink, border: COLORS['line-2'], activeBg: COLORS['sky-50'], activeBorder: COLORS['sky-300'] },
  soft: { bg: COLORS['sky-50'], fg: COLORS['sky-700'], activeBg: COLORS['sky-100'] },
  ghost: { bg: 'transparent', fg: COLORS['ink-2'], activeBg: COLORS['paper-2'], activeFg: COLORS.ink },
  danger: { bg: COLORS['rose-100'], fg: COLORS.rose, activeBg: COLORS.rose, activeFg: COLORS.white },
  link: { bg: 'transparent', fg: COLORS['sky-600'], activeBg: 'transparent' },
};

const SIZES: Record<Size, { box: ViewStyle; text: number; icon: number }> = {
  sm: { box: { height: 36, borderRadius: 12, paddingHorizontal: 14 }, text: 14, icon: 16 },
  md: { box: { height: 44, borderRadius: 16, paddingHorizontal: 20 }, text: 15.2, icon: 16 },
  lg: { box: { height: 52, borderRadius: 16, paddingHorizontal: 28 }, text: 16, icon: 16 },
  icon: { box: { height: 40, width: 40, borderRadius: 12 }, text: 14, icon: 18 },
};

type Props = {
  variant?: Variant;
  size?: Size;
  href?: Href;
  replace?: boolean;
  status?: ButtonStatus;
  loadingLabel?: ReactNode;
  successLabel?: ReactNode;
  errorLabel?: ReactNode;
  /** a lucide icon component, or a ready element */
  icon?: IconType | ReactNode;
  /** stretch to the container's width (the web's `w-full`) */
  block?: boolean;
  disabled?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
};

type Ripple = { id: number; x: number; y: number; size: number };

function RippleDot({ r }: { r: Ripple }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withTiming(1, { duration: 600, easing: EASE_OUT })); }, [p]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - p.value), transform: [{ scale: p.value }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', left: r.x, top: r.y, width: r.size, height: r.size, borderRadius: r.size / 2, backgroundColor: 'rgba(255, 255, 255, 0.35)', pointerEvents: 'none' }, animated]}
    />
  );
}

/** The label lifts in whenever `k` changes (but not on first paint). */
function Morph({ k, children }: { k: string; children: ReactNode }) {
  const p = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    p.set(0);
    p.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
  }, [k, p]);
  const animated = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 8 }] }));
  return <Animated.View style={[tw('flex-row items-center gap-2'), animated]}>{children}</Animated.View>;
}

export function Button({
  variant = 'primary', size = 'md', href, replace, status = 'idle', loadingLabel, successLabel, errorLabel,
  icon, block, disabled, onPress, style, children, testID, accessibilityLabel,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const box = useRef({ w: 0, h: 0 });
  const look = LOOKS[variant];
  const dims = SIZES[size];
  const locked = disabled || status === 'loading';

  const bg = status === 'success' ? COLORS.sage : status === 'error' ? COLORS.rose : pressed ? look.activeBg : look.bg;
  const fg = status === 'success' || status === 'error' ? COLORS.white : (pressed && look.activeFg) || look.fg;
  const border = look.border ? (pressed && look.activeBorder) || look.border : undefined;

  const label = status === 'loading' ? loadingLabel ?? children : status === 'success' ? successLabel ?? children : status === 'error' ? errorLabel ?? children : children;
  const Leading = icon && !isValidElement(icon) ? (icon as IconType) : null;
  const leading =
    status === 'loading' ? <Spin><LoaderCircle size={16} color={fg} /></Spin> :
    status === 'success' ? <Check size={16} color={fg} /> :
    status === 'error' ? <X size={16} color={fg} /> :
    Leading ? <Leading size={dims.icon} color={fg} /> : (icon as ReactNode) ?? null;

  const addRipple = (e: GestureResponderEvent) => {
    const { w, h } = box.current;
    const span = Math.max(w, h) * 2.2;
    if (!span) return;
    const { locationX, locationY } = e.nativeEvent;
    const x = Number.isFinite(locationX) ? locationX : w / 2;
    const y = Number.isFinite(locationY) ? locationY : h / 2;
    const r = { id: Date.now() + Math.random(), x: x - span / 2, y: y - span / 2, size: span };
    setRipples((list) => [...list.slice(-3), r]);
    setTimeout(() => setRipples((list) => list.filter((p) => p.id !== r.id)), 650);
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!locked, busy: status === 'loading' }}
      disabled={locked}
      onLayout={(e) => { box.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
      onPressIn={(e) => { setPressed(true); addRipple(e); }}
      onPressOut={() => setPressed(false)}
      onPress={(e) => {
        onPress?.(e);
        if (!href) return;
        if (replace) router.replace(href);
        else router.push(href);
      }}
      style={[
        dims.box,
        { alignSelf: block ? 'stretch' : 'flex-start', backgroundColor: bg, boxShadow: look.shadow },
        border ? { borderWidth: 1, borderColor: border } : null,
        variant === 'link' ? { paddingHorizontal: 0 } : null,
        disabled ? { opacity: 0.55 } : null,
        pressed ? { transform: [{ translateY: 1 }] } : null,
        style,
      ]}
    >
      {/* the ripple is clipped to the button's shape; touches land on the button itself */}
      <View style={[tw('absolute inset-0 overflow-hidden'), { borderRadius: dims.box.borderRadius, pointerEvents: 'none' }]}>
        {ripples.map((r) => <RippleDot key={r.id} r={r} />)}
      </View>
      <View style={[tw('flex-1 flex-row items-center justify-center'), { pointerEvents: 'none' }]}>
        <Morph k={status}>
          {leading}
          {typeof label === 'string' || typeof label === 'number'
            ? <Txt numberOfLines={1} style={{ color: fg, fontSize: dims.text, lineHeight: dims.text * 1.4, fontWeight: '500', textDecorationLine: variant === 'link' && pressed ? 'underline' : 'none' }}>{label}</Txt>
            : label}
        </Morph>
      </View>
    </Pressable>
  );
}
