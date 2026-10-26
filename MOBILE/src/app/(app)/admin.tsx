import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, BookOpen, Clock, Cpu, Gauge, Hand, Mail, MailX, Radio, Server, ShieldAlert, Users, Video, X } from 'lucide-react-native';
import { api, ApiError } from '@/core/api';
import type { MessageKey } from '@/core/i18n';
import type { AdminLearners } from '@/core/types';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { mediumDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { relativeDays } from '@/lib/lesson';
import { tabsFor, type StaffTab } from '@/lib/staff';
import { Avatar } from '@/components/brand/avatar';
import { Legend, TimeChart } from '@/components/charts/charts';
import { Page } from '@/components/layout/page';
import { LessonRow } from '@/components/lesson/lesson-row';
import { CountUp, EASE_OUT, Ping, ProgressBar, Pulse, Reveal } from '@/components/motion';
import type { IconType } from '@/components/ui/button';
import { GlassSearch } from '@/components/ui/glass-search';
import { Drawer } from '@/components/ui/overlay';
import { Press } from '@/components/ui/press';
import { Badge, Card, Skeleton, SlidingPill } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

type Tab = StaffTab;
type Tint = 'sky' | 'sage' | 'marigold' | 'rose';

const TINTS: Record<Tint, { bg: string; fg: string }> = {
  sky: { bg: COLORS['sky-50'], fg: COLORS['sky-700'] }, sage: { bg: COLORS['sage-100'], fg: COLORS.sage },
  marigold: { bg: COLORS['marigold-50'], fg: COLORS['marigold-600'] }, rose: { bg: COLORS['rose-100'], fg: COLORS.rose },
};

/** A tab in the staff strip; the ink slides in when it becomes the active one. */
function StripTab({ active, icon: Icon, label, badge, live, onPress, testID }: {
  active: boolean; icon: IconType; label: string; badge?: number; live?: boolean; onPress: () => void; testID?: string;
}) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => { p.set(withSpring(active ? 1 : 0, { stiffness: 450, damping: 34 })); }, [active, p]);
  const ink = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.9 + 0.1 * p.value }] }));
  const tint = active ? COLORS.white : COLORS['ink-2'];
  return (
    <Press onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} testID={testID} style={tw('flex-row items-center gap-2 rounded-xl px-3.5 py-2')}>
      <Animated.View style={[tw('absolute inset-0 rounded-xl bg-ink'), ink]} />
      <View style={{ zIndex: 1 }}><Icon size={18} color={tint} /></View>
      <Txt style={[tw('text-sm font-medium'), { color: tint, zIndex: 1 }]}>{label}</Txt>
      {badge ? <View style={tw('rounded-full bg-marigold px-1.5')}><Txt style={{ fontSize: 10.4, lineHeight: 15, fontWeight: '700', color: COLORS.ink }}>{badge}</Txt></View> : null}
      {live ? <Pulse style={tw('h-1.5 w-1.5 rounded-full bg-sage')} /> : null}
    </Press>
  );
}

