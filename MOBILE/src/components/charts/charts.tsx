/**
 * Small, dependency-free SVG charts with real axes: labelled y ticks and
 * gridlines, dated x labels, a tap-to-inspect column with a tooltip listing
 * every series, and a draw-in animation. Shared by the learner and staff views.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { shortDate } from '@/lib/dates';
import { EASE_OUT, Reveal } from '@/components/motion';
import { Txt } from '@/components/ui/text';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Series = { key: string; label: string; color: string; kind: 'bar' | 'line' | 'dot'; values: number[]; format?: (v: number) => string };

const LABEL_FONT = 'Figtree_400Regular';

function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export function useDateLabel() {
  const { lang } = useI18n();
  return useMemo(() => (iso: string) => shortDate(new Date(iso), lang), [lang]);
}

/** One bar segment; it rises from its base as the chart's clock `p` passes its turn. */
function Bar({ p, x, y0, y1, width, color, rx, at }: { p: SharedValue<number>; x: number; y0: number; y1: number; width: number; color: string; rx: number; at: number }) {
  const props = useAnimatedProps(() => {
    const local = Math.min(1, Math.max(0, (p.value - at) / 0.5));
    const eased = 1 - Math.pow(1 - local, 3);
    const h = (y0 - y1) * eased;
    return { y: y0 - h, height: h };
  });
  return <AnimatedRect x={x} width={width} fill={color} rx={rx} animatedProps={props} />;
}

