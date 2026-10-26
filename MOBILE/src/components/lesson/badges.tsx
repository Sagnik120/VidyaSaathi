/**
 * Achievement badges: paper rosettes coloured by tier (bronze → silver → gold
 * → sky → ink …), one icon per achievement. Locked ones stay grey with a
 * progress ring showing how close the learner is.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  BookOpen, Brain, CalendarDays, CalendarHeart, CheckCheck, Dumbbell, FileText, Flame, Languages, Lock,
  MessageSquareText, RefreshCw, Star, Target,
} from 'lucide-react-native';
import type { MessageKey } from '@/core/i18n';
import type { Badge, Journey } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { mediumDate } from '@/lib/dates';
import { ProgressBar, Reveal } from '@/components/motion';
import type { IconType } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { SlidingPill } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

const ICONS: Record<string, IconType> = {
  first_lesson: BookOpen, lessons_completed: CheckCheck, streak: Flame, active_days: CalendarDays, answers: MessageSquareText,
  right_in_a_row: Target, concepts_mastered: Brain, perfect_lesson: Star, comeback: RefreshCw, own_notes: FileText,
  practice: Dumbbell, bilingual: Languages, month: CalendarHeart,
};
const TIERS = [
  { fill: '#e9c4a2', edge: '#b8794a', ink: '#7a4a24' }, // bronze
  { fill: '#e3e8ef', edge: '#93a1b5', ink: '#4a5671' }, // silver
  { fill: '#fbe7a8', edge: '#d9a62a', ink: '#8a6510' }, // gold
  { fill: '#dfeaf9', edge: '#4c7cc7', ink: '#2f528c' }, // sky
  { fill: '#d7dbe6', edge: '#1e2942', ink: '#1e2942' }, // ink
  { fill: '#fbe1da', edge: '#e5917f', ink: '#a2493a' }, // coral
  { fill: '#e3f0e7', edge: '#5f9474', ink: '#3d6b50' }, // sage
  { fill: '#f5e6ff', edge: '#8b63c9', ink: '#5b3b8f' }, // violet
];
const LOCKED = '#9aa3b2';

function rosette(cx: number, cy: number, r: number, points = 16, depth = 0.08) {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 ? r * (1 - depth) : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

export function Medal({ group, tier, earned, progress = 0, size = 76, label }: { group: string; tier: number; earned: boolean; progress?: number; size?: number; label?: string }) {
  const Icon = ICONS[group] ?? Star;
  const c = TIERS[Math.min(tier, TIERS.length - 1)];
  const r = 30;
  const ring = 2 * Math.PI * 34;
  const ink = earned ? c.ink : LOCKED;
  const scale = size / 76;
  return (
    <View style={{ width: size, height: size * 1.12, alignItems: 'center' }}>
      <Svg viewBox="0 0 80 90" width={size} height={size * 1.12} style={{ position: 'absolute' }}>
        {/* ribbon tails */}
        <Path d="M28 58 L22 86 L31 80 L36 88 L40 62Z" fill={earned ? c.edge : '#cfd4dc'} opacity={0.9} />
        <Path d="M52 58 L58 86 L49 80 L44 88 L40 62Z" fill={earned ? c.edge : '#cfd4dc'} opacity={0.75} />
        <Path d={rosette(40, 38, r + 5)} fill={earned ? c.edge : '#d5d9e0'} />
        <Circle cx={40} cy={38} r={r - 1} fill={earned ? c.fill : '#eef0f3'} stroke="#fff" strokeWidth={1.5} />
        <Circle cx={40} cy={38} r={r - 6} fill="none" stroke={earned ? c.edge : '#cfd4dc'} strokeDasharray="2 3" strokeWidth={1} />
        {!earned && progress > 0 && (
          <Circle cx={40} cy={38} r={34} fill="none" stroke={COLORS['sky-500']} strokeWidth={3} strokeLinecap="round"
            strokeDasharray={`${ring * Math.min(1, progress)} ${ring}`} transform="rotate(-90 40 38)" />
        )}
      </Svg>
      <View style={{ position: 'absolute', top: size * 1.12 * 0.38 - 12 * scale, height: 24 * scale, justifyContent: 'center' }}>
        {earned ? <Icon size={24 * scale} color={ink} /> : <Lock size={20 * scale} color={ink} />}
      </View>
      {label ? (
        <View style={[tw('absolute rounded-full bg-surface px-1.5'), { top: size * 1.12 * 0.63, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)' }]}>
          <Txt style={{ fontSize: 9.6, lineHeight: 14, fontWeight: '700', color: ink, fontVariant: ['tabular-nums'] }}>{label}</Txt>
        </View>
      ) : null}
    </View>
  );
}

function useBadgeText() {
  const { t, n, lang } = useI18n();
  return {
    title: (b: Badge) => t(`badge.${b.group}` as MessageKey, { n: n(b.threshold) }),
    desc: (b: Badge) => t(`badge.${b.group}.d` as MessageKey, { n: n(b.threshold) }),
    date: (iso: string) => n(mediumDate(new Date(`${iso}T00:00:00`), lang)),
    n,
    t,
  };
}

/** The closest unearned badges, for "up next". */
export function nextBadges(badges: Badge[], count = 3) {
  const firstLockedPerGroup = new Map<string, Badge>();
  for (const b of badges) if (!b.earned && !firstLockedPerGroup.has(b.group)) firstLockedPerGroup.set(b.group, b);
  return [...firstLockedPerGroup.values()].sort((a, b) => b.value / b.threshold - a.value / a.threshold).slice(0, count);
}

