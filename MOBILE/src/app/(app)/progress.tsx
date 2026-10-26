import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Brain, CalendarDays, CheckCheck, Clock, Flame, MessageSquareText, Sparkles, Target } from 'lucide-react-native';
import { api } from '@/core/api';
import type { MessageKey } from '@/core/i18n';
import type { Analytics, Journey } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { weekdayNamesShort } from '@/lib/dates';
import { PlaneMark } from '@/components/brand/logo';
import { Donut, Legend, TimeChart } from '@/components/charts/charts';
import { Page } from '@/components/layout/page';
import { BadgeCard, nextBadges } from '@/components/lesson/badges';
import { CountUp, EASE_OUT, Float, GrowColumn, ProgressBar, Reveal } from '@/components/motion';
import type { IconType } from '@/components/ui/button';
import { LoadError } from '@/components/ui/load-error';
import { Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Card, Skeleton, SlidingPill } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

const C = { right: '#7fb08f', wrong: '#e3a39a', minutes: COLORS['sky-600'], acc: COLORS['marigold-600'], rescued: COLORS['sky-500'], stuck: '#e3a39a' };

export default function ProgressPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const j = useQuery({ queryKey: ['journey'], queryFn: api.journey, retry: 1 });
  const a = useQuery({ queryKey: ['analytics'], queryFn: api.analytics });
  return (
    <Page onRefresh={() => Promise.all([j.refetch(), qc.invalidateQueries({ queryKey: ['analytics'] })])}>
      <Txt accessibilityRole="header" style={tw('font-display text-5xl text-ink')}>{t('progress.title')}</Txt>
      <Txt style={tw('mt-2 text-ink-2')}>{t('progress.sub')}</Txt>
      {j.isLoading && <Skeleton style={tw('mt-8 h-80 rounded-[14px]')} />}
      {j.isError && <LoadError style={tw('mt-8')} onRetry={() => void j.refetch()} />}
      {j.data && (j.data.totals.answers === 0 && j.data.totals.lessons_started === 0 ? (
        <Card style={tw('mt-8')}>
          <Ruled style={tw('items-center overflow-hidden rounded-[13px] px-6 py-16')}>
            <Float><PlaneMark size={90} /></Float>
            <Txt style={tw('mt-4 text-center text-ink-2')} testID="progress-empty">{t('progress.empty')}</Txt>
          </Ruled>
        </Card>
      ) : <Body j={j.data} a={a.data} />)}
    </Page>
  );
}

