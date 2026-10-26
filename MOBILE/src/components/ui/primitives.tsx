/** Cards, badges, form controls, skeletons, the progress ring and tabs — the website's primitives, native. */
import { createContext, forwardRef, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Platform, Pressable, TextInput, View, type LayoutChangeEvent, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOW } from '@/theme/tokens';
import { fontFamily, hasDevanagari } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { EASE_OUT } from '@/components/motion';
import { haptic } from '@/lib/haptics';
import { Sheet } from './overlay';
import { Press } from './press';
import { Txt } from './text';

/* -- Card ---------------------------------------------------------------- */

export function Card({ style, children, ...rest }: { style?: StyleProp<ViewStyle>; children?: ReactNode; testID?: string }) {
  return (
    <View style={[{ borderRadius: RADIUS, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, boxShadow: SHADOW.soft }, style]} {...rest}>
      {children}
    </View>
  );
}

/* -- Badge --------------------------------------------------------------- */

const TONES = {
  neutral: { bg: COLORS['paper-2'], fg: COLORS['ink-2'], border: COLORS.line },
  sky: { bg: COLORS['sky-50'], fg: COLORS['sky-700'], border: COLORS['sky-100'] },
  marigold: { bg: COLORS['marigold-50'], fg: COLORS['marigold-600'], border: COLORS['marigold-100'] },
  sage: { bg: COLORS['sage-100'], fg: COLORS.sage, border: COLORS['sage-100'] },
  amber: { bg: COLORS['amber-100'], fg: COLORS.amber, border: COLORS['amber-100'] },
  rose: { bg: COLORS['rose-100'], fg: COLORS.rose, border: COLORS['rose-100'] },
} as const;
export type Tone = keyof typeof TONES;
export const toneColor = (tone: Tone) => TONES[tone].fg;