export default function AdminPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tabs = tabsFor(user);
  const asked = params.tab as Tab | undefined;
  const tab: Tab = tabs.some((x) => x.v === asked) ? asked! : 'overview';
  const setTab = (v: Tab) => { haptic.tap(); router.setParams({ tab: v }); };
  // Keep the current section in view on the strip (it is chosen from the tab bar too).
  const strip = useRef<ScrollView>(null);
  const [stripWidth, setStripWidth] = useState(0);
  const [places, setPlaces] = useState<Record<string, { x: number; w: number }>>({});
  const place = places[tab];
  useEffect(() => {
    if (!place || !stripWidth) return;
    strip.current?.scrollTo({ x: Math.max(0, 16 + 4 + place.x + place.w / 2 - stripWidth / 2), animated: true });
  }, [place, stripWidth]);
  const teacher = user?.role === 'teacher';
  const overview = useQuery({ queryKey: ['admin', 'overview', 14], queryFn: () => api.admin.overview(14), refetchInterval: 15000, retry: false });
  const forbidden = overview.error instanceof ApiError && overview.error.status === 403;
  if (forbidden || (user && user.role !== 'admin' && user.role !== 'teacher' && overview.isError)) {
    return (
      <Page>
        <View style={[tw('items-center justify-center'), { minHeight: 360 }]} testID="admin-forbidden">
          <ShieldAlert size={40} color={COLORS.rose} />
          <Txt style={tw('mt-3 text-center text-ink-2')}>{t('admin.forbidden')}</Txt>
        </View>
      </Page>
    );
  }
  const o = overview.data;
  return (
    <Page onRefresh={() => overview.refetch()}>
      <View>
        <View style={tw('flex-row items-center gap-2')}>
          <View style={tw('h-2.5 w-2.5')}>
            <Ping color="rgba(95, 148, 116, 0.6)" />
            <View style={tw('h-2.5 w-2.5 rounded-full bg-sage')} />
          </View>
          <Txt style={tw('font-hand text-xl text-sky-700')}>{t('admin.refresh', { n: 15 })}</Txt>
        </View>
        <Txt accessibilityRole="header" testID="admin-title" style={tw('font-display text-5xl text-ink')}>{t(teacher ? 'staff.teacherTitle' : 'admin.title')}</Txt>
        <Txt style={tw('mt-2 text-ink-2')}>{t(teacher ? 'staff.teacherSub' : 'admin.sub')}</Txt>
      </View>

      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} style={[tw('mt-8'), { marginHorizontal: -16 }]} contentContainerStyle={tw('px-4 py-2')}
        onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}>
        <View style={tw('flex-row gap-1 rounded-2xl border border-line bg-surface p-1')}>
          {tabs.map((x) => (
            <View key={x.v} onLayout={(e) => { const { x: lx, width } = e.nativeEvent.layout; setPlaces((p) => (p[x.v]?.x === lx && p[x.v]?.w === width ? p : { ...p, [x.v]: { x: lx, w: width } })); }}>
            <StripTab active={tab === x.v} icon={x.icon} label={t(x.k)} onPress={() => setTab(x.v)} testID={`admin-tab-${x.v}`}
              badge={x.v === 'escalations' && (o?.open_escalations ?? 0) > 0 ? o!.open_escalations : undefined}
              live={x.v === 'live' && (o?.live_now ?? 0) > 0} />
            </View>
          ))}
        </View>
      </ScrollView>

      <Reveal key={tab} y={10} duration={0.3} style={tw('mt-6')}>
        <Txt style={tw('mb-6 mt-1 text-sm text-ink-3')}>{t(`admin.desc.${tab}` as MessageKey)}</Txt>
        {tab === 'overview' && <Overview />}
        {tab === 'live' && <Live />}
        {tab === 'escalations' && <Escalations />}
        {tab === 'insights' && <Insights />}
        {tab === 'quality' && <Quality />}
        {tab === 'pipeline' && <Pipeline />}
        {tab === 'learners' && <Learners />}
      </Reveal>
    </Page>
  );
}

function Stat({ icon: Icon, label, value, suffix, tone = 'sky' }: { icon: IconType; label: string; value: number; suffix?: string; tone?: Tint }) {
  const { n } = useI18n();
  return (
    <Card style={[tw('p-5'), { width: '48.4%' }]}>
      <View style={[tw('h-9 w-9 items-center justify-center rounded-xl'), { backgroundColor: TINTS[tone].bg }]}><Icon size={18} color={TINTS[tone].fg} /></View>
      <CountUp to={value} suffix={suffix} format={(v) => n(v)} style={tw('mt-4 font-display text-4xl')} />
      <Txt style={tw('text-xs text-ink-3')}>{label}</Txt>
    </Card>
  );
}

function Loading() {
  return <View style={tw('gap-4')}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} style={tw('h-32 rounded-[14px]')} />)}</View>;
}
function NoData() {
  const { t } = useI18n();
  return <Txt style={tw('py-6 text-sm text-ink-3')}>{t('admin.noData')}</Txt>;
}

function Kpi({ icon: Icon, label, value, suffix, sub, tone = 'sky' }: { icon: IconType; label: string; value: number; suffix?: string; sub: string; tone?: Tint }) {
  const { n } = useI18n();
  return (
    <Card style={[tw('p-4'), { width: '48.4%' }]}>
      <View style={tw('flex-row items-center gap-2')}>
        <View style={[tw('h-8 w-8 items-center justify-center rounded-xl'), { backgroundColor: TINTS[tone].bg }]}><Icon size={16} color={TINTS[tone].fg} /></View>
        <Txt numberOfLines={2} style={tw('flex-1 text-sm font-medium text-ink')}>{label}</Txt>
      </View>
      <CountUp to={value} suffix={suffix} format={(v) => n(v)} style={tw('mt-3 font-display text-4xl text-ink')} />
      <Txt style={tw('mt-0.5 text-xs text-ink-3')}>{sub}</Txt>
    </Card>
  );
}

/** A small "open / continued / all" style chip that inks in when chosen. */
function Chip({ active, onPress, children, testID }: { active: boolean; onPress: () => void; children: ReactNode; testID?: string }) {
  return (
    <Press onPress={() => { haptic.tap(); onPress(); }} testID={testID}
      style={[tw('flex-row items-center gap-1.5 rounded-full border px-3 py-1'), active ? { borderColor: COLORS.ink, backgroundColor: COLORS.ink } : { borderColor: COLORS.line, backgroundColor: COLORS.surface }]}>
      {typeof children === 'string' ? <Txt style={[tw('text-sm'), { color: active ? COLORS.white : COLORS['ink-2'] }]}>{children}</Txt> : children}
    </Press>
  );
}

