/**
 * The learner's month, as a calendar: real dates, intensity by how much they
 * did, consecutive learning days joined by a marigold ribbon, a flame on the
 * days of the current streak, and a note per day (tap a day). Months turn like pages.
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react-native';
import type { Journey, JourneyDay } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { longDate, monthYear, weekdayNamesNarrow } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { EASE_OUT, Reveal } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const score = (d?: JourneyDay) => (d ? d.answers + d.videos * 2 + d.practice + d.completed * 5 + (d.started ? 1 : 0) : 0);
const level = (s: number) => (s <= 0 ? 0 : s < 4 ? 1 : s < 10 ? 2 : s < 20 ? 3 : 4);
const SHADES = ['', '#dfeaf9', '#9cbce8', '#4c7cc7', '#2f528c'];

/** The streak flame flickers while a streak is alive. */
function StreakFlame({ lit }: { lit: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (lit) p.set(withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })), -1, false));
  }, [lit, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-6 + 12 * p.value}deg` }, { translateY: -p.value }] }));
  return <Animated.View style={style}><Flame size={16} color={COLORS['marigold-600']} fill={lit ? COLORS['marigold-600'] : 'none'} /></Animated.View>;
}

/** Half of the ribbon that joins two neighbouring learning days; it draws from the day outward. */
function Ribbon({ side, delay }: { side: 'left' | 'right'; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(delay * 1000, withTiming(1, { duration: 300, easing: EASE_OUT }))); }, [p, delay]);
  const grow = useAnimatedStyle(() => ({ width: `${50 * p.value}%` }));
  return <Animated.View style={[tw('absolute h-5 bg-marigold-200'), { top: 10 }, side === 'left' ? { right: '50%' } : { left: '50%' }, grow]} />;
}

export function StreakCalendar({ journey }: { journey: Journey }) {
  const { t, n, lang } = useI18n();
  const today = useMemo(() => new Date(`${journey.today}T00:00:00`), [journey.today]);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dir, setDir] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const byDate = useMemo(() => new Map(journey.days.map((d) => [d.date, d])), [journey.days]);
  const first = journey.days[0]?.date ?? journey.today;
  const active = (key: string) => score(byDate.get(key)) > 0;

  // Days belonging to the current streak (ending today or yesterday).
  const streak = journey.streak.current;
  const streakDays = useMemo(() => {
    const set = new Set<string>();
    if (!streak) return set;
    const on = (key: string) => score(byDate.get(key)) > 0;
    const d = new Date(today);
    if (!on(iso(d))) d.setDate(d.getDate() - 1);
    while (on(iso(d))) { set.add(iso(d)); d.setDate(d.getDate() - 1); }
    return set;
  }, [streak, byDate, today]);

  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  const cells = useMemo(() => {
    const start = new Date(cursor);
    const lead = (start.getDay() + 6) % 7; // Monday first
    start.setDate(start.getDate() - lead);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  const weeks = cells[35].getMonth() !== cursor.getMonth() ? cells.slice(0, 35) : cells;

  const canPrev = iso(new Date(cursor.getFullYear(), cursor.getMonth(), 0)) >= `${first.slice(0, 8)}01`;
  const canNext = cursor.getFullYear() < today.getFullYear() || cursor.getMonth() < today.getMonth();
  const go = (delta: number) => { haptic.tap(); setDir(delta); setPicked(null); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1)); };

  const weekdayNames = weekdayNamesNarrow(lang);
  const monthActive = weeks.filter((d) => d.getMonth() === cursor.getMonth() && active(iso(d))).length;
  const todayDone = active(journey.today);
  const shown = picked ? byDate.get(picked) : undefined;

  return (
    <View>
      <View style={tw('flex-row flex-wrap items-center justify-between gap-3')}>
        <Txt style={tw('font-display text-2xl')}>{t('cal.title')}</Txt>
        <View style={tw('flex-row gap-2')}>
          <View style={tw('flex-row items-center gap-1.5 rounded-full bg-marigold-50 px-3 py-1')}>
            <StreakFlame lit={journey.streak.current > 0} />
            <Txt style={tw('text-sm font-medium text-marigold-600')}>{t(journey.streak.current === 1 ? 'cal.day1' : 'cal.days', { n: n(journey.streak.current) })}</Txt>
          </View>
          <View accessibilityLabel={t('cal.longest')} style={tw('flex-row items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1')}>
            <Trophy size={14} color={COLORS['ink-2']} />
            <Txt style={tw('text-sm text-ink-2')}>{n(journey.streak.longest)}</Txt>
          </View>
        </View>
      </View>

      <View style={tw('mt-4 flex-row items-center justify-between')}>
        <Press onPress={() => go(-1)} disabled={!canPrev} accessibilityLabel="previous month" hitSlop={8}
          style={[tw('h-8 w-8 items-center justify-center rounded-lg'), !canPrev ? { opacity: 0.3 } : null]} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
          <ChevronLeft size={16} color={COLORS['ink-2']} />
        </Press>
        <Reveal key={monthKey} x={dir * 20} y={0} duration={0.3}><Txt style={tw('font-medium text-ink')}>{monthYear(cursor, lang)}</Txt></Reveal>
        <Press onPress={() => go(1)} disabled={!canNext} accessibilityLabel="next month" hitSlop={8}
          style={[tw('h-8 w-8 items-center justify-center rounded-lg'), !canNext ? { opacity: 0.3 } : null]} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
          <ChevronRight size={16} color={COLORS['ink-2']} />
        </Press>
      </View>

      <View style={tw('mt-3 flex-row')}>
        {weekdayNames.map((w, i) => (
          <Txt key={i} style={[tw('flex-1 text-center font-medium text-ink-3'), { fontSize: 11.2, lineHeight: 16 }]}>{w}</Txt>
        ))}
      </View>

      <Reveal key={monthKey} x={dir * 40} y={0} duration={0.35} style={tw('mt-1 flex-row flex-wrap overflow-hidden')}>
        {weeks.map((d, i) => {
          const key = iso(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const future = key > journey.today;
          const lv = level(score(byDate.get(key)));
          const on = lv > 0;
          const col = i % 7;
          const prevOn = col > 0 && active(iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)));
          const nextOn = col < 6 && active(iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)));
          const isToday = key === journey.today;
          const inStreak = streakDays.has(key);
          const ink = on ? (lv >= 3 ? COLORS.white : COLORS['sky-700']) : future ? 'rgba(134, 145, 167, 0.5)' : COLORS['ink-2'];
          return (
            <Press key={key} scaleTo={0.9} onPress={() => setPicked((p) => (p === key ? null : key))} accessibilityLabel={longDate(d, lang)}
              style={[tw('h-10 items-center justify-center'), { width: `${100 / 7}%`, marginBottom: 6 }]}>
              {/* the ribbon joining consecutive learning days */}
              {on && inMonth && prevOn && <Ribbon side="left" delay={0.25 + i * 0.008} />}
              {on && inMonth && nextOn && <Ribbon side="right" delay={0.25 + i * 0.008} />}
              <Reveal delay={i * 0.008} duration={0.3} y={6}>
                {/* today wears a ring, set off from the day by a sliver of paper */}
                <View style={[tw('rounded-full'), isToday ? { padding: 2, borderWidth: 2, borderColor: COLORS['sky-600'], margin: -4 } : null]}>
                  <View
                    style={[
                      tw('h-9 w-9 items-center justify-center rounded-full'),
                      on ? { backgroundColor: SHADES[lv] } : null,
                      !inMonth ? { opacity: 0.25 } : null,
                      picked === key ? { boxShadow: SHADOW.lift } : null,
                    ]}
                  >
                    <Txt style={[tw('text-xs'), { color: ink, fontWeight: on ? '600' : '400', fontVariant: ['tabular-nums'] }]}>{n(d.getDate())}</Txt>
                  </View>
                </View>
              </Reveal>
              {inStreak && inMonth && (
                <View style={[tw('absolute'), { top: 0, right: '50%', marginRight: -24, pointerEvents: 'none' }]}>
                  <Flame size={14} color={COLORS['marigold-600']} fill={COLORS['marigold-600']} />
                </View>
              )}
            </Press>
          );
        })}
      </Reveal>

      {/* picked day / footer */}
      <View style={[tw('mt-3 justify-center rounded-2xl bg-paper-2 px-4 py-2.5'), { minHeight: 56 }]}>
        {picked ? (
          <>
            <Txt style={tw('text-sm font-medium text-ink')}>{longDate(new Date(`${picked}T00:00:00`), lang)}</Txt>
            {shown && score(shown) > 0 ? (
              <Txt style={tw('mt-0.5 text-xs text-ink-2')}>
                {[shown.answers && t('cal.answers', { n: n(shown.answers) }), shown.videos && t('cal.videos', { n: n(shown.videos) }),
                  shown.minutes >= 1 && t('cal.minutes', { n: n(Math.round(shown.minutes)) }), shown.completed && t('cal.finished', { n: n(shown.completed) })]
                  .filter(Boolean).join(' · ')}
              </Txt>
            ) : <Txt style={tw('mt-0.5 text-xs text-ink-3')}>{t('cal.none')}</Txt>}
          </>
        ) : (
          <View style={tw('flex-row flex-wrap items-center justify-between gap-2')}>
            <Txt style={[tw('text-xs'), { color: todayDone ? COLORS.sage : COLORS['marigold-600'] }]}>{todayDone ? t('cal.done') : t('cal.keep')}</Txt>
            <Txt style={tw('text-xs text-ink-3')}>{t('cal.activeDays', { n: n(monthActive) })}</Txt>
          </View>
        )}
      </View>
      <View style={tw('mt-2 flex-row items-center justify-end gap-1.5')}>
        <Txt style={[tw('text-ink-3'), { fontSize: 10.9, lineHeight: 15 }]}>{t('cal.less')}</Txt>
        {[0, 1, 2, 3, 4].map((l) => <View key={l} style={[tw('h-3 w-3 rounded-full'), { backgroundColor: l ? SHADES[l] : COLORS['paper-3'] }]} />)}
        <Txt style={[tw('text-ink-3'), { fontSize: 10.9, lineHeight: 15 }]}>{t('cal.more')}</Txt>
      </View>
    </View>
  );
}