export function Badge({ tone = 'neutral', children, dot = false, icon, style }: {
  tone?: Tone; children: ReactNode; dot?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const t = TONES[tone];
  return (
    <View style={[tw('flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5'), { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {dot && <View style={[tw('h-1.5 w-1.5 rounded-full'), { backgroundColor: t.fg }]} />}
      {icon}
      <Txt style={[tw('text-xs font-medium'), { color: t.fg }]}>{children}</Txt>
    </View>
  );
}

/* -- Fields -------------------------------------------------------------- */

/** Lets a <Field> know when the control inside it has focus (the web's :focus-within). */
export const FieldFocus = createContext<((focused: boolean) => void) | null>(null);

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <View style={tw('mb-1.5 flex-row items-baseline justify-between gap-2')}>
      <Txt style={tw('text-sm font-medium text-ink')}>{children}</Txt>
      {hint ? <Txt style={tw('text-xs text-ink-3')}>{hint}</Txt> : null}
    </View>
  );
}

type InputProps = TextInputProps & { invalid?: boolean; style?: StyleProp<TextStyle> };

function useFieldChrome(invalid?: boolean) {
  const report = useContext(FieldFocus);
  const [focused, setFocused] = useState(false);
  const chrome: { borderColor: string; boxShadow?: string } = invalid
    ? { borderColor: COLORS.rose, boxShadow: `0 0 0 4px ${COLORS['rose-100']}` }
    : focused
      ? { borderColor: COLORS['sky-500'], boxShadow: `0 0 0 4px ${COLORS['sky-50']}` }
      : { borderColor: COLORS['line-2'] };
  const onFocusChange = (f: boolean) => { setFocused(f); report?.(f); };
  return { chrome, onFocusChange };
}

const INPUT_TEXT: TextStyle = { fontSize: 15.2, color: COLORS.ink, paddingVertical: 0 };
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

/** The typed text follows the script the learner writes in. */
const inputFont = (value?: string) => fontFamily({ role: 'sans', weight: 400, italic: false, devanagari: !!value && hasDevanagari(value) });

export const Input = forwardRef<TextInput, InputProps>(function Input({ style, invalid, onFocus, onBlur, value, ...rest }, ref) {
  const { chrome, onFocusChange } = useFieldChrome(invalid);
  return (
    <TextInput
      ref={ref}
      value={value}
      placeholderTextColor={COLORS['ink-3']}
      selectionColor={COLORS['sky-500']}
      {...rest}
      onFocus={(e) => { onFocusChange(true); onFocus?.(e); }}
      onBlur={(e) => { onFocusChange(false); onBlur?.(e); }}
      style={[tw('h-12 rounded-2xl border bg-surface px-4'), INPUT_TEXT, { fontFamily: inputFont(value) }, chrome, NO_OUTLINE, style]}
    />
  );
});

export const Textarea = forwardRef<TextInput, InputProps & { rows?: number }>(function Textarea({ style, invalid, onFocus, onBlur, value, rows = 4, ...rest }, ref) {
  const { chrome, onFocusChange } = useFieldChrome(invalid);
  return (
    <TextInput
      ref={ref}
      value={value}
      multiline
      textAlignVertical="top"
      placeholderTextColor={COLORS['ink-3']}
      selectionColor={COLORS['sky-500']}
      {...rest}
      onFocus={(e) => { onFocusChange(true); onFocus?.(e); }}
      onBlur={(e) => { onFocusChange(false); onBlur?.(e); }}
      style={[
        tw('rounded-2xl border bg-surface px-4'),
        { fontSize: 15.2, lineHeight: 24, color: COLORS.ink, paddingTop: 12, paddingBottom: 12, minHeight: Math.max(64, rows * 24 + 26), fontFamily: inputFont(value) },
        chrome, NO_OUTLINE, style,
      ]}
    />
  );
});

export const PasswordInput = forwardRef<TextInput, InputProps & { showLabel: string; hideLabel: string }>(function PasswordInput({ showLabel, hideLabel, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Input ref={ref} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} {...rest} style={[{ paddingRight: 48 }, rest.style]} />
      <Press
        onPress={() => setShow((s) => !s)}
        accessibilityLabel={show ? hideLabel : showLabel}
        hitSlop={6}
        style={[tw('absolute right-2 h-9 w-9 items-center justify-center rounded-xl'), { top: 6 }]}
        activeStyle={{ backgroundColor: COLORS['paper-2'] }}
      >
        {show ? <EyeOff size={16} color={COLORS['ink-3']} /> : <Eye size={16} color={COLORS['ink-3']} />}
      </Press>
    </View>
  );
});

export type Option<T extends string> = { value: T; label: string; hint?: string };

/** The website's <select>: a field that opens a sheet of choices. */
export function Select<T extends string>({ value, onChange, options, placeholder, title, invalid, disabled, style, testID }: {
  value: T | '' | null | undefined; onChange: (v: T) => void; options: Array<Option<T>>; placeholder?: string; title?: string;
  invalid?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const { chrome, onFocusChange } = useFieldChrome(invalid);
  const current = options.find((o) => o.value === value);
  const close = () => { setOpen(false); onFocusChange(false); };
  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="combobox"
        disabled={disabled}
        onPress={() => { setOpen(true); onFocusChange(true); }}
        style={[tw('h-12 flex-row items-center justify-between gap-2 rounded-2xl border bg-surface pl-4 pr-3.5'), chrome, disabled ? { opacity: 0.6 } : null, style]}
      >
        <Txt numberOfLines={1} style={[tw('flex-1'), { fontSize: 15.2, color: current ? COLORS.ink : COLORS['ink-3'] }]}>{current?.label ?? placeholder ?? ''}</Txt>
        <ChevronDown size={16} color={COLORS['ink-3']} />
      </Pressable>
      <Sheet open={open} onClose={close}>
        {title ? <Txt style={tw('mb-2 font-display text-2xl text-ink')}>{title}</Txt> : null}
        <View style={tw('gap-1 pb-1')}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Press
                key={o.value}
                scaleTo={0.99}
                onPress={() => { haptic.tap(); onChange(o.value); close(); }}
                style={[tw('flex-row items-center gap-3 rounded-2xl px-3 py-3'), active ? { backgroundColor: COLORS['sky-50'] } : null]}
                activeStyle={{ backgroundColor: COLORS['paper-2'] }}
              >
                <View style={tw('flex-1')}>
                  <Txt style={[tw('text-base'), { color: COLORS.ink, fontWeight: active ? '600' : '400' }]}>{o.label}</Txt>
                  {o.hint ? <Txt style={tw('text-xs text-ink-3')}>{o.hint}</Txt> : null}
                </View>
                {active ? <Check size={18} color={COLORS['sky-600']} /> : null}
              </Press>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <Txt accessibilityRole="alert" style={tw('mt-1.5 text-sm text-rose')}>{children}</Txt>;
}

/* -- Skeleton ------------------------------------------------------------ */

/** A loading block: faint ruled paper with a sheen passing over it. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(p);
  }, [p]);
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: (p.value * 2 - 1) * width }] }));
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ backgroundColor: COLORS['paper-2'], borderRadius: 10, overflow: 'hidden' }, style]}
    >
      {width > 0 && (
        <Animated.View style={[tw('absolute inset-0'), sheen]}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={tw('flex-1')} />
        </Animated.View>
      )}
    </View>
  );
}

/* -- Ring (mastery / score / progress) ------------------------------------ */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Ring({ value, size = 88, stroke = 8, label, style, color: fixed, delay = 0 }: {
  value: number; size?: number; stroke?: number; label?: ReactNode; style?: StyleProp<ViewStyle>; color?: string; delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const ink = fixed ?? (v >= 75 ? COLORS.sage : v >= 50 ? COLORS['marigold-600'] : COLORS.rose);
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay * 1000, withTiming(v / 100, { duration: 1200, easing: EASE_OUT })));
  }, [p, v, delay]);
  const animated = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS['paper-3']} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} animatedProps={animated}
        />
      </Svg>
      {label}
    </View>
  );
}