/** The XP bar: a sky gradient that fills to `pct`. */
function XpBar({ pct }: { pct: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(300, withTiming(Math.max(0, Math.min(100, pct)), { duration: 1200, easing: EASE_OUT }))); }, [p, pct]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value}%` }));
  return (
    <View style={tw('mt-3 h-3 overflow-hidden rounded-full bg-paper-3')}>
      <Animated.View style={[tw('h-full overflow-hidden rounded-full'), fill]}>
        <LinearGradient colors={[COLORS['sky-300'], COLORS['sky-500'], COLORS['sky-600']]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={tw('flex-1')} />
      </Animated.View>
    </View>
  );
}

function LevelCard({ j }: { j: Journey }) {
  const { t, n } = useI18n();
  const lv = j.level;
  const pct = ((lv.xp - lv.floor) / Math.max(1, lv.next - lv.floor)) * 100;
  return (
    <Reveal y={14} duration={0.6} style={[tw('rounded-[28px] border border-line bg-surface'), { boxShadow: SHADOW.lift }]}>
      <Ruled style={tw('overflow-hidden rounded-[27px] p-6 pl-20')}>
        <Float style={[tw('absolute'), { right: -8, top: -12, opacity: 0.7 }]}><PlaneMark size={96} style={{ transform: [{ rotate: '12deg' }] }} /></Float>
        <View style={tw('gap-5')}>
          <View style={[tw('h-24 w-24 items-center justify-center rounded-full'), { boxShadow: '0 12px 30px -10px rgba(59, 102, 174, 0.7)' }]}>
            <LinearGradient colors={[COLORS['sky-500'], COLORS['sky-700']]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[tw('absolute inset-0 rounded-full')]} />
            <Txt style={[tw('font-display text-5xl text-white'), { lineHeight: 54 }]} testID="level">{n(lv.level)}</Txt>
            <View style={[tw('absolute rounded-full bg-marigold px-2 py-0.5'), { bottom: -8 }]}>
              <Txt style={{ fontSize: 10.4, lineHeight: 14, fontWeight: '700', color: COLORS.ink }}>{t('lvl.level', { n: n(lv.level) })}</Txt>
            </View>
          </View>
          <View>
            <Txt style={tw('font-hand text-xl text-sky-700')}>{t(`lvl.${lv.title}` as MessageKey)}</Txt>
            <CountUp to={lv.xp} format={(v) => t('lvl.xp', { n: n(v) })} style={tw('font-display text-4xl text-ink')} />
            <XpBar pct={pct} />
            <Txt style={tw('mt-1.5 text-xs text-ink-3')}>{t('lvl.toNext', { n: n(lv.next - lv.xp), l: n(lv.level + 1) })} · {t('lvl.how')}</Txt>
          </View>
          <View style={tw('flex-row gap-3')}>
            <View style={tw('items-center rounded-2xl bg-marigold-50 px-4 py-3')}>
              <Flame size={20} color={COLORS['marigold-600']} fill={COLORS['marigold-600']} />
              <Txt style={tw('font-display text-3xl text-ink')}>{n(j.streak.current)}</Txt>
              <Txt style={[tw('text-ink-3'), { fontSize: 10.9, lineHeight: 15 }]}>{t('cal.current')}</Txt>
            </View>
            <Press href={{ pathname: '/profile', params: { focus: 'badges' } }} style={tw('items-center rounded-2xl bg-sky-50 px-4 py-3')} testID="to-badges">
              <Sparkles size={20} color={COLORS['sky-700']} />
              <Txt style={tw('font-display text-3xl text-ink')}>{n(j.badges.filter((b) => b.earned).length)}</Txt>
              <Txt style={[tw('text-ink-3'), { fontSize: 10.9, lineHeight: 15 }]}>{t('badge.title')}</Txt>
            </Press>
          </View>
        </View>
      </Ruled>
    </Reveal>
  );
}

function Body({ j, a }: { j: Journey; a?: Analytics }) {
  const { t, n, lang } = useI18n();
  const [range, setRange] = useState('30');
  const span = Number(range);
  const tt = j.totals;
  const days = j.days.slice(-span);
  const dates = days.map((d) => d.date);
  // 7-day rolling accuracy, only where there were answers in the window.
  const accuracy = useMemo(() => j.days.map((_, i) => {
    const win = j.days.slice(Math.max(0, i - 6), i + 1);
    const ans = win.reduce((s, d) => s + d.answers, 0);
    return ans ? (win.reduce((s, d) => s + d.correct, 0) / ans) * 100 : NaN;
  }).slice(-span), [j.days, span]);
  const accFilled = accuracy.map((v, i) => (Number.isNaN(v) ? (accuracy.slice(0, i).reverse().find((x) => !Number.isNaN(x)) ?? 0) : v));
  const pctRight = tt.answers ? Math.round((tt.correct / tt.answers) * 100) : 0;
  const u = j.understanding;
  const m = j.mastery;
  const mTotal = Math.max(1, m.mastered + m.watched + m.learning + m.to_review + m.not_started);
  const mParts = [
    { k: 'prog.m.mastered', v: m.mastered, c: COLORS.sage }, { k: 'prog.m.watched', v: m.watched, c: '#a9c9b4' },
    { k: 'prog.m.learning', v: m.learning, c: COLORS['sky-500'] }, { k: 'prog.m.review', v: m.to_review, c: COLORS['marigold-400'] },
    { k: 'prog.m.new', v: m.not_started, c: COLORS['paper-3'] },
  ];
  const wdNames = weekdayNamesShort(lang);
  const wdMax = Math.max(1, ...j.weekday);
  const hMax = Math.max(1, ...j.hours);
  const kpis: Array<{ icon: IconType; label: string; v: number; sub: string }> = [
    { icon: Clock, label: t('prog.k.time'), v: tt.minutes, sub: t('prog.k.timeSub', { n: n(tt.videos) }) },
    { icon: MessageSquareText, label: t('prog.k.answers'), v: tt.answers, sub: t('prog.k.answersSub', { p: n(pctRight) }) },
    { icon: CheckCheck, label: t('prog.k.lessons'), v: tt.lessons_completed, sub: t('prog.k.lessonsSub', { n: n(tt.lessons_started) }) },
    { icon: Brain, label: t('prog.k.mastered'), v: tt.concepts_mastered, sub: t('prog.k.masteredSub', { n: n(m.to_review) }) },
    { icon: Target, label: t('prog.k.row'), v: tt.best_right_in_a_row, sub: t('prog.k.rowSub') },
    { icon: CalendarDays, label: t('prog.k.days'), v: j.streak.active_days, sub: t('prog.k.daysSub', { n: n(j.streak.longest) }) },
  ];
  const understand: Array<[string, number, string]> = [[t('prog.firstTry'), u.first_try, C.right], [t('prog.afterHelp'), u.rescued, C.rescued], [t('prog.working'), u.still_stuck, C.stuck]];

  return (
    <View style={tw('mt-8 gap-6')}>
      <LevelCard j={j} />

      <View style={tw('flex-row flex-wrap justify-between gap-y-3')}>
        {kpis.map((k, i) => (
          <Reveal key={k.label} y={10} delay={0.1 + i * 0.05} duration={0.4} style={{ width: '48.4%' }}>
            <Card style={tw('h-full p-4')}>
              <View style={tw('h-8 w-8 items-center justify-center rounded-xl bg-sky-50')}><k.icon size={16} color={COLORS['sky-700']} /></View>
              <CountUp to={k.v} format={(v) => n(v)} style={tw('mt-3 font-display text-4xl')} />
              <Txt style={tw('text-xs font-medium text-ink')}>{k.label}</Txt>
              <Txt style={[tw('text-ink-3'), { fontSize: 11.2, lineHeight: 16 }]}>{k.sub}</Txt>
            </Card>
          </Reveal>
        ))}
      </View>

      <Card style={tw('p-5')}>
        <View style={tw('gap-3')}>
          <View>
            <Txt style={tw('font-display text-2xl')}>{t('prog.effort')}</Txt>
            <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('prog.effortSub')}</Txt>
          </View>
          <View style={tw('self-start rounded-xl border border-line bg-paper-2 p-0.5')}>
            <SlidingPill
              value={range}
              onChange={setRange}
              stretch={false}
              items={['7', '30', '90'].map((d) => ({ value: d, label: t('admin.days', { n: n(Number(d)) }) }))}
              style={tw('flex-row')}
              itemStyle={tw('rounded-lg px-3 py-1.5')}
              pillStyle={[tw('rounded-lg bg-surface'), { boxShadow: SHADOW.soft }]}
              renderItem={(item, active) => <Txt style={[tw('text-xs font-medium'), { color: active ? COLORS.ink : COLORS['ink-3'] }]}>{item.label}</Txt>}
            />
          </View>
        </View>
        <View style={tw('mt-4')}>
          <Legend items={[{ label: t('admin.s.right'), color: C.right }, { label: t('admin.s.wrong'), color: C.wrong }, { label: t('prog.minutes'), color: C.minutes, kind: 'line' }]} />
        </View>
        <TimeChart style={tw('mt-3')} dates={dates} height={260} yLabel={t('admin.questions')} series={[
          { key: 'right', label: t('admin.s.right'), color: C.right, kind: 'bar', values: days.map((d) => d.correct) },
          { key: 'wrong', label: t('admin.s.wrong'), color: C.wrong, kind: 'bar', values: days.map((d) => d.answers - d.correct) },
          { key: 'min', label: t('prog.minutes'), color: C.minutes, kind: 'line', values: days.map((d) => d.minutes), format: (v) => t('cal.minutes', { n: n(Math.round(v)) }) },
        ]} />
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('prog.accuracy')}</Txt>
        <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('prog.accuracySub')}</Txt>
        <TimeChart style={tw('mt-4')} dates={dates} height={220} yMax={100} yFormat={(v) => `${n(Math.round(v))}%`} series={[
          { key: 'acc', label: t('prog.accuracyLine'), color: C.acc, kind: 'line', values: accFilled, format: (v) => `${n(Math.round(v))}%` },
        ]} />
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('prog.understand')}</Txt>
        <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('prog.understandSub')}</Txt>
        <View style={tw('mt-5 flex-row flex-wrap items-center gap-6')}>
          <Donut size={150} parts={understand.map(([label, value, c]) => ({ label, value, color: c }))} center={
            <View style={tw('items-center')}>
              <Txt style={tw('font-display text-3xl')}>{n(u.concepts_checked)}</Txt>
              <Txt style={[tw('text-ink-3'), { fontSize: 10.4, lineHeight: 14 }]}>{t('admin.f.checked')}</Txt>
            </View>
          } />
          <View style={[tw('flex-1 gap-2.5'), { minWidth: 140 }]}>
            {understand.map(([l, v, c]) => (
              <View key={l} style={tw('flex-row items-center gap-2')}>
                <View style={[tw('h-3 w-3 rounded-full'), { backgroundColor: c }]} />
                <Txt style={tw('flex-1 text-sm text-ink-2')}>{l}</Txt>
                <Txt style={[tw('text-sm font-semibold'), { fontVariant: ['tabular-nums'] }]}>{n(v)}</Txt>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('prog.mastery')}</Txt>
        <View style={tw('mt-4 h-5 flex-row overflow-hidden rounded-full')}>
          {mParts.map((p, i) => p.v > 0 && <MasterySlice key={p.k} share={(p.v / mTotal) * 100} tint={p.c} delay={i * 0.1} />)}
        </View>
        <View style={tw('mt-3 flex-row flex-wrap gap-x-5 gap-y-1')}>
          {mParts.map((p) => (
            <View key={p.k} style={tw('flex-row items-center gap-1.5')}>
              <View style={[tw('h-2.5 w-2.5'), { borderRadius: 3, backgroundColor: p.c }]} />
              <Txt style={tw('text-sm text-ink-2')}>{t(p.k as MessageKey)} <Txt style={[tw('font-bold text-ink'), { fontVariant: ['tabular-nums'] }]}>{n(p.v)}</Txt></Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('prog.strength')}</Txt>
        <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('prog.strengthSub')}</Txt>
        <View style={tw('mt-4 gap-3')}>
          {j.concepts.slice(0, 20).map((c, i) => (
            <View key={`${c.concept}-${i}`}>
              <View style={tw('flex-row items-baseline justify-between gap-3')}>
                <Txt numberOfLines={1} style={tw('flex-1 text-sm text-ink')}>{c.concept}</Txt>
                <Txt style={[tw('text-sm text-ink-3'), { fontVariant: ['tabular-nums'] }]}>{n(c.mastery_pct)}%</Txt>
              </View>
              <ProgressBar value={Math.max(3, c.mastery_pct)} duration={0.8} delay={Math.min(i, 12) * 0.03} style={tw('mt-1')}
                color={c.mastery_pct >= 75 ? COLORS.sage : c.mastery_pct >= 50 ? COLORS['marigold-400'] : COLORS.rose} />
              <Txt style={[tw('mt-0.5 text-ink-3'), { fontSize: 10.9, lineHeight: 15 }]}>{t('prog.tries', { n: n(c.attempts) })}{c.reexplains ? ` · ${t('prog.reexplained', { n: n(c.reexplains) })}` : ''}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('prog.when')}</Txt>
        <Txt style={[tw('mt-3 text-xs font-medium uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('prog.weekday')}</Txt>
        <View style={tw('mt-2 h-28 flex-row items-end gap-2')}>
          {j.weekday.map((v, i) => (
            <View key={i} style={tw('flex-1 items-center gap-1')}>
              <View style={tw('h-20 w-full justify-end')}>
                <GrowColumn value={Math.max(4, (v / wdMax) * 100)} color={color('sky-500', 0.8)} delay={i * 0.05} style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
              </View>
              <Txt style={[tw('text-ink-3'), { fontSize: 10.4, lineHeight: 14 }]}>{wdNames[i]}</Txt>
            </View>
          ))}
        </View>
        <Txt style={[tw('mt-5 text-xs font-medium uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('prog.hour')}</Txt>
        <View style={[tw('mt-2 h-20 flex-row items-end'), { gap: 3 }]}>
          {j.hours.map((v, h) => (
            <View key={h} style={tw('h-full flex-1 justify-end')} accessibilityLabel={`${n(h)}:00 · ${n(v)}`}>
              <GrowColumn value={Math.max(3, (v / hMax) * 100)} color="rgba(240, 195, 90, 0.9)" delay={h * 0.015} style={{ borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
            </View>
          ))}
        </View>
        <View style={tw('mt-1 flex-row justify-between')}>
          {[0, 12, 23].map((h) => <Txt key={h} style={[tw('text-ink-3'), { fontSize: 9.9, lineHeight: 14 }]}>{n(h)}:00</Txt>)}
        </View>
      </Card>

      {a && a.misconceptions.length > 0 && (
        <Card style={tw('p-5')}>
          <Txt style={tw('font-display text-2xl')}>{t('progress.misconceptions')}</Txt>
          <View style={tw('mt-4 flex-row flex-wrap gap-2')}>
            {a.misconceptions.map((x) => (
              <View key={x.tag} style={[tw('rounded-full border px-3 py-1'), { borderColor: color('rose', 0.3), backgroundColor: 'rgba(248, 226, 226, 0.5)' }]}>
                <Txt style={tw('text-sm text-ink-2')}>{x.tag} <Txt style={tw('font-bold text-rose')}>×{n(x.count)}</Txt></Txt>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card style={tw('p-5')}>
        <View style={tw('flex-row flex-wrap items-center justify-between gap-2')}>
          <Txt style={tw('font-display text-2xl')}>{t('prog.nextBadges')}</Txt>
          <Press href={{ pathname: '/profile', params: { focus: 'badges' } }} hitSlop={8} style={tw('flex-row items-center gap-1')}>
            <Txt style={tw('text-sm text-sky-700')}>{t('prog.allBadges')}</Txt>
            <ArrowRight size={16} color={COLORS['sky-700']} />
          </Press>
        </View>
        <View style={tw('mt-4 flex-row flex-wrap justify-between gap-y-3')}>{nextBadges(j.badges, 4).map((b, i) => <BadgeCard key={b.id} b={b} index={i} />)}</View>
      </Card>
    </View>
  );
}

function MasterySlice({ share, tint, delay }: { share: number; tint: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(delay * 1000, withTiming(share, { duration: 800, easing: EASE_OUT }))); }, [p, share, delay]);
  const style = useAnimatedStyle(() => ({ width: `${p.value}%` }));
  return <Animated.View style={[{ height: '100%', backgroundColor: tint }, style]} />;
}