const C = { right: '#7fb08f', wrong: '#e3a39a', rescued: COLORS['sky-600'], human: COLORS.margin, started: COLORS['sky-200'], completed: COLORS['sky-600'] };

function Overview() {
  const { t, n } = useI18n();
  const [days, setDays] = useState('14');
  const span = Number(days);
  const q = useQuery({ queryKey: ['admin', 'overview', span], queryFn: () => api.admin.overview(span), refetchInterval: 15000, placeholderData: (p) => p });
  const o = q.data;
  if (!o) return <Loading />;
  // Tolerate an older backend that predates the funnel / richer daily series.
  const daily = (o.daily ?? []).map((d) => ({
    ...d, right: d.right ?? 0, wrong: d.wrong ?? 0, rescued: d.rescued ?? 0,
    escalations: d.escalations ?? 0, completed: d.completed ?? 0, started: d.started ?? d.lessons ?? 0,
  }));
  const dates = daily.map((d) => d.date);
  const f = o.funnel ?? { concepts_checked: 0, first_time: 0, rescued: 0, still_stuck: 0, needed_human: 0 };
  const struggled = f.rescued + f.still_stuck;
  const saved = struggled ? Math.round((f.rescued / struggled) * 100) : 0;
  const rows = [
    { label: t('admin.f.checked'), v: f.concepts_checked, color: COLORS['ink-3'] },
    { label: t('admin.f.first'), v: f.first_time, color: C.right },
    { label: t('admin.f.rescued'), v: f.rescued, color: C.rescued },
    { label: t('admin.f.stuck'), v: f.still_stuck, color: C.wrong },
    { label: t('admin.f.human'), v: f.needed_human, color: C.human },
  ];
  const max = Math.max(1, f.concepts_checked);
  return (
    <View style={tw('gap-6')}>
      <View style={tw('flex-row flex-wrap justify-between gap-y-3')} testID="admin-kpis">
        <Kpi icon={Users} label={t('admin.kpi.students')} value={o.learners} sub={t('admin.kpi.studentsSub')} />
        <Kpi icon={Activity} label={t('admin.activeToday')} value={o.active_today} sub={t('admin.kpi.activeSub')} tone="sage" />
        <Kpi icon={Radio} label={t('admin.liveNow')} value={o.live_now} sub={t('admin.kpi.liveSub')} tone="sage" />
        <Kpi icon={Hand} label={t('admin.openEsc')} value={o.open_escalations} sub={t('admin.kpi.waitingSub')} tone={o.open_escalations ? 'marigold' : 'sky'} />
        <Kpi icon={BookOpen} label={t('admin.kpi.finished')} value={o.completed} sub={t('admin.kpi.finishedSub', { n: n(o.lessons) })} />
        <Kpi icon={Gauge} label={t('admin.avgScore')} value={Math.round(o.avg_score_pct)} suffix="%" sub={t('admin.kpi.scoreSub')} tone="marigold" />
      </View>

      <Card style={tw('p-5')}>
        <View style={tw('gap-3')}>
          <View>
            <Txt style={tw('font-display text-2xl')}>{t('admin.pulse')}</Txt>
            <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('admin.pulseSub')}</Txt>
          </View>
          <View style={tw('self-start rounded-xl border border-line bg-paper-2 p-0.5')}>
            <SlidingPill
              value={days}
              onChange={setDays}
              stretch={false}
              items={['7', '14', '30'].map((d) => ({ value: d, label: t('admin.days', { n: n(Number(d)) }) }))}
              style={tw('flex-row')}
              itemStyle={tw('rounded-lg px-3 py-1.5')}
              pillStyle={[tw('rounded-lg bg-surface'), { boxShadow: SHADOW.soft }]}
              renderItem={(item, active) => <Txt style={[tw('text-xs font-medium'), { color: active ? COLORS.ink : COLORS['ink-3'] }]}>{item.label}</Txt>}
            />
          </View>
        </View>
        <View style={tw('mt-4')}>
          <Legend items={[
            { label: t('admin.s.right'), color: C.right }, { label: t('admin.s.wrong'), color: C.wrong },
            { label: t('admin.s.rescued'), color: C.rescued, kind: 'line' }, { label: t('admin.s.human'), color: C.human, kind: 'dot' },
          ]} />
        </View>
        <TimeChart style={tw('mt-3')} dates={dates} height={280} yLabel={t('admin.questions')} series={[
          { key: 'right', label: t('admin.s.right'), color: C.right, kind: 'bar', values: daily.map((d) => d.right) },
          { key: 'wrong', label: t('admin.s.wrong'), color: C.wrong, kind: 'bar', values: daily.map((d) => d.wrong) },
          { key: 'rescued', label: t('admin.s.rescued'), color: C.rescued, kind: 'line', values: daily.map((d) => d.rescued) },
          { key: 'human', label: t('admin.s.human'), color: C.human, kind: 'dot', values: daily.map((d) => d.escalations) },
        ]} />
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('admin.funnel')}</Txt>
        <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('admin.funnelSub')}</Txt>
        <View style={tw('mt-5 gap-3')}>
          {rows.map((r, i) => (
            <View key={r.label}>
              <View style={tw('flex-row items-baseline justify-between gap-2')}>
                <Txt style={[tw('flex-1 text-sm'), i === 0 ? { color: COLORS.ink, fontWeight: '600' } : { color: COLORS['ink-2'] }]}>{r.label}</Txt>
                <Txt style={[tw('text-sm text-ink'), { fontVariant: ['tabular-nums'] }]}>
                  {n(r.v)}{i > 0 && f.concepts_checked > 0 ? <Txt style={tw('text-xs text-ink-3')}>  {n(Math.round((r.v / max) * 100))}%</Txt> : null}
                </Txt>
              </View>
              <ProgressBar value={(r.v / max) * 100} color={r.color} height={10} duration={0.8} delay={i * 0.08} style={tw('mt-1')} />
            </View>
          ))}
        </View>
        {struggled > 0 && <View style={tw('mt-5 rounded-2xl bg-sky-50 px-4 py-3')}><Txt style={tw('text-sm text-sky-700')}>{t('admin.f.story', { p: n(saved) })}</Txt></View>}
      </Card>

      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('admin.lessonFlow')}</Txt>
        <View style={tw('mt-3')}><Legend items={[{ label: t('admin.s.started'), color: C.started }, { label: t('admin.s.completed'), color: C.completed, kind: 'line' }]} /></View>
        <TimeChart style={tw('mt-3')} dates={dates} height={220} series={[
          { key: 'started', label: t('admin.s.started'), color: C.started, kind: 'bar', values: daily.map((d) => d.started) },
          { key: 'completed', label: t('admin.s.completed'), color: C.completed, kind: 'line', values: daily.map((d) => d.completed) },
        ]} />
      </Card>
    </View>
  );
}

