import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ArrowRight, BookCheck, Clock, Flame, Gauge, Hand, Plus, RefreshCw, Target, Trophy } from 'lucide-react-native';
import { api } from '@/core/api';
import type { Dashboard } from '@/core/types';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { relativeDays } from '@/lib/lesson';
import { PlaneMark } from '@/components/brand/logo';
import { DrawnLine } from '@/components/charts/charts';
import { Page } from '@/components/layout/page';
import { GoalCard } from '@/components/lesson/goal-card';
import { LessonRow } from '@/components/lesson/lesson-row';
import { ReviewDueCard } from '@/components/lesson/spaced-review';
import { StreakCalendar } from '@/components/lesson/streak-calendar';
import { CountUp, Float, Pulse, Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Button, type IconType } from '@/components/ui/button';
import { LoadError } from '@/components/ui/load-error';
import { Highlight, Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Badge, Card, Ring, Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? 'dash.morning' : h < 17 ? 'dash.afternoon' : 'dash.evening';
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchOnWindowFocus: true });
  const d = q.data;
  const empty = d && d.stats.lessons_started === 0;
  const first = user?.full_name.split(' ')[0] ?? '';
  const reload = () => Promise.all([q.refetch(), qc.invalidateQueries({ queryKey: ['journey'] }), qc.invalidateQueries({ queryKey: ['spaced-review'] }), qc.invalidateQueries({ queryKey: ['skill-map'] })]);

  return (
    <Page onRefresh={reload} style={tw('gap-6')}>
      <View style={tw('gap-4 pb-2')}>
        <View>
          <Reveal y={0} duration={0.4}><Txt style={tw('font-hand text-xl text-sky-700')}>{t(greetingKey())},</Txt></Reveal>
          <Reveal y={12} duration={0.6}>
            <Highlight style={tw('font-display text-5xl text-ink')}>{first}</Highlight>
          </Reveal>
          <Txt style={tw('mt-2 text-ink-2')}>{empty ? t('dash.subEmpty') : t('dash.sub')}</Txt>
        </View>
        <Button href="/new" icon={Plus} testID="new-lesson">{t('nav.newLesson')}</Button>
      </View>

      {d?.resume_lesson && <Resume d={d} />}
      <GoalCard />
      <ReviewDueCard />
      {q.isLoading && <DashSkeleton />}
      {q.isError && (
        <Card style={tw('gap-3 p-6')}>
          <Txt style={tw('text-ink-2')}>{(q.error as Error).message}</Txt>
          <Button variant="outline" size="sm" onPress={() => void q.refetch()} icon={RefreshCw}>{t('common.retry')}</Button>
        </Card>
      )}
      {empty && <EmptyState />}
      {d && !empty && <Filled d={d} />}
    </Page>
  );
}

