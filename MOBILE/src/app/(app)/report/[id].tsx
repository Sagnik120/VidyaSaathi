import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, CircleDot, Download, Hand, Lightbulb, Plus, RefreshCw } from 'lucide-react-native';
import { api } from '@/core/api';
import type { LessonDetail } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { saveNotes } from '@/lib/save-notes';
import { PlaneMark } from '@/components/brand/logo';
import { Page } from '@/components/layout/page';
import { PathNextCard } from '@/components/lesson/path-progress';
import { WhyLog } from '@/components/lesson/why-log';
import { CountUp, Float, Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Ruled } from '@/components/ui/paper';
import { Badge, Card, Ring, Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

export default function ReportPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['lesson', id], queryFn: () => api.getLesson(id) });
  const l = q.data;
  return (
    <Page onRefresh={() => q.refetch()}>
      {q.isLoading && <Skeleton style={tw('h-72 rounded-[28px]')} />}
      {q.isError && <Txt style={tw('text-rose')}>{(q.error as Error).message}</Txt>}
      {l && (l.status !== 'completed' || !l.report) && (
        <Card>
          <Ruled style={tw('items-center overflow-hidden rounded-[13px] px-6 py-16')}>
            <Float><PlaneMark size={90} /></Float>
            <Txt accessibilityRole="header" style={tw('mt-5 text-center font-display text-4xl')}>{l.title}</Txt>
            <Txt style={tw('mt-2 text-center text-ink-2')} testID="report-pending">{l.review_pending ? t('report.reviewPending') : t('report.notReady')}</Txt>
            <View style={tw('mt-6 flex-row flex-wrap justify-center gap-3')}>
              {l.review_pending && <Button variant="marigold" href={`/review/${id}`}>{t('dash.reviewBtn')}</Button>}
              <Button href={`/learn/${id}`} icon={ArrowRight}>{t('report.resume')}</Button>
            </View>
          </Ruled>
        </Card>
      )}
      {l?.report && l.status === 'completed' && <Report l={l} />}
    </Page>
  );
}