function Live() {
  const { t, n } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'live'], queryFn: api.admin.live, refetchInterval: 5000 });
  if (!q.data) return <Loading />;
  if (!q.data.sessions.length) {
    return (
      <Card style={tw('items-center px-6 py-16')} testID="admin-no-live">
        <Radio size={32} color={COLORS['ink-3']} />
        <Txt style={tw('mt-3 text-center text-ink-3')}>{t('admin.noLive')}</Txt>
      </Card>
    );
  }
  return (
    <View style={tw('gap-4')}>
      {q.data.sessions.map((s) => (
        <Reveal key={s.lesson_id} y={0} scale={0.96} duration={0.3}>
          <Card style={tw('p-5')}>
            <View style={tw('absolute right-4 top-4 flex-row items-center gap-1.5')}>
              <Pulse style={tw('h-2 w-2 rounded-full bg-sage')} />
              <Txt style={tw('text-xs font-semibold text-sage')}>{s.fsm_state}</Txt>
            </View>
            <Txt style={[tw('font-medium text-ink'), { paddingRight: 80 }]}>{s.learner}</Txt>
            <Txt numberOfLines={1} style={tw('mt-0.5 text-sm text-ink-2')}>{s.title}</Txt>
            {s.concept ? <Badge tone="sky" style={tw('mt-3')}>{s.concept}</Badge> : null}
            <ProgressBar value={s.progress_pct} color={COLORS['sky-600']} height={6} duration={0.4} style={tw('mt-4')} />
            <Txt style={tw('mt-2 text-xs text-ink-3')}>{t('admin.connectedFor', { n: n(Math.round(s.connected_for_sec / 60)) })}</Txt>
          </Card>
        </Reveal>
      ))}
    </View>
  );
}

