import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown, CircleDot, FlaskConical, Hand, Play, RefreshCw, Sparkles } from 'lucide-react-native';
import { api } from '@/core/api';
import type { MessageKey } from '@/core/i18n';
import type { LessonDetail, LessonNode, PracticeQuestion, PracticeResult } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { labsFor } from '@/components/lab/labs';
import { Page } from '@/components/layout/page';
import { MediaVideo } from '@/components/lesson/video';
import { Collapse, Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { Badge, Card, Skeleton, Tabs, Textarea, type Tone } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

type Tab = 'watch' | 'practice';

const NOTE: Record<string, [MessageKey, Tone]> = {
  'after help': ['review.afterHelp', 'sage'], 'after review': ['review.afterReview', 'sage'], 'needs review': ['review.needsReviewNote', 'amber'],
};
const STATUS: Record<string, [MessageKey, Tone]> = {
  mastered: ['class.node.mastered', 'sage'], completed: ['class.node.completed', 'sage'], skipped: ['class.node.toReview', 'amber'],
  struggling: ['review.inProgress', 'amber'], teaching: ['review.inProgress', 'amber'], questioning: ['review.inProgress', 'amber'],
};

export default function ReviewPage() {
  const { id, tab: wanted } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { t, n } = useI18n();
  const [tab, setTab] = useState<Tab>('watch');
  const q = useQuery({ queryKey: ['lesson', id], queryFn: () => api.getLesson(id) });

  useEffect(() => { setTab(wanted === 'practice' ? 'practice' : 'watch'); }, [wanted, id]);

  const act = async (kind: 'continue' | 'skip' | 'relearn', nodeId?: string) => {
    try {
      if (kind === 'continue') await api.continueLesson(id);
      else if (kind === 'skip') await api.skipConcept(id);
      else await api.relearnConcept(id, nodeId!);
      router.push(`/learn/${id}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  const l = q.data;
  return (
    <Page onRefresh={() => q.refetch()}>
      <Press href="/lessons" hitSlop={8} style={tw('flex-row items-center gap-1.5 self-start')} testID="all-lessons">
        <ArrowLeft size={16} color={COLORS['ink-3']} />
        <Txt style={tw('text-sm text-ink-3')}>{t('review.allLessons')}</Txt>
      </Press>
      {q.isLoading && <Skeleton style={tw('mt-6 h-40 rounded-[14px]')} />}
      {q.isError && <Txt style={tw('mt-6 text-rose')}>{(q.error as Error).message}</Txt>}
      {l && (
        <>
          <View style={tw('mt-3 gap-4')}>
            <View>
              <Txt style={tw('font-hand text-xl text-sky-700')}>{t('review.title')}</Txt>
              <Txt accessibilityRole="header" testID="review-title" style={tw('font-display text-4xl text-ink')}>{l.title}</Txt>
              <Txt style={tw('mt-2 text-sm text-ink-2')}>{t('review.conceptsDone', { a: n(l.nodes_completed), b: n(l.node_count) })} · {t('review.sub')}</Txt>
            </View>
            {l.status === 'completed' && !l.review_pending ? <Button variant="outline" href={`/report/${id}`}>{t('lessons.report')}</Button>
              : l.status !== 'escalated' ? <Button href={`/learn/${id}`}>{t('report.resume')}</Button> : null}
          </View>

          {l.status === 'escalated' && l.escalation?.status === 'open' && (
            <View style={[tw('mt-6 rounded-[22px] border p-5'), { borderColor: color('amber', 0.3), backgroundColor: 'rgba(251, 240, 217, 0.6)' }]}>
              <View style={tw('flex-row items-center gap-2')}>
                <Hand size={16} color={COLORS.amber} />
                <Txt style={tw('font-semibold text-ink')}>{t('class.pausedTitle')}</Txt>
              </View>
              <Txt style={tw('mt-1 text-sm text-ink-2')}>{t('class.pausedBody', { c: l.escalation.concept })}</Txt>
              <View style={tw('mt-4 flex-row flex-wrap gap-2')}>
                <Button size="sm" onPress={() => void act('continue')} testID="review-continue">{t('class.continueAgain')}</Button>
                <Button size="sm" variant="outline" onPress={() => void act('skip')} testID="review-skip">{t('class.skip')}</Button>
              </View>
            </View>
          )}

          <Tabs<Tab> style={[tw('mt-8'), { maxWidth: 384 }]} value={tab} onChange={setTab} items={[{ value: 'watch', label: t('review.watch') }, { value: 'practice', label: t('review.practice') }]} />
          <Reveal key={tab} y={8} duration={0.25} style={tw('mt-6')}>
            {tab === 'watch' ? <Watch l={l} onRelearn={(nid) => void act('relearn', nid)} /> : <Practice id={id} />}
          </Reveal>
        </>
      )}
    </Page>
  );
}

function Watch({ l, onRelearn }: { l: LessonDetail; onRelearn: (nodeId: string) => void }) {
  const { t, n } = useI18n();
  const taught = l.nodes.filter((x) => x.script_text || x.video_url);
  if (!taught.length) return <Txt style={tw('py-14 text-center text-ink-3')}>{t('review.nothing')}</Txt>;
  const canRelearn = ['completed', 'in_progress'].includes(l.status) && !l.relearning;
  return (
    <View style={tw('gap-4')}>
      {l.nodes.map((node, i) => ((node.script_text || node.video_url) ? <WatchCard key={node.node_id} node={node} i={i} canRelearn={canRelearn} onRelearn={onRelearn} /> : null))}
      <Txt style={tw('text-center text-xs text-ink-3')}>{n(taught.length)} / {n(l.node_count)}</Txt>
    </View>
  );
}

function WatchCard({ node, i, canRelearn, onRelearn }: { node: LessonNode; i: number; canRelearn: boolean; onRelearn: (id: string) => void }) {
  const { t, n } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [label, tone] = NOTE[node.review_note ?? ''] ?? STATUS[node.status] ?? ['review.notReached', 'neutral'];
  return (
    <Card style={tw('p-5')} testID={`watch-card-${i}`}>
      <View style={tw('flex-row flex-wrap items-center justify-between gap-2')}>
        <Txt style={tw('shrink font-display text-2xl text-ink')}><Txt style={tw('text-sky-600')}>{n(i + 1)}.</Txt> {node.concept}</Txt>
        <Badge tone={tone} dot>{t(label)}</Badge>
      </View>
      {playing && node.video_url ? (
        <View style={tw('mt-4 overflow-hidden rounded-2xl')}>
          <MediaVideo url={node.video_url} style={tw('aspect-video w-full')} onError={(e) => { toast.error(e.message); setPlaying(false); }} />
        </View>
      ) : null}
      {node.notes?.key_points?.length ? (
        <View style={tw('mt-3 gap-1.5')}>
          {node.notes.key_points.map((p, j) => (
            <View key={j} style={tw('flex-row gap-2')}>
              <View style={[tw('h-1.5 w-1.5 rounded-full bg-marigold-600'), { marginTop: 9 }]} />
              <Txt style={tw('flex-1 text-ink-2')}>{p}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {node.notes?.example ? <Txt style={tw('mt-2 text-sm text-ink-3')}>{t('class.example')}: {node.notes.example}</Txt> : null}
      {node.script_text ? (
        <View style={tw('mt-3')}>
          <Press onPress={() => setOpen(!open)} hitSlop={6} style={tw('flex-row items-center gap-1 self-start')} accessibilityState={{ expanded: open }}>
            <View style={open ? { transform: [{ rotate: '180deg' }] } : null}><ChevronDown size={16} color={COLORS['sky-700']} /></View>
            <Txt style={tw('text-sm text-sky-700')}>{t('review.transcript')}</Txt>
          </Press>
          <Collapse open={open}><Txt style={tw('pt-2 leading-relaxed text-ink-2')}>{node.script_text}</Txt></Collapse>
        </View>
      ) : null}
      <View style={tw('mt-4 flex-row flex-wrap gap-2')}>
        {node.video_url && !playing ? <Button size="sm" variant="soft" onPress={() => setPlaying(true)} icon={Play} testID={`watch-${i}`}>{t('review.watchBtn')}</Button> : null}
        {node.status === 'skipped' && canRelearn ? <Button size="sm" onPress={() => onRelearn(node.node_id)} icon={RefreshCw}>{t('review.learnAgain')}</Button> : null}
      </View>
    </Card>
  );
}

function Practice({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['practice', id], queryFn: () => api.practice(id) });
  const [making, setMaking] = useState(false);
  if (q.isLoading) return <Skeleton style={tw('h-60 rounded-[14px]')} />;
  const qs = q.data?.questions ?? [];
  if (!qs.length) return <Txt style={tw('py-14 text-center text-ink-3')} testID="no-practice">{t('review.noQuestions')}</Txt>;
  const hi = lang === 'hi';
  const make = async () => {
    setMaking(true);
    try {
      qc.setQueryData(['practice', id], await api.generatePractice(id));
      toast.success(hi ? 'नए अभ्यास प्रश्न तैयार' : 'Fresh practice ready');
    } catch (e) { toast.error((e as Error).message); } finally { setMaking(false); }
  };
  const labs = labsFor(qs.map((x) => x.concept).join(' '));
  return (
    <View style={tw('gap-4')}>
      <View style={[tw('gap-3 rounded-2xl border border-sky-200 p-4'), { backgroundColor: color('sky-50', 0.4) }]}>
        <View style={tw('flex-row items-start gap-3')}>
          <Sparkles size={20} color={COLORS['sky-600']} />
          <Txt style={tw('min-w-0 flex-1 text-sm text-ink-2')}>{hi ? 'आपकी कमज़ोर जगहों के लिए, आपके स्तर पर, नए प्रश्न बनाएँ।' : 'Make new questions aimed at your weak spots, at your level.'}</Txt>
        </View>
        <Button size="sm" onPress={() => void make()} status={making ? 'loading' : 'idle'} style={{ alignSelf: 'flex-end' }} testID="fresh-practice">{hi ? 'नया अभ्यास' : 'Fresh practice'}</Button>
      </View>
      {labs.length > 0 && (
        <View style={tw('flex-row flex-wrap items-center gap-2')}>
          <FlaskConical size={16} color={COLORS['sky-600']} />
          <Txt style={tw('text-sm text-ink-2')}>{hi ? 'करके सीखें:' : 'Learn by doing:'}</Txt>
          {labs.map((l) => (
            <Press key={l.id} href={{ pathname: '/lab', params: { sim: l.id } }} style={tw('rounded-full border border-sky-200 bg-surface px-3 py-1')} activeStyle={{ borderColor: '#7fa5dd' }}>
              <Txt style={tw('text-sm text-sky-700')}>{hi ? l.hi : l.en}</Txt>
            </Press>
          ))}
        </View>
      )}
      <Txt style={tw('text-sm text-ink-3')}>{t('review.practiceNote')}</Txt>
      {qs.map((x, i) => <PracticeCard key={x.interaction_id} q={x} i={i} lessonId={id} />)}
    </View>
  );
}

function PracticeCard({ q, i, lessonId }: { q: PracticeQuestion; i: number; lessonId: string }) {
  const { t, n, lang } = useI18n();
  const [ans, setAns] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PracticeResult | null>(null);
  const mcq = q.options?.length > 0;
  const check = async () => {
    setBusy(true);
    try {
      const r = await api.answerPractice(lessonId, q.interaction_id, ans);
      setRes(r);
      if (r.correct) haptic.success(); else haptic.warning();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card style={tw('p-5')} testID="practice-card">
      <View style={tw('flex-row flex-wrap items-center gap-2')}>
        <Txt style={tw('font-display text-xl text-sky-600')}>{n(i + 1)}</Txt>
        <Badge>{q.concept}</Badge>
        {q.generated ? (
          <Badge tone="sky" dot>{lang === 'hi' ? `नया · स्तर ${n(q.difficulty ?? 0)}` : `New · level ${n(q.difficulty ?? 0)}`}</Badge>
        ) : q.needs_practice ? <Badge tone="marigold" dot>{t('review.needsPractice')}</Badge> : null}
        {q.generated && q.target ? <Txt style={tw('text-xs text-ink-3')}>{lang === 'hi' ? 'लक्ष्य' : 'targets'}: {q.target.replace(/_/g, ' ')}</Txt> : null}
        {q.last_practice ? <Txt style={tw('text-xs text-ink-3')}>{t('review.lastTime', { r: t(q.last_practice.correct ? 'review.right' : 'review.wrong') })}</Txt> : null}
      </View>
      <Txt style={tw('mt-2 text-lg font-medium text-ink')}>{q.question_text}</Txt>
      {q.your_lesson_answer ? <Txt style={tw('mt-1 text-sm text-ink-3')}>{t('review.inLesson', { a: q.your_lesson_answer })}</Txt> : null}
      {mcq ? (
        <View style={tw('mt-3 gap-2')}>
          {q.options.map((o, j) => (
            <Press key={o} onPress={() => { haptic.tap(); setAns(o); setRes(null); }} scaleTo={0.985} testID={`practice-option-${j}`}
              style={[tw('rounded-2xl border px-4 py-2.5'), ans === o ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line }]}>
              <Txt style={tw('text-sm text-ink')}>{o}</Txt>
            </Press>
          ))}
        </View>
      ) : <Textarea style={tw('mt-3')} rows={3} value={ans} onChangeText={(v) => { setAns(v); setRes(null); }} placeholder={t('class.answerPlaceholder')} testID="practice-answer" />}
      <View style={tw('mt-3 flex-row justify-end')}>
        <Button size="sm" onPress={() => void check()} disabled={!ans.trim() || busy} status={busy ? 'loading' : 'idle'} testID="practice-check">{res ? t('review.checkAgain') : t('review.check')}</Button>
      </View>
      {res && (
        <Reveal y={6} duration={0.3} style={[tw('mt-3 rounded-2xl p-4'), { backgroundColor: res.correct ? COLORS['sage-100'] : 'rgba(248, 226, 226, 0.6)' }]}>
          <View style={tw('flex-row items-center gap-2')} testID="practice-result">
            {res.correct ? <Check size={16} color={COLORS.sage} /> : <CircleDot size={16} color={COLORS.rose} />}
            <Txt style={[tw('font-semibold'), { color: res.correct ? COLORS.sage : COLORS.rose }]}>{t(res.correct ? 'class.correct' : 'class.notQuite')}</Txt>
          </View>
          {res.feedback_text ? <Txt style={tw('mt-1 text-sm text-ink-2')}>{res.feedback_text}</Txt> : null}
          {res.model_answer ? <Txt style={tw('mt-2 text-sm text-ink-2')}><Txt style={tw('font-semibold')}>{t('review.modelAnswer')}: </Txt>{res.model_answer}</Txt> : null}
        </Reveal>
      )}
    </Card>
  );
}