function Report({ l }: { l: LessonDetail }) {
  const { t, n } = useI18n();
  const r = l.report!;
  const qs = l.nodes.flatMap((x) => x.interactions);
  const right = qs.filter((x) => x.correct).length;
  const mastered = l.nodes.filter((x) => x.status === 'mastered').length;
  const reexplained = l.nodes.reduce((s, x) => s + x.times_reexplained, 0);
  const helped = l.escalations.filter((e) => e.status !== 'open');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await saveNotes(l.id, l.title);
      toast.success(t('class.notesSaved'));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const stats: Array<{ label: string; v: number; of?: number }> = [
    { label: t('report.mastered'), v: mastered, of: l.node_count },
    { label: t('report.questions'), v: right, of: qs.length },
    { label: t('report.reexplained'), v: reexplained },
    { label: t('report.minutes'), v: Math.round(l.watch_minutes) },
  ];
  const areas = [['report.strong', r.strong_areas, 'sage'], ['report.weak', r.weak_areas, 'marigold'], ['report.next', r.recommended_next, 'sky']] as const;

  return (
    <View style={tw('gap-8')}>
      {/* certificate-like hero */}
      <Reveal y={16} duration={0.6} style={[tw('rounded-[32px] border border-line bg-surface'), { boxShadow: SHADOW.lift }]}>
        <Ruled style={tw('overflow-hidden rounded-[31px] py-10 pl-20 pr-6')}>
          <View style={[tw('absolute'), { right: -16, top: -16, opacity: 0.7, transform: [{ rotate: '12deg' }] }]}><PlaneMark size={120} /></View>
          <Txt style={tw('font-hand text-2xl text-sky-700')}>{t('report.title')}</Txt>
          <Txt accessibilityRole="header" testID="report-title" style={tw('mt-1 font-display text-4xl leading-tight text-ink')}>{l.title}</Txt>
          <View style={tw('mt-8 gap-6')}>
            <Ring value={r.score_pct} size={140} stroke={12}
              label={<CountUp to={Math.round(r.score_pct)} suffix="%" format={(v) => n(v)} style={tw('font-display text-4xl')} />} />
            <Stagger style={tw('flex-row flex-wrap gap-y-4')}>
              {stats.map((s) => (
                <StaggerItem key={s.label} style={{ width: '50%' }}>
                  <Txt style={tw('font-display text-4xl text-ink')}>{n(s.v)}{s.of != null ? <Txt style={tw('text-xl text-ink-3')}> / {n(s.of)}</Txt> : null}</Txt>
                  <Txt style={tw('text-xs text-ink-3')}>{s.label}</Txt>
                </StaggerItem>
              ))}
            </Stagger>
          </View>
        </Ruled>
      </Reveal>

      {/* on a phone the score comes first; the reasoning follows */}
      <PathNextCard lessonId={l.id} />
      <View style={tw('rounded-3xl border border-line bg-surface p-5')}>
        <View style={tw('flex-row items-center gap-2')}>
          <Lightbulb size={20} color={COLORS['marigold-600']} />
          <Txt style={tw('font-display text-2xl text-ink')}>{t('report.why')}</Txt>
        </View>
        <WhyLog lessonId={l.id} style={tw('mt-4')} />
      </View>

      {r.narrative_feedback ? (
        <Card style={tw('p-5')}>
          <Txt style={tw('font-hand text-xl text-sky-700')}>{t('report.feedback')}</Txt>
          <Txt style={tw('mt-2 text-lg leading-relaxed text-ink-2')} testID="report-feedback">{r.narrative_feedback}</Txt>
        </Card>
      ) : null}

      <View style={tw('gap-4')}>
        {areas.map(([k, items, tone], i) => (
          <Reveal key={k} delay={i * 0.08} duration={0.5}>
            <Card style={tw('p-5')}>
              <Txt style={tw('text-sm font-semibold text-ink')}>{t(k)}</Txt>
              <View style={tw('mt-3 flex-row flex-wrap gap-2')}>
                {items.length ? items.map((x) => <Badge key={x} tone={tone}>{x}</Badge>) : <Txt style={tw('text-sm text-ink-3')}>{t('report.none')}</Txt>}
              </View>
            </Card>
          </Reveal>
        ))}
      </View>

      <View>
        <Txt style={tw('font-display text-3xl')}>{t('report.timeline')}</Txt>
        <View style={[tw('mt-5 gap-4 border-dashed pl-8'), { marginLeft: 14, borderLeftWidth: 2, borderColor: COLORS['line-2'] }]}>
          {l.nodes.map((node, i) => {
            const done = node.status === 'mastered';
            const skipped = node.status === 'skipped';
            return (
              <Reveal key={node.node_id} delay={Math.min(i, 10) * 0.04} duration={0.5}>
                {/* the step marker sits on the dashed line, ringed in paper */}
                <View style={[tw('absolute rounded-full bg-paper'), { left: -53, top: 12, padding: 4 }]}>
                  <View style={[tw('h-8 w-8 items-center justify-center rounded-full'), { backgroundColor: done ? COLORS.sage : skipped ? COLORS['marigold-100'] : COLORS['sky-100'] }]}>
                    {done ? <Check size={16} color={COLORS.white} /> : <Txt style={[tw('text-xs font-semibold'), { color: skipped ? COLORS['marigold-600'] : COLORS['sky-700'] }]}>{n(i + 1)}</Txt>}
                  </View>
                </View>
                <Card style={tw('p-5')}>
                  <Txt style={tw('font-display text-2xl')}>{node.concept}</Txt>
                  <View style={tw('mt-1 flex-row flex-wrap items-center gap-2')}>
                    <Txt style={tw('text-xs text-ink-3')}>{t('report.attempts', { n: n(node.attempts) })}</Txt>
                    {node.times_reexplained > 0 && (
                      <View style={tw('flex-row items-center gap-1')}>
                        <RefreshCw size={12} color={COLORS['ink-3']} />
                        <Txt style={tw('text-xs text-ink-3')}>{t('report.reexplainedN', { n: n(node.times_reexplained) })}</Txt>
                      </View>
                    )}
                  </View>
                  <View style={tw('mt-3 gap-3')}>
                    {node.interactions.map((x) => (
                      <View key={x.id} style={tw('rounded-2xl bg-paper-2 p-3')}>
                        <Txt style={tw('text-sm font-medium text-ink')}>{x.question_text}</Txt>
                        {x.raw_answer ? <Txt style={tw('mt-1 text-sm text-ink-2')}><Txt style={tw('text-ink-3')}>{t('report.youSaid')}: </Txt>{x.raw_answer}</Txt> : null}
                        <View style={tw('mt-1 flex-row items-start gap-1.5')}>
                          <View style={{ marginTop: 3 }}>{x.correct ? <Check size={14} color={COLORS.sage} /> : <CircleDot size={14} color={COLORS.rose} />}</View>
                          <Txt style={[tw('flex-1 text-sm'), { color: x.correct ? COLORS.sage : COLORS.rose }]}>{x.feedback_text}</Txt>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              </Reveal>
            );
          })}
        </View>
      </View>

      {helped.length > 0 && (
        <Card style={tw('p-5')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Hand size={16} color={COLORS.amber} />
            <Txt style={tw('font-semibold')}>{t('report.mentorHelp')}</Txt>
          </View>
          <View style={tw('mt-2 gap-1')}>
            {helped.map((e) => <Txt key={e.id} style={tw('text-sm text-ink-2')}>{e.concept}{e.resolution ? ` — ${e.resolution}` : ''}</Txt>)}
          </View>
        </Card>
      )}

      <View style={tw('flex-row flex-wrap justify-end gap-3')}>
        <Button variant="outline" onPress={() => void download()} status={busy ? 'loading' : 'idle'} icon={Download} testID="report-download">{t('report.download')}</Button>
        <Button href={`/review/${l.id}`} variant="soft" testID="report-practise">{t('class.practise')}</Button>
        <Button href="/new" icon={Plus}>{t('report.newLesson')}</Button>
      </View>
    </View>
  );
}