function Escalations() {
  const { t, n } = useI18n();
  const [status, setStatus] = useState<string>('open');
  const q = useQuery({ queryKey: ['admin', 'esc', status], queryFn: () => api.admin.escalations(status === 'all' ? undefined : status), refetchInterval: 10000 });
  const statuses = ['open', 'continued', 'resolved', 'all'];
  return (
    <View>
      <View style={tw('flex-row flex-wrap gap-2')}>
        {statuses.map((s) => {
          const count = q.data?.counts?.[s];
          return (
            <Chip key={s} active={status === s} onPress={() => setStatus(s)} testID={`esc-${s}`}>
              <Txt style={[tw('text-sm'), { color: status === s ? COLORS.white : COLORS['ink-2'] }]}>
                {s === 'all' ? t('admin.all') : t(`admin.esc.${s}` as MessageKey)}{count != null && count > 0 ? <Txt style={{ opacity: 0.7 }}>  {n(count)}</Txt> : null}
              </Txt>
            </Chip>
          );
        })}
      </View>
      {!q.data ? <View style={tw('mt-4')}><Loading /></View> : q.data.escalations.length === 0 ? (
        <Card style={tw('mt-4 px-6 py-14')}><Txt style={tw('text-center text-ink-3')} testID="admin-no-esc">{t('admin.noEsc')}</Txt></Card>
      ) : (
        <View style={tw('mt-4 gap-3')}>
          {q.data.escalations.map((e) => (
            <Card key={e.id} style={[tw('p-5'), e.needs_mentor ? { borderColor: COLORS['marigold-200'] } : null]}>
              <View style={tw('gap-3')}>
                <View>
                  <Txt style={tw('font-medium text-ink')}>{e.learner} <Txt style={tw('text-sm font-normal text-ink-3')}>· {e.learner_email}</Txt></Txt>
                  <Txt style={tw('text-sm text-ink-2')}>{e.lesson_title} → <Txt style={tw('font-medium')}>{e.concept}</Txt></Txt>
                </View>
                <View style={tw('flex-row flex-wrap items-center gap-2')}>
                  <Badge tone={e.needs_mentor ? 'marigold' : e.status === 'resolved' ? 'sage' : 'neutral'} dot>{t(`admin.esc.${e.needs_mentor ? 'open' : e.status}` as MessageKey)}</Badge>
                  {e.learner_moved_on && e.needs_mentor ? <Badge tone="neutral">{t('admin.movedOn')}</Badge> : null}
                  <Badge tone={e.mentor_notified ? 'sky' : 'rose'}
                    icon={e.mentor_notified ? <Mail size={12} color={COLORS['sky-700']} /> : <MailX size={12} color={COLORS.rose} />}>
                    {t(e.mentor_notified ? 'admin.mentorEmailed' : 'admin.noMentor')}
                  </Badge>
                </View>
              </View>
              <View style={tw('mt-3 flex-row flex-wrap gap-4')}>
                <View style={tw('flex-row items-center gap-1')}>
                  <AlertTriangle size={14} color={COLORS.rose} />
                  <Txt style={tw('text-xs text-ink-3')}>{t('admin.wrongAnswers', { n: n(e.wrong_answers) })}</Txt>
                </View>
                <View style={tw('flex-row items-center gap-1')}>
                  <Clock size={14} color={COLORS['ink-3']} />
                  <Txt style={tw('text-xs text-ink-3')}>{t('admin.minutesOpen', { n: n(Math.round(e.minutes_open)) })}</Txt>
                </View>
              </View>
              {e.last_question ? (
                <View style={tw('mt-3 rounded-2xl bg-paper-2 p-3')}>
                  <Txt style={tw('text-sm text-ink')}>{e.last_question}</Txt>
                  {e.last_answer ? <Txt style={tw('mt-1 text-sm text-ink-2')}><Txt style={tw('text-ink-3')}>{t('admin.lastAnswer')}: </Txt>{e.last_answer}</Txt> : null}
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

/** One slice of a stacked share bar; it widens into place. */
function Slice({ share, tint, delay }: { share: number; tint: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(delay * 1000, withTiming(share, { duration: 700, easing: EASE_OUT }))); }, [p, share, delay]);
  const style = useAnimatedStyle(() => ({ width: `${p.value}%` }));
  return <Animated.View style={[{ height: '100%', backgroundColor: tint }, style]} />;
}

function Insights() {
  const { t, n } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'insights'], queryFn: api.admin.insights });
  const d = q.data;
  if (!d) return <Loading />;
  const mix = Object.entries(d.adaptation_mix);
  const total = mix.reduce((s, [, v]) => s + v, 0) || 1;
  const colors: Record<string, string> = { ALLOW: COLORS.sage, MODIFY: COLORS['sky-500'], REGENERATE: COLORS['marigold-400'], HUMAN: COLORS.margin };
  return (
    <View style={tw('gap-4')}>
      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('admin.hardest')}</Txt>
        {d.hardest_concepts.length ? (
          <View style={tw('mt-4 gap-3')}>
            {d.hardest_concepts.map((c) => (
              <View key={c.concept}>
                <View style={tw('flex-row items-baseline justify-between gap-3')}>
                  <Txt numberOfLines={1} style={tw('flex-1 text-sm')}>{c.concept}</Txt>
                  <Txt style={[tw('text-sm text-ink-3'), { fontVariant: ['tabular-nums'] }]}>{n(Math.round(c.accuracy_pct))}%</Txt>
                </View>
                <ProgressBar value={c.accuracy_pct} color={c.accuracy_pct < 50 ? COLORS.rose : COLORS['marigold-400']} height={10} duration={0.8} style={tw('mt-1')} />
              </View>
            ))}
          </View>
        ) : <NoData />}
      </Card>
      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('admin.adaptMix')}</Txt>
        {mix.length ? (
          <>
            <View style={tw('mt-5 h-4 flex-row overflow-hidden rounded-full')}>
              {mix.map(([k, v], i) => <Slice key={k} share={(v / total) * 100} tint={colors[k] ?? COLORS['ink-3']} delay={i * 0.1} />)}
            </View>
            <View style={tw('mt-4 flex-row flex-wrap gap-y-2')}>
              {mix.map(([k, v]) => (
                <View key={k} style={[tw('flex-row items-center gap-2'), { width: '50%' }]}>
                  <View style={[tw('h-2.5 w-2.5 rounded-full'), { backgroundColor: colors[k] ?? COLORS['ink-3'] }]} />
                  <Txt style={tw('text-sm')}>{k} <Txt style={tw('text-ink-3')}>{n(v)}</Txt></Txt>
                </View>
              ))}
            </View>
          </>
        ) : <NoData />}
        <Txt style={tw('mt-6 text-sm text-ink-3')}>{t('admin.attemptsToMastery')}</Txt>
        <Txt style={tw('font-display text-4xl')}>{n(d.attempts_to_mastery.toFixed(1))}</Txt>
      </Card>
      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('admin.missed')}</Txt>
        {d.missed_questions.length ? (
          <View style={tw('mt-4')}>
            {d.missed_questions.map((m, i) => (
              <View key={i} style={[tw('gap-2 py-3'), i ? tw('border-t border-line') : null]}>
                <View>
                  <Txt style={tw('text-ink')}>{m.question}</Txt>
                  <Txt style={tw('text-xs text-ink-3')}>{m.concept} · {t('admin.asked', { n: n(m.asked) })}</Txt>
                </View>
                <Badge tone="rose">{t('admin.wrongPct', { n: n(Math.round(m.wrong_pct)) })}</Badge>
              </View>
            ))}
          </View>
        ) : <NoData />}
      </Card>
      {d.misconceptions.length > 0 && (
        <Card style={tw('p-5')}>
          <Txt style={tw('font-display text-2xl')}>{t('progress.misconceptions')}</Txt>
          <View style={tw('mt-4 flex-row flex-wrap gap-2')}>{d.misconceptions.map((m) => <Badge key={m.tag} tone="rose">{m.tag} ×{n(m.count)}</Badge>)}</View>
        </Card>
      )}
    </View>
  );
}

function KV({ data }: { data: Record<string, number> }) {
  const { n } = useI18n();
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <NoData />;
  return (
    <View style={tw('mt-4 gap-2.5')}>
      {entries.map(([k, v]) => (
        <View key={k} style={tw('flex-row items-center gap-3')}>
          <Txt numberOfLines={1} style={[tw('text-sm text-ink-2'), { width: 112 }]}>{k}</Txt>
          <ProgressBar value={(v / max) * 100} duration={0.7} style={tw('flex-1')} />
          <Txt style={[tw('text-right text-sm text-ink-3'), { width: 40, fontVariant: ['tabular-nums'] }]}>{n(v)}</Txt>
        </View>
      ))}
    </View>
  );
}

function Quality() {
  const { t, n } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'quality'], queryFn: api.admin.quality, refetchInterval: 15000 });
  const d = q.data;
  if (!d) return <Loading />;
  const healthy = d.llm.live && !d.llm.cooldown_active;
  return (
    <View style={tw('gap-4')}>
      <Card style={tw('p-5')}>
        <Txt style={tw('font-display text-2xl')}>{t('admin.llm')}</Txt>
        <View style={tw('mt-4 flex-row items-center gap-3')}>
          <View style={[tw('h-12 w-12 items-center justify-center rounded-2xl'), { backgroundColor: healthy ? COLORS.sage : COLORS.amber }]}><Cpu size={24} color={COLORS.white} /></View>
          <View style={tw('flex-1')}>
            <Txt style={tw('font-semibold')}>{healthy ? t('admin.liveModel') : t('admin.offlineModel')}</Txt>
            <Txt style={tw('text-sm text-ink-3')}>{d.llm.model}</Txt>
          </View>
        </View>
        {d.llm.cooldown_active && <Txt style={tw('mt-3 text-sm text-amber')}>{t('admin.cooldown', { n: n(Math.round(d.llm.cooldown_remaining_sec)) })}</Txt>}
        <Txt style={tw('mt-6 text-sm text-ink-3')}>{t('admin.explanations')}</Txt>
        <Txt style={tw('font-display text-4xl')}>{n(d.explanations)}</Txt>
        {d.script_words_vs_target != null && (
          <>
            <Txt style={tw('mt-3 text-sm text-ink-3')}>{t('admin.scriptLen')}</Txt>
            <Txt style={tw('font-display text-4xl')}>{n(Math.round(d.script_words_vs_target * 100))}%</Txt>
          </>
        )}
      </Card>
      <Card style={tw('p-5')}><Txt style={tw('font-display text-2xl')}>{t('admin.grounding')}</Txt><KV data={d.grounding} /></Card>
      <Card style={tw('p-5')}><Txt style={tw('font-display text-2xl')}>{t('admin.questionsByType')}</Txt><KV data={d.questions_by_type} /></Card>
    </View>
  );
}