function Filled({ d }: { d: Dashboard }) {
  const { t, n } = useI18n();
  const s = d.stats;
  const journey = useQuery({ queryKey: ['journey'], queryFn: api.journey, retry: 1 });
  const stats: Array<{ icon: IconType; label: string; value: number; suffix?: string; fg: string; bg: string }> = [
    { icon: BookCheck, label: t('dash.stat.lessons'), value: s.lessons_completed, fg: COLORS['sky-700'], bg: COLORS['sky-50'] },
    { icon: Trophy, label: t('dash.stat.score'), value: s.average_score_pct, suffix: '%', fg: COLORS['marigold-600'], bg: COLORS['marigold-50'] },
    { icon: Target, label: t('dash.stat.accuracy'), value: s.accuracy_pct, suffix: '%', fg: COLORS.sage, bg: COLORS['sage-100'] },
    { icon: Clock, label: t('dash.stat.minutes'), value: s.learning_minutes, fg: COLORS['sky-700'], bg: COLORS['sky-50'] },
    { icon: Flame, label: t('dash.stat.streak'), value: journey.data?.streak.current ?? s.streak_days, fg: COLORS.margin, bg: COLORS['margin-100'] },
    { icon: Gauge, label: t('dash.stat.mastered'), value: s.concepts_mastered, fg: COLORS.sage, bg: COLORS['sage-100'] },
  ];
  return (
    <View style={tw('gap-6')}>
      {d.needs_attention.length > 0 && <Attention items={d.needs_attention} />}

      <Card>
        <Stagger style={tw('flex-row flex-wrap overflow-hidden rounded-[13px]')}>
          {stats.map((x, i) => (
            <StaggerItem key={x.label} style={[{ width: '50%' }, i % 2 === 0 ? tw('border-r') : null, i < stats.length - 2 ? tw('border-b') : null, { borderColor: color('line', 0.7) }]}>
              <View style={tw('flex-row items-center gap-3 p-4')}>
                <View style={[tw('h-10 w-10 items-center justify-center rounded-xl'), { backgroundColor: x.bg }]}><x.icon size={18} color={x.fg} /></View>
                <View style={tw('min-w-0 flex-1')}>
                  <CountUp to={x.value} suffix={x.suffix} format={(v) => n(v)} style={[tw('font-display text-3xl text-ink'), { lineHeight: 34 }]} />
                  <Txt numberOfLines={1} style={tw('mt-1 text-xs text-ink-3')}>{x.label}</Txt>
                </View>
              </View>
            </StaggerItem>
          ))}
        </Stagger>
      </Card>

      <Card style={tw('p-4')}>
        <View style={tw('mb-2 flex-row items-center justify-between px-1')}>
          <Txt style={tw('font-display text-2xl')}>{t('dash.recent')}</Txt>
          <Press href="/lessons" hitSlop={8} testID="view-all-lessons"><Txt style={tw('text-sm text-sky-700')}>{t('dash.viewAll')}</Txt></Press>
        </View>
        {d.recent_lessons.slice(0, 6).map((l, i) => (
          <View key={l.id} style={i ? [tw('border-t'), { borderColor: color('line', 0.7) }] : null}><LessonRow lesson={l} /></View>
        ))}
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('dash.trend')}</Txt>
        <Trend points={d.score_trend} />
      </Card>

      {(d.strong_concepts.length > 0 || d.weak_concepts.length > 0) && (
        <Card style={tw('gap-5 p-5')}>
          <View>
            <Txt style={tw('text-sm font-semibold text-sage')}>{t('dash.strong')}</Txt>
            <View style={tw('mt-3 flex-row flex-wrap gap-2')}>
              {d.strong_concepts.length ? d.strong_concepts.map((c) => <Badge key={c} tone="sage">{c}</Badge>) : <Txt style={tw('text-sm text-ink-3')}>—</Txt>}
            </View>
          </View>
          <View>
            <Txt style={tw('text-sm font-semibold text-marigold-600')}>{t('dash.weak')}</Txt>
            <View style={tw('mt-3 flex-row flex-wrap gap-2')}>
              {d.weak_concepts.length ? d.weak_concepts.map((c) => <Badge key={c} tone="marigold">{c}</Badge>) : <Txt style={tw('text-sm text-ink-3')}>—</Txt>}
            </View>
          </View>
        </Card>
      )}

      <Card style={tw('p-5')}>
        {journey.data ? <StreakCalendar journey={journey.data} /> : journey.isError ? <LoadError onRetry={() => void journey.refetch()} /> : <Skeleton style={tw('h-96 rounded-2xl')} />}
      </Card>
    </View>
  );
}

function Attention({ items }: { items: Dashboard['needs_attention'] }) {
  const { t, lang } = useI18n();
  return (
    <View>
      <View style={tw('mb-3 flex-row items-center gap-2')}>
        <Pulse style={tw('h-2 w-2 rounded-full bg-marigold-600')} />
        <Txt style={tw('text-sm font-semibold text-ink-2')}>{t('dash.attention')}</Txt>
      </View>
      <View style={tw('gap-3')}>
        {items.map((a) => {
          const paused = a.kind === 'paused';
          return (
            <Reveal key={`${a.kind}-${a.lesson_id}-${a.node_id ?? ''}`} y={8} duration={0.4}
              style={[tw('flex-row items-center gap-3 rounded-[22px] border p-4'), paused ? { borderColor: color('amber', 0.3), backgroundColor: 'rgba(251, 240, 217, 0.6)' } : { borderColor: COLORS['marigold-200'], backgroundColor: COLORS['marigold-50'] }]}>
              <View style={[tw('h-11 w-11 items-center justify-center rounded-2xl'), { backgroundColor: paused ? COLORS.amber : COLORS['marigold-600'] }]}>
                {paused ? <Hand size={20} color={COLORS.white} /> : <RefreshCw size={20} color={COLORS.white} />}
              </View>
              <View style={tw('min-w-0 flex-1')}>
                <Txt numberOfLines={1} style={tw('font-medium text-ink')}>{a.concept}</Txt>
                <Txt numberOfLines={1} style={tw('text-xs text-ink-2')}>{a.lesson_title}{a.since ? ` · ${relativeDays(a.since, lang)}` : ''}</Txt>
              </View>
              <Button size="sm" variant={paused ? 'ink' : 'marigold'} href={paused ? `/learn/${a.lesson_id}` : `/review/${a.lesson_id}`} style={{ alignSelf: 'center' }}>
                {paused ? t('dash.openLesson') : t('dash.reviewBtn')}
              </Button>
            </Reveal>
          );
        })}
      </View>
    </View>
  );
}