/* -- Tabs with a sliding paper pill ---------------------------------------- */

type Slot = { x: number; width: number };
// Items share the spare width but never shrink below their label (a long word is not cut off).
const STRETCH: ViewStyle = { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' };

/**
 * A row of choices where a pill slides under the active one — the website's
 * `layoutId` highlight. Used for tabs, the language toggle and filter chips.
 */
export function SlidingPill<T extends string>({ value, onChange, items, style, itemStyle, pillStyle, stretch = true, renderItem, accessibilityLabel }: {
  value: T; onChange: (v: T) => void; items: Array<{ value: T; label?: ReactNode; badge?: ReactNode }>;
  style?: StyleProp<ViewStyle>; itemStyle?: StyleProp<ViewStyle>; pillStyle?: StyleProp<ViewStyle>;
  /** items grow to fill the row */
  stretch?: boolean;
  renderItem?: (item: { value: T; label?: ReactNode }, active: boolean) => ReactNode;
  accessibilityLabel?: string;
}) {
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const shown = useSharedValue(0);
  const target = slots[value];
  useEffect(() => {
    if (!target) return;
    const spring = { stiffness: 420, damping: 34 };
    if (shown.value === 0) { x.set(target.x); w.set(target.width); shown.set(withTiming(1, { duration: 150 })); }
    else { x.set(withSpring(target.x, spring)); w.set(withSpring(target.width, spring)); }
  }, [target, x, w, shown]);
  const pill = useAnimatedStyle(() => ({ opacity: shown.value, width: w.value, transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={style}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, pointerEvents: 'none' }, pill]}>
        <View style={[tw('flex-1'), pillStyle]} />
      </Animated.View>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => { if (!active) haptic.tap(); onChange(item.value); }}
            onLayout={(e) => {
              const { x: lx, width } = e.nativeEvent.layout;
              setSlots((s) => (s[item.value]?.x === lx && s[item.value]?.width === width ? s : { ...s, [item.value]: { x: lx, width } }));
            }}
            style={[stretch ? STRETCH : null, itemStyle]}
          >
            {renderItem ? renderItem(item, active) : item.label}
            {item.badge}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Tabs<T extends string>({ value, onChange, items, style }: {
  value: T; onChange: (v: T) => void; items: Array<{ value: T; label: ReactNode; badge?: ReactNode }>; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[tw('rounded-2xl bg-paper-2 p-1'), style]}>
      <SlidingPill
        value={value}
        onChange={onChange}
        items={items}
        style={tw('flex-row gap-1')}
        itemStyle={tw('flex-row items-center justify-center gap-1.5 rounded-xl px-2.5 py-2')}
        pillStyle={[tw('rounded-xl bg-surface'), { boxShadow: SHADOW.soft }]}
        renderItem={(item, active) =>
          typeof item.label === 'string'
            ? <Txt numberOfLines={1} style={[tw('text-sm font-medium'), { color: active ? COLORS.ink : COLORS['ink-3'] }]}>{item.label}</Txt>
            : item.label}
      />
    </View>
  );
}