function Pipeline() {
  const { t, n } = useI18n();
  const q = useQuery({ queryKey: ['admin', 'pipeline'], queryFn: api.admin.pipeline, refetchInterval: 10000 });
  const d = q.data;
  if (!d) return <Loading />;
  const up = d.uptime_sec;
  const upText = up >= 3600 ? `${n(Math.floor(up / 3600))}h ${n(Math.floor((up % 3600) / 60))}m` : `${n(Math.floor(up / 60))}m`;
  return (
    <View style={tw('gap-4')}>
      <View style={tw('flex-row flex-wrap justify-between gap-y-3')}>
        <Stat icon={Video} label={t('admin.renders')} value={d.renders.total} />
        <Stat icon={AlertTriangle} label={t('admin.failed')} value={d.renders.failed} tone={d.renders.failed ? 'rose' : 'sage'} />
        <Stat icon={Clock} label={t('admin.avgVideo')} value={Math.round(d.renders.avg_video_sec)} suffix="s" />
        <Stat icon={Radio} label={t('admin.reconnects')} value={d.reconnects_today} tone="marigold" />
        <Card style={[tw('p-5'), { width: '100%' }]}>
          <View style={tw('h-9 w-9 items-center justify-center rounded-xl bg-sage-100')}><Server size={18} color={COLORS.sage} /></View>
          <Txt style={tw('mt-4 font-display text-4xl')} testID="admin-uptime">{upText}</Txt>
          <Txt style={tw('text-xs text-ink-3')}>{t('admin.uptime')}{d.memory_mb != null ? ` · ${t('admin.memory')} ${n(Math.round(d.memory_mb))} MB` : ''}</Txt>
        </Card>
      </View>
      <Card style={tw('p-5')}><Txt style={tw('font-display text-2xl')}>{t('admin.events')}</Txt><KV data={d.events_last_hour} /></Card>
    </View>
  );
}