function Resume({ d }: { d: Dashboard }) {
  const { t, n } = useI18n();
  const l = d.resume_lesson!;
  return (
    <Reveal y={14} duration={0.6} style={[tw('rounded-[28px] border border-line bg-surface'), { boxShadow: SHADOW.lift }]}>
      <Ruled style={tw('overflow-hidden rounded-[27px] p-6 pl-20')}>
        <Float style={[tw('absolute'), { right: -12, top: -12, opacity: 0.8 }]}><PlaneMark size={90} style={{ transform: [{ rotate: '12deg' }] }} /></Float>
        <Txt style={tw('font-hand text-xl text-sky-700')}>{t('dash.resume')}</Txt>
        <Txt testID="resume-title" style={[tw('mt-1 font-display text-3xl leading-tight text-ink'), { paddingRight: 48 }]}>{l.title}</Txt>
        <View style={tw('mt-5 flex-row flex-wrap items-center gap-4')}>
          <Ring value={l.progress_pct} size={64} stroke={6} color={COLORS['sky-600']} label={<Txt style={tw('text-sm font-semibold')}>{n(Math.round(l.progress_pct))}%</Txt>} />
          <Txt style={tw('text-sm text-ink-2')}>{n(l.nodes_completed)} / {n(l.node_count)}</Txt>
        </View>
        <Button href={`/learn/${l.id}`} icon={ArrowRight} style={tw('mt-4')} testID="resume-lesson">{t('dash.resumeBtn')}</Button>
      </Ruled>
    </Reveal>
  );
}

function Trend({ points }: { points: Dashboard['score_trend'] }) {
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const fillProps = useAnimatedProps(() => ({ opacity: fill.value }));
  if (points.length < 2) return <Txt style={tw('mt-6 text-sm text-ink-3')}>—</Txt>;
  const W = 300, H = 110;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - (p.score_pct / 100) * (H - 10) - 5);
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  return (
    <View style={tw('mt-4')} onLayout={(e) => { setWidth(e.nativeEvent.layout.width); fill.set(withDelay(600, withTiming(1, { duration: 400 }))); }}>
      {width > 0 && (
        <Svg width={width} height={(width * (H + 4)) / W} viewBox={`-4 -4 ${W + 8} ${H + 12}`}>
          {[25, 50, 75].map((g) => <Line key={g} x1={0} x2={W} y1={H - (g / 100) * (H - 10) - 5} y2={H - (g / 100) * (H - 10) - 5} stroke={COLORS.line} strokeDasharray="3 5" />)}
          <AnimatedPath d={`${path} L${W} ${H} L0 ${H} Z`} fill={COLORS['sky-50']} animatedProps={fillProps} />
          <DrawnLine points={xs.map((x, i) => [x, ys[i]])} color={COLORS['sky-600']} duration={1.2} />
          {xs.map((x, i) => <Circle key={i} cx={x} cy={ys[i]} r={4} fill={COLORS.surface} stroke={COLORS['sky-600']} strokeWidth={2} />)}
        </Svg>
      )}
    </View>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <Reveal y={14} duration={0.5} style={tw('rounded-[32px] border border-dashed border-line-2 bg-surface')}>
      <Ruled style={tw('items-center overflow-hidden rounded-[31px] px-6 py-16')}>
        <Float><PlaneMark size={110} animateIn /></Float>
        <Txt style={tw('mt-6 text-center font-display text-4xl')}>{t('dash.emptyTitle')}</Txt>
        <Txt style={[tw('mt-2 text-center text-ink-2'), { maxWidth: 448 }]}>{t('dash.emptyBody')}</Txt>
        <Button href="/new" size="lg" icon={Plus} style={[tw('mt-8'), { alignSelf: 'center' }]} testID="start-first">{t('dash.startFirst')}</Button>
      </Ruled>
    </Reveal>
  );
}

function DashSkeleton() {
  return (
    <View style={tw('gap-6')}>
      <Skeleton style={tw('h-44 rounded-[28px]')} />
      <Skeleton style={tw('h-24 rounded-[14px]')} />
      <Skeleton style={tw('h-72 rounded-[14px]')} />
    </View>
  );
}