export function BadgeCard({ b, index = 0 }: { b: Badge; index?: number }) {
  const x = useBadgeText();
  const wiggle = useSharedValue(0);
  const medal = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  // An earned medal swings when touched (the web's hover wiggle).
  const swing = () => {
    if (!b.earned) return;
    const step = (deg: number) => withTiming(deg, { duration: 125 });
    wiggle.set(withSequence(step(-8), step(8), step(0)));
  };
  return (
    <Reveal y={10} delay={Math.min(index, 12) * 0.03} duration={0.4} style={{ width: '48.4%' }}>
      <Press onPress={swing} scaleTo={b.earned ? 0.97 : 1} accessibilityLabel={x.title(b)}
        style={[tw('h-full items-center rounded-2xl border p-3'), b.earned ? { borderColor: COLORS.line, backgroundColor: COLORS.surface } : { borderStyle: 'dashed', borderColor: COLORS['line-2'], backgroundColor: color('paper', 0.6) }]}
        activeStyle={b.earned ? { boxShadow: SHADOW.lift } : null}>
        <Animated.View style={medal}>
          <Medal group={b.group} tier={b.tier} earned={b.earned} progress={b.value / b.threshold} label={b.threshold > 1 ? x.n(b.threshold) : undefined} />
        </Animated.View>
        <Txt style={[tw('mt-1 text-center text-sm font-semibold leading-tight'), { color: b.earned ? COLORS.ink : COLORS['ink-3'] }]}>{x.title(b)}</Txt>
        <Txt style={[tw('mt-0.5 text-center text-ink-3'), { fontSize: 11.2, lineHeight: 15 }]}>{x.desc(b)}</Txt>
        <Txt style={[tw('mt-1.5 text-center font-medium'), { fontSize: 10.9, lineHeight: 15, color: b.earned ? COLORS.sage : COLORS['ink-3'] }]}>
          {b.earned ? (b.earned_at ? x.t('badge.earned', { d: x.date(b.earned_at) }) : '✓') : x.t('badge.progress', { a: x.n(b.value), b: x.n(b.threshold) })}
        </Txt>
      </Press>
    </Reveal>
  );
}

export function BadgeShelf({ journey }: { journey: Journey }) {
  const { t, n, lang } = useI18n();
  const [filter, setFilter] = useState<'all' | 'earned'>('all');
  const earned = journey.badges.filter((b) => b.earned);
  // Within a group, show earned tiers plus the next locked one — not every far-off tier.
  const visible = useMemo(() => {
    const out: Badge[] = [];
    const seenLocked = new Set<string>();
    for (const b of journey.badges) {
      if (b.earned) out.push(b);
      else if (filter === 'all' && !seenLocked.has(b.group)) { out.push(b); seenLocked.add(b.group); }
    }
    return out.sort((a, b) => Number(b.earned) - Number(a.earned));
  }, [journey.badges, filter]);
  const monthLabel = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return n(mediumDate(new Date(y, m - 1, 1), lang).replace(/^\d+\s/, ''));
  };

  return (
    <View>
      <View style={tw('flex-row flex-wrap items-center justify-between gap-3')}>
        <Txt style={tw('text-sm text-ink-3')}>{t('badge.count', { a: n(earned.length), b: n(journey.badges.length) })}</Txt>
        <View style={tw('rounded-xl border border-line bg-paper-2 p-0.5')}>
          <SlidingPill
            value={filter}
            onChange={setFilter}
            stretch={false}
            items={[{ value: 'all', label: t('badge.all') }, { value: 'earned', label: t('badge.earnedTab') }]}
            style={tw('flex-row')}
            itemStyle={tw('rounded-lg px-3 py-1.5')}
            pillStyle={[tw('rounded-lg bg-surface'), { boxShadow: SHADOW.soft }]}
            renderItem={(item, active) => <Txt style={[tw('text-xs font-medium'), { color: active ? COLORS.ink : COLORS['ink-3'] }]}>{item.label}</Txt>}
          />
        </View>
      </View>
      <View style={tw('mt-4 flex-row flex-wrap justify-between gap-y-3')}>
        {visible.map((b, i) => <BadgeCard key={b.id} b={b} index={i} />)}
      </View>

      <Txt style={tw('mt-8 font-semibold text-ink')}>{t('badge.monthly')}</Txt>
      <Txt style={tw('text-xs text-ink-3')}>{t('badge.monthlySub', { n: n(journey.months[0]?.needed ?? 20) })}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('mt-3')} contentContainerStyle={tw('gap-3 pb-1')}>
        {journey.months.slice(-12).map((m, i) => (
          <View key={m.month} style={tw('w-24 items-center rounded-2xl border border-line bg-surface p-2')}>
            <Medal group="month" tier={(Number(m.month.split('-')[1]) - 1) % 8} earned={m.earned} progress={m.active_days / m.needed} size={56} />
            <Txt style={[tw('text-center text-xs font-medium'), { color: m.earned ? COLORS.ink : COLORS['ink-3'] }]}>{monthLabel(m.month)}</Txt>
            <ProgressBar value={Math.min(100, (m.active_days / m.needed) * 100)} color={COLORS['marigold-400']} height={4} delay={i * 0.05} duration={0.5} style={tw('mt-1 w-full')} />
            <Txt style={[tw('mt-0.5 text-ink-3'), { fontSize: 9.9, lineHeight: 14 }]}>{n(m.active_days)}/{n(m.needed)}</Txt>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