/** A polyline that draws itself in. */
export function DrawnLine({ points, color, width = 2.5, duration = 1.1, delay = 0 }: { points: Array<[number, number]>; color: string; width?: number; duration?: number; delay?: number }) {
  const d = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const length = Math.max(1, points.reduce((sum, pt, i) => (i ? sum + Math.hypot(pt[0] - points[i - 1][0], pt[1] - points[i - 1][1]) : 0), 0));
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(0);
    p.set(withDelay(delay * 1000, withTiming(1, { duration: duration * 1000, easing: EASE_OUT })));
  }, [p, d, duration, delay]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value) }));
  return <AnimatedPath d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${length} ${length}`} animatedProps={props} />;
}

/** Bars (stacked), lines and markers over a shared date axis. */
export function TimeChart({ dates, series, height = 240, yMax, yFormat, yLabel, style }: {
  dates: string[]; series: Series[]; height?: number; yMax?: number; yFormat?: (v: number) => string; yLabel?: string; style?: StyleProp<ViewStyle>;
}) {
  const { n } = useI18n();
  const dateLabel = useDateLabel();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const clock = useSharedValue(0);
  const signature = `${dates.length}:${dates[0] ?? ''}:${dates[dates.length - 1] ?? ''}`;
  useEffect(() => {
    setPicked(null);
    clock.set(0);
    clock.set(withTiming(1.5, { duration: 1100 }));
  }, [clock, signature]);

  const pad = { l: 40, r: 12, t: yLabel ? 26 : 14, b: 28 };
  const W = Math.max(280, width), H = height;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bars = series.filter((s) => s.kind === 'bar');
  const stackTop = dates.map((_, i) => bars.reduce((a, s) => a + (s.values[i] || 0), 0));
  const peak = Math.max(1, ...stackTop, ...series.filter((s) => s.kind !== 'bar').flatMap((s) => s.values));
  const top = yMax ?? niceMax(peak);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
  const step = iw / Math.max(1, dates.length);
  const bw = Math.max(3, Math.min(28, step * 0.62));
  const x = (i: number) => pad.l + step * i + step / 2;
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const fmt = yFormat ?? ((v: number) => n(Math.round(v)));
  const every = Math.max(1, Math.ceil(dates.length / Math.max(2, Math.floor(iw / 64))));

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <View style={{ width: W, height: H }} accessibilityRole="image" accessibilityLabel={yLabel}>
          <Svg width={W} height={H}>
            {/* grid + y axis */}
            {ticks.map((tv, i) => (
              <G key={i}>
                <Line x1={pad.l} x2={W - pad.r} y1={y(tv)} y2={y(tv)} stroke={COLORS.line} strokeDasharray={i ? '3 5' : undefined} />
                <SvgText x={pad.l - 8} y={y(tv) + 3.5} textAnchor="end" fill={COLORS['ink-3']} fontSize={10} fontFamily={LABEL_FONT}>{fmt(tv)}</SvgText>
              </G>
            ))}
            {yLabel ? <SvgText x={4} y={10} fill={COLORS['ink-3']} fontSize={10} fontFamily="Figtree_500Medium">{yLabel}</SvgText> : null}
            {/* x axis labels */}
            {dates.map((d, i) => (i % every === 0 || i === dates.length - 1) && (
              <SvgText key={d} x={x(i)} y={H - 8} textAnchor="middle" fill={picked === i ? COLORS.ink : COLORS['ink-3']} fontSize={10} fontFamily={LABEL_FONT}>{dateLabel(d)}</SvgText>
            ))}
            {/* picked band */}
            {picked !== null && <Rect x={x(picked) - step / 2} y={pad.t} width={step} height={ih} fill={COLORS['sky-50']} />}
            {/* stacked bars */}
            {dates.map((d, i) => {
              let acc = 0;
              return bars.map((s, si) => {
                const v = s.values[i] || 0;
                const y0 = y(acc), y1 = y(acc + v);
                acc += v;
                if (!v) return null;
                const isTop = bars.slice(si + 1).every((b) => !(b.values[i] || 0));
                return <Bar key={`${s.key}-${d}`} p={clock} x={x(i) - bw / 2} y0={y0} y1={y1} width={bw} color={s.color} rx={isTop ? Math.min(5, bw / 2) : 0} at={Math.min(0.9, i * 0.014 + si * 0.07)} />;
              });
            })}
            {/* lines */}
            {series.filter((s) => s.kind === 'line').map((s) => (
              <G key={`${s.key}-${signature}`}>
                <DrawnLine points={s.values.map((v, i) => [x(i), y(v)])} color={s.color} />
                {s.values.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={picked === i ? 5 : 3} fill={COLORS.surface} stroke={s.color} strokeWidth={2} />)}
              </G>
            ))}
            {/* markers (e.g. a learner handed to a human) */}
            {series.filter((s) => s.kind === 'dot').map((s) => s.values.map((v, i) => v > 0 && (
              <G key={`${s.key}-${i}`}>
                <Circle cx={x(i)} cy={pad.t + 6} r={6 + Math.min(4, v)} fill={s.color} />
                <SvgText x={x(i)} y={pad.t + 9} textAnchor="middle" fill={COLORS.white} fontSize={9} fontFamily="Figtree_700Bold">{n(v)}</SvgText>
              </G>
            )))}
          </Svg>
          {/* touch columns */}
          <View style={[tw('absolute flex-row'), { left: pad.l, top: pad.t, width: iw, height: ih }]}>
            {dates.map((d, i) => (
              <Pressable key={d} style={{ flex: 1 }} onPress={() => setPicked((p) => (p === i ? null : i))} accessibilityLabel={dateLabel(d)} />
            ))}
          </View>
          {picked !== null && (
            <Reveal key={picked} y={4} duration={0.15}
              style={[tw('absolute top-0 rounded-xl border border-line p-3'), { minWidth: 160, left: Math.min(Math.max(0, x(picked) - 80), W - 170), backgroundColor: 'rgba(255,255,255,0.97)', boxShadow: SHADOW.lift, pointerEvents: 'none' }]}>
              <Txt style={tw('mb-1.5 text-xs font-semibold text-ink')}>{dateLabel(dates[picked])}</Txt>
              {series.map((s) => (
                <View key={s.key} style={tw('flex-row items-center justify-between gap-4')}>
                  <View style={tw('flex-row items-center gap-1.5')}>
                    <View style={[tw('h-2 w-2 rounded-full'), { backgroundColor: s.color }]} />
                    <Txt style={tw('text-xs text-ink-2')}>{s.label}</Txt>
                  </View>
                  <Txt style={[tw('text-xs font-medium text-ink'), { fontVariant: ['tabular-nums'] }]}>{(s.format ?? ((v: number) => n(Math.round(v))))(s.values[picked] || 0)}</Txt>
                </View>
              ))}
            </Reveal>
          )}
        </View>
      )}
    </View>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string; kind?: 'bar' | 'line' | 'dot' }> }) {
  return (
    <View style={tw('flex-row flex-wrap gap-x-4 gap-y-1')}>
      {items.map((it) => (
        <View key={it.label} style={tw('flex-row items-center gap-1.5')}>
          {it.kind === 'line'
            ? <View style={[tw('w-4 rounded-full'), { height: 2, backgroundColor: it.color }]} />
            : <View style={[tw('h-2.5 w-2.5'), { borderRadius: it.kind === 'dot' ? 5 : 3, backgroundColor: it.color }]} />}
          <Txt style={tw('text-xs text-ink-2')}>{it.label}</Txt>
        </View>
      ))}
    </View>
  );
}

function Arc({ cx, r, stroke, color, length, start, c, delay }: { cx: number; r: number; stroke: number; color: string; length: number; start: number; c: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(delay * 1000, withTiming(1, { duration: 900, easing: EASE_OUT }))); }, [p, delay]);
  // Slides into place along the ring, as on the web.
  const props = useAnimatedProps(() => ({ strokeDashoffset: -start + length * (1 - p.value), opacity: p.value > 0.02 ? 1 : 0 }));
  return <AnimatedCircle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${Math.max(0, length - 2)} ${c}`} animatedProps={props} />;
}

/** A ring split into labelled parts. */
export function Donut({ parts, size = 160, stroke = 18, center }: { parts: Array<{ label: string; value: number; color: string }>; size?: number; stroke?: number; center?: ReactNode }) {
  const total = Math.max(1, parts.reduce((a, p) => a + p.value, 0));
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const lens = parts.map((p) => (p.value / total) * c);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS['paper-3']} strokeWidth={stroke} />
        {parts.map((p, i) => lens[i] > 0 && <Arc key={p.label} cx={size / 2} r={r} stroke={stroke} color={p.color} length={lens[i]} start={starts[i]} c={c} delay={i * 0.15} />)}
      </Svg>
      {center}
    </View>
  );
}