function Learners() {
  const { t } = useI18n();
  const [view, setView] = useState<'learners' | 'staff'>('learners');
  return (
    <View>
      <View style={tw('mb-4 flex-row gap-2')}>
        {(['learners', 'staff'] as const).map((v) => (
          <Chip key={v} active={view === v} onPress={() => setView(v)} testID={`people-${v}`}>{t(v === 'learners' ? 'admin.learners' : 'admin.staffList')}</Chip>
        ))}
      </View>
      {view === 'learners' ? <LearnerList /> : <StaffList />}
    </View>
  );
}

function StaffList() {
  const { t, n, lang } = useI18n();
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim());
  const q = useQuery({ queryKey: ['admin', 'staff', term], queryFn: () => api.admin.staff(term || undefined) });
  const staff = q.data?.staff ?? [];
  return (
    <View>
      <GlassSearch value={search} onChange={setSearch} placeholder={t('admin.searchStaff')} />
      <Card style={tw('mt-4')}>
        <View style={[tw('flex-row justify-between bg-paper-2 px-4 py-3'), { borderTopLeftRadius: 13, borderTopRightRadius: 13 }]}>
          <Txt style={[tw('text-xs uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('admin.staffList')}</Txt>
          <Txt style={[tw('text-xs uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('admin.joined')}</Txt>
        </View>
        {staff.map((s) => (
          <View key={s.id} style={tw('flex-row items-center gap-3 border-t border-line px-4 py-3')}>
            <Avatar user={s} size={34} />
            <View style={tw('min-w-0 flex-1')}>
              <View style={tw('flex-row flex-wrap items-center gap-2')}>
                <Txt numberOfLines={1} style={tw('shrink text-sm font-medium')}>{s.full_name}</Txt>
                <Badge tone={s.role === 'admin' ? 'sky' : 'sage'}>{t(s.role === 'admin' ? 'staff.admin' : 'staff.teacher')}</Badge>
              </View>
              <Txt numberOfLines={1} style={tw('text-xs text-ink-3')}>{s.email}</Txt>
            </View>
            <Txt style={tw('text-xs text-ink-3')}>{n(mediumDate(new Date(s.created_at), lang))}</Txt>
          </View>
        ))}
      </Card>
    </View>
  );
}

function LearnerList() {
  const { t, n, lang } = useI18n();
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim());
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['admin', 'learners', term], queryFn: () => api.admin.learners(term || undefined) });
  const learners = q.data?.learners ?? [];
  return (
    <View>
      <GlassSearch value={search} onChange={setSearch} placeholder={t('admin.searchLearners')} />
      <Card style={tw('mt-4')}>
        <View style={[tw('flex-row justify-between bg-paper-2 px-4 py-3'), { borderTopLeftRadius: 13, borderTopRightRadius: 13 }]}>
          <Txt style={[tw('text-xs uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('admin.learners')}</Txt>
          <Txt style={[tw('text-xs uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('admin.accuracy')}</Txt>
        </View>
        {learners.map((l, i) => (
          <Press key={l.id} onPress={() => setOpen(l.id)} scaleTo={0.99} testID={`learner-${i}`}
            style={tw('flex-row items-center gap-3 border-t border-line px-4 py-3')} activeStyle={{ backgroundColor: color('sky-50', 0.5) }}>
            <Avatar user={l} size={34} />
            <View style={tw('min-w-0 flex-1')}>
              <View style={tw('flex-row items-center gap-2')}>
                <Txt numberOfLines={1} style={tw('shrink text-sm font-medium')}>{l.full_name}</Txt>
                {l.open_escalations > 0 ? <Badge tone="marigold" icon={<Hand size={12} color={COLORS['marigold-600']} />}>{n(l.open_escalations)}</Badge> : null}
              </View>
              <Txt numberOfLines={1} style={tw('text-xs text-ink-3')}>{l.email}</Txt>
              <Txt numberOfLines={1} style={tw('text-xs text-ink-3')}>
                {t('admin.learnerLessons')}: {n(l.completed)} / {n(l.lessons)} · {l.last_active ? relativeDays(l.last_active, lang) : '—'}
              </Txt>
            </View>
            <View style={tw('items-end gap-1')}>
              <Txt style={[tw('text-sm text-ink-3'), { fontVariant: ['tabular-nums'] }]}>{n(Math.round(l.accuracy_pct))}%</Txt>
              <View style={tw('h-1.5 w-16 overflow-hidden rounded-full bg-paper-3')}><View style={[tw('h-full bg-sky-500'), { width: `${Math.max(0, Math.min(100, l.accuracy_pct))}%` }]} /></View>
            </View>
          </Press>
        ))}
      </Card>
      <LearnerDrawer id={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function LearnerDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, n } = useI18n();
  // Keeps the last learner on screen while the drawer slides away.
  const [shown, setShown] = useState<string | null>(id);
  useEffect(() => { if (id) setShown(id); }, [id]);
  const current = id ?? shown;
  const q = useQuery({ queryKey: ['admin', 'learner', current], queryFn: () => api.admin.learner(current!), enabled: !!current });
  const d = q.data;
  return (
    <Drawer open={!!id} onClose={onClose}>
      <Press onPress={onClose} accessibilityLabel={t('common.close')} testID="drawer-close"
        style={tw('h-9 w-9 items-center justify-center self-end rounded-xl')} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
        <X size={20} color={COLORS.ink} />
      </Press>
      {!d ? <Skeleton style={tw('mt-4 h-60 rounded-2xl')} /> : (
        <>
          <View style={tw('flex-row items-center gap-4')}>
            <Avatar user={d.learner as AdminLearners['learners'][number]} size={64} />
            <View style={tw('min-w-0 flex-1')}>
              <Txt style={tw('font-display text-3xl')} testID="drawer-name">{d.learner.full_name}</Txt>
              <Txt style={tw('text-sm text-ink-3')}>{d.learner.email}{d.learner.grade ? ` · ${d.learner.grade}` : ''}</Txt>
            </View>
          </View>
          <View style={tw('mt-6 flex-row gap-3')}>
            {([[d.learner.completed, t('admin.completed')], [Math.round(d.learner.accuracy_pct), t('admin.accuracy')], [d.practice_attempts, t('admin.practiceAttempts')]] as const).map(([v, l]) => (
              <Card key={l} style={tw('flex-1 items-center p-3')}>
                <Txt style={tw('font-display text-3xl')}>{n(v)}</Txt>
                <Txt style={[tw('text-center text-ink-3'), { fontSize: 11.2, lineHeight: 15 }]}>{l}</Txt>
              </Card>
            ))}
          </View>
          {d.weak_concepts.length > 0 && (
            <>
              <Txt style={tw('mt-6 text-sm font-semibold text-marigold-600')}>{t('dash.weak')}</Txt>
              <View style={tw('mt-2 flex-row flex-wrap gap-1.5')}>{d.weak_concepts.map((c) => <Badge key={c} tone="marigold">{c}</Badge>)}</View>
            </>
          )}
          {d.strong_concepts.length > 0 && (
            <>
              <Txt style={tw('mt-4 text-sm font-semibold text-sage')}>{t('dash.strong')}</Txt>
              <View style={tw('mt-2 flex-row flex-wrap gap-1.5')}>{d.strong_concepts.map((c) => <Badge key={c} tone="sage">{c}</Badge>)}</View>
            </>
          )}
          <Txt style={tw('mt-6 text-sm font-semibold')}>{t('admin.learnerLessons')}</Txt>
          <View style={tw('mt-2 rounded-2xl border border-line bg-surface')}>
            {d.lessons.map((l, i) => (
              // a learner's lessons are theirs: shown here, not opened
              <View key={l.id} style={[{ pointerEvents: 'none' }, i ? tw('border-t border-line') : null]}><LessonRow lesson={l} /></View>
            ))}
          </View>
        </>
      )}
    </Drawer>
  );
}
