import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { BookOpen, Check, CircleDot, Download, Eye, FileText, Hand, Lightbulb, MessageSquareText, Play, RefreshCw, ScrollText, Sparkles, X } from 'lucide-react-native';
import type { MessageKey } from '@/core/i18n';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { MONO } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { saveNotes } from '@/lib/save-notes';
import { PlaneMark } from '@/components/brand/logo';
import { MediaVideo } from '@/components/lesson/video';
import { WhyLog } from '@/components/lesson/why-log';
import { Float, Pulse, Reveal, Shimmer, Spin } from '@/components/motion';
import { Button, type IconType } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlay';
import { Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Badge, SlidingPill } from '@/components/ui/primitives';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';
import type { ClassroomController, ClassroomState, NodeView } from './controller';

/* ── study panel: Notes / Transcript / Questions / Source / Why ────────── */

type Tab = 'notes' | 'transcript' | 'questions' | 'source' | 'why';

const TABS: Array<{ value: Tab; icon: IconType; key: MessageKey }> = [
  { value: 'notes', icon: BookOpen, key: 'class.tabs.notes' },
  { value: 'transcript', icon: ScrollText, key: 'class.tabs.transcript' },
  { value: 'questions', icon: MessageSquareText, key: 'class.tabs.questions' },
  { value: 'source', icon: FileText, key: 'class.tabs.source' },
  { value: 'why', icon: Lightbulb, key: 'class.tabs.why' },
];

export function StudyPanel({ s, lessonId }: { s: ClassroomState; lessonId: string }) {
  const { t, n } = useI18n();
  const [tab, setTab] = useState<Tab>('notes');
  const answered = s.qa.filter((x) => x.result).length;
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await saveNotes(lessonId, s.title);
      toast.success(t('class.notesSaved'));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <View style={[tw('rounded-[26px] border border-line bg-surface'), { boxShadow: SHADOW.soft }]} testID="study-panel">
      <View style={tw('p-3')}>
        <View style={tw('rounded-2xl bg-paper-2 p-1')}>
          <SlidingPill<Tab>
            value={tab}
            onChange={setTab}
            items={TABS.map((x) => ({ value: x.value }))}
            style={tw('flex-row gap-1')}
            itemStyle={tw('rounded-xl px-1.5 py-2')}
            pillStyle={[tw('rounded-xl bg-surface'), { boxShadow: SHADOW.soft }]}
            renderItem={(item, active) => {
              const meta = TABS.find((x) => x.value === item.value)!;
              const tint = active ? COLORS.ink : COLORS['ink-3'];
              return (
                <View style={tw('flex-row items-center justify-center gap-1.5')} accessibilityLabel={t(meta.key)} testID={`study-tab-${item.value}`}>
                  <meta.icon size={16} color={tint} />
                  {item.value === 'questions' && s.qa.length > 0 && (
                    <View style={tw('rounded-full bg-sky-100 px-1.5')}><Txt style={[tw('text-sky-700'), { fontSize: 10.4, lineHeight: 15 }]}>{n(answered)}</Txt></View>
                  )}
                </View>
              );
            }}
          />
        </View>
        <Txt style={[tw('mt-2 px-2 font-semibold uppercase text-ink-3'), { fontSize: 11.2, lineHeight: 16, letterSpacing: 0.56 }]}>{t(TABS.find((x) => x.value === tab)!.key)}</Txt>
      </View>
      <Reveal key={tab} y={6} duration={0.2} style={[tw('px-5 pb-5'), { minHeight: 260 }]}>
        {tab === 'notes' && <NotesTab s={s} />}
        {tab === 'transcript' && (s.notes?.transcript
          ? <TranscriptTab text={s.notes.transcript} concept={s.notes.concept} />
          : <Empty icon={ScrollText} text={t('class.noNotes')} />)}
        {tab === 'questions' && <QuestionsTab s={s} />}
        {tab === 'source' && <SourceTab s={s} />}
        {tab === 'why' && <WhyLog lessonId={lessonId} live />}
      </Reveal>
      {s.collected.length > 0 && (
        <View style={tw('border-t border-line p-3')}>
          <Button variant="soft" size="sm" block onPress={() => void download()} status={busy ? 'loading' : 'idle'} icon={Download} testID="download-notes">{t('class.downloadNotes')}</Button>
        </View>
      )}
    </View>
  );
}

function Empty({ icon: Icon, text }: { icon: IconType; text: string }) {
  return (
    <View style={tw('items-center gap-3 py-14')}>
      <View style={tw('h-12 w-12 items-center justify-center rounded-2xl bg-paper-2')}><Icon size={20} color={COLORS['ink-3']} /></View>
      <Txt style={tw('text-center text-sm text-ink-3')}>{text}</Txt>
    </View>
  );
}

function NotesTab({ s }: { s: ClassroomState }) {
  const { t, n } = useI18n();
  const nn = s.notes;
  if (!nn && s.collected.length === 0) return <Empty icon={BookOpen} text={t('class.noNotes')} />;
  return (
    <View style={tw('gap-6')}>
      {nn && (
        <Ruled margin={false} style={[tw('rounded-2xl px-1'), { marginHorizontal: -4 }]}>
          <View style={tw('flex-row flex-wrap items-center gap-2')}>
            <Txt style={tw('font-display text-2xl text-ink')} testID="notes-concept">{nn.concept}</Txt>
            {nn.depth ? <Badge>{nn.depth}</Badge> : null}
            {nn.est_minutes ? <Badge tone="sky">{t('common.minutes', { n: n(nn.est_minutes) })}</Badge> : null}
          </View>
          {nn.formula ? (
            <View style={tw('mt-3 rounded-2xl bg-sky-50 px-4 py-3')}>
              <Txt style={[tw('text-xs font-semibold uppercase'), { color: color('sky-600', 0.7), letterSpacing: 0.6 }]}>{t('class.formula')}</Txt>
              <Txt style={{ fontFamily: MONO, fontSize: 15.2, lineHeight: 22, color: COLORS['sky-700'] }}>{nn.formula}</Txt>
            </View>
          ) : null}
          <Txt style={[tw('mt-4 text-xs font-semibold uppercase text-ink-3'), { letterSpacing: 0.6 }]}>{t('class.keyPoints')}</Txt>
          <View style={tw('mt-2 gap-2')}>
            {nn.points.map((p, i) => (
              <Reveal key={`${nn.node_id}-${i}`} x={-6} y={0} delay={i * 0.06} duration={0.3} style={tw('flex-row gap-2.5')}>
                <View style={[tw('h-1.5 w-1.5 rounded-full bg-marigold-600'), { marginTop: 10 }]} />
                <Txt style={tw('flex-1 leading-relaxed text-ink-2')}>{p}</Txt>
              </Reveal>
            ))}
          </View>
          {nn.example ? (
            <View style={[tw('mt-4 rounded-2xl bg-marigold-50 px-4 py-3'), { borderLeftWidth: 4, borderLeftColor: COLORS['marigold-400'] }]}>
              <Txt style={[tw('text-xs font-semibold uppercase text-marigold-600'), { letterSpacing: 0.6 }]}>{t('class.example')}</Txt>
              <Txt style={tw('mt-1 text-ink-2')}>{nn.example}</Txt>
            </View>
          ) : null}
        </Ruled>
      )}
      {s.collected.length > (nn ? 1 : 0) && (
        <View>
          <Txt style={tw('font-hand text-lg text-sky-700')}>{t('class.allNotes')}</Txt>
          <View style={tw('mt-2 gap-3')}>
            {s.collected.filter((c) => c.node_id !== nn?.node_id).map((c, i) => (
              <View key={c.node_id} style={tw('rounded-2xl border border-line p-3')}>
                <Txt style={tw('text-sm font-semibold text-ink')}>{n(i + 1)}. {c.concept}</Txt>
                <View style={tw('mt-1 gap-0.5')}>
                  {c.points.map((p, j) => (
                    <View key={j} style={tw('flex-row gap-2 pl-1')}>
                      <Txt style={tw('text-sm text-ink-2')}>•</Txt>
                      <Txt style={tw('flex-1 text-sm text-ink-2')}>{p}</Txt>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function TranscriptTab({ text, concept }: { text: string; concept: string }) {
  const paras = text.split(/\n{2,}|(?<=[.!?।])\s+(?=[A-Zअ-ह])/).filter(Boolean);
  return (
    <View>
      <Txt style={tw('font-display text-xl text-ink')}>{concept}</Txt>
      <View style={tw('mt-3 gap-3')}>{paras.map((p, i) => <Txt key={i} style={tw('leading-relaxed text-ink-2')}>{p}</Txt>)}</View>
    </View>
  );
}

function QuestionsTab({ s }: { s: ClassroomState }) {
  const { t } = useI18n();
  if (!s.qa.length) return <Empty icon={MessageSquareText} text={t('class.noQuestions')} />;
  return (
    <View style={tw('gap-3')}>
      {[...s.qa].reverse().map(({ question, answer, result }) => {
        const tint = result ? (result.correct ? COLORS.sage : result.partial_credit >= 0.5 ? COLORS['marigold-600'] : COLORS.rose) : COLORS.ink;
        return (
          <View key={question.interaction_id} style={tw('rounded-2xl border border-line p-4')}>
            <Txt style={tw('font-medium text-ink')}>{question.question_text}</Txt>
            {answer ? <Txt style={tw('mt-2 text-sm text-ink-2')}><Txt style={tw('text-ink-3')}>{t('class.answered')}: </Txt>{answer}</Txt> : null}
            {result ? (
              <View style={tw('mt-2 flex-row items-start gap-1.5')}>
                <View style={{ marginTop: 2 }}>{result.correct ? <Check size={16} color={tint} /> : <CircleDot size={16} color={tint} />}</View>
                <Txt style={[tw('flex-1 text-sm'), { color: tint }]}>
                  {t(result.correct ? 'class.correct' : result.partial_credit >= 0.5 ? 'class.nearly' : 'class.notQuite')}{result.feedback_text ? ` — ${result.feedback_text}` : ''}
                </Txt>
              </View>
            ) : <Badge tone="marigold" style={tw('mt-2')}>{t('class.yourTurn')}</Badge>}
          </View>
        );
      })}
    </View>
  );
}

function SourceTab({ s }: { s: ClassroomState }) {
  const { t, n } = useI18n();
  const c = s.citation;
  if (!s.isDocument) return <Empty icon={Sparkles} text={t('class.noSource')} />;
  if (!c || c.none) return <Empty icon={FileText} text={t('class.noMatch')} />;
  const weak = c.risk_level && c.risk_level !== 'low';
  const where = [c.section_title, c.page_or_slide ? t('class.page', { n: n(c.page_or_slide) }) : ''].filter(Boolean).join(' · ');
  return (
    <View>
      <Badge tone={weak ? 'amber' : 'sage'} dot>{t(weak ? 'class.loose' : 'class.grounded')}</Badge>
      <Txt style={tw('mt-3 font-semibold text-ink')}>{c.source_title}{where ? ` — ${where}` : ''}</Txt>
      <View style={[tw('mt-3 rounded-2xl px-4 py-3'), { borderLeftWidth: 4, borderLeftColor: COLORS['sky-300'], backgroundColor: color('sky-50', 0.6) }]}>
        <Txt style={[tw('leading-relaxed text-ink-2'), { backgroundColor: color('marigold-100', 0.7) }]}>{c.excerpt}</Txt>
      </View>
      {c.chunk_count ? <Txt style={tw('mt-3 text-xs text-ink-3')}>{t('class.passages', { n: n(c.chunk_count) })}</Txt> : null}
      {(c.attempts ?? 0) > 1 && <Txt style={tw('mt-1 text-xs text-ink-3')}>{t('class.refined', { q: c.refined_query || '' })}</Txt>}
    </View>
  );
}

/* ── concept rail ──────────────────────────────────────────────────────── */

const RAIL_ITEM = 224;
const RAIL_GAP = 8;

export function ConceptRail({ s, onRewatch }: { s: ClassroomState; onRewatch: (n: NodeView) => void }) {
  const { t, n } = useI18n();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const activeIndex = s.nodes.findIndex((x) => x.node_id === s.currentNodeId);
  // Keep the concept being taught centred in the rail.
  useEffect(() => {
    if (activeIndex < 0 || !width) return;
    const x = activeIndex * (RAIL_ITEM + RAIL_GAP) - (width - RAIL_ITEM) / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [activeIndex, width]);

  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={t('class.curriculum')}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)} contentContainerStyle={[tw('py-1'), { gap: RAIL_GAP }]} testID="concept-rail">
      {s.nodes.map((node, i) => {
        const active = node.node_id === s.currentNodeId;
        const done = node.status === 'mastered' || node.status === 'completed';
        const review = node.status === 'skipped';
        const rewatchable = !!node.video_url && !active && (done || review);
        const label: MessageKey = active ? 'class.node.now' : node.status === 'mastered' ? 'class.node.mastered' : node.status === 'completed' ? 'class.node.completed'
          : review ? 'class.node.toReview' : node.status === 'struggling' ? 'class.node.struggling' : 'class.node.next';
        return (
          <Press key={node.node_id} disabled={!rewatchable} onPress={() => { haptic.tap(); onRewatch(node); }} scaleTo={rewatchable ? 0.97 : 1}
            accessibilityLabel={rewatchable ? `${node.concept}, ${t('class.rewatch')}` : node.concept} testID={`node-${i}`}
            style={[tw('flex-row items-center gap-3 rounded-2xl border px-3 py-2.5'), { width: RAIL_ITEM },
              active ? { borderColor: COLORS['sky-300'], backgroundColor: COLORS['sky-50'], boxShadow: SHADOW.soft } : { borderColor: COLORS.line, backgroundColor: COLORS.surface }]}>
            <View style={[tw('h-8 w-8 items-center justify-center rounded-xl'),
              { backgroundColor: done ? COLORS.sage : review ? COLORS['marigold-100'] : active ? COLORS['sky-600'] : COLORS['paper-2'] }]}>
              {done ? <Check size={16} color={COLORS.white} /> : active ? <Pulse style={tw('h-2 w-2 rounded-full bg-white')} />
                : <Txt style={[tw('text-xs font-semibold'), { color: review ? COLORS['marigold-600'] : COLORS['ink-3'] }]}>{n(i + 1)}</Txt>}
            </View>
            <View style={tw('min-w-0 flex-1')}>
              <Txt numberOfLines={1} style={tw('text-sm font-medium text-ink')}>{node.concept}</Txt>
              <View style={tw('flex-row items-center gap-1')}>
                <Txt style={[tw('text-ink-3'), { fontSize: 11.2, lineHeight: 16 }]}>{t(label)}</Txt>
                {rewatchable && (
                  <>
                    <Txt style={[tw('text-ink-3'), { fontSize: 11.2, lineHeight: 16 }]}>·</Txt>
                    <Eye size={12} color={COLORS['ink-3']} />
                    <Txt style={[tw('text-ink-3'), { fontSize: 11.2, lineHeight: 16 }]}>{t('class.rewatch')}</Txt>
                  </>
                )}
              </View>
            </View>
          </Press>
        );
      })}
    </ScrollView>
  );
}

/* ── overlays over the stage ─────────────────────────────────────────── */

/** The tick that springs in when a lesson is finished. */
function DoneTick() {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withSpring(1, { stiffness: 200, damping: 12 })); }, [p]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + 0.4 * p.value }, { rotate: `${-20 * (1 - p.value)}deg` }] }));
  return <Animated.View style={[tw('h-24 w-24 items-center justify-center self-center rounded-full bg-sage'), style]}><Check size={48} color={COLORS.white} /></Animated.View>;
}

export function StageOverlay({ s, ctl, lessonId, onReload, minHeight }: {
  s: ClassroomState; ctl: ClassroomController; lessonId: string;
  /** start the classroom over from the server's state (the web reloads the page) */
  onReload: () => void;
  /** the stage's own height; a tall panel may grow past it */
  minHeight: number;
}) {
  const { t, n } = useI18n();
  const o = s.overlay;
  const [busy, setBusy] = useState<string | null>(null);
  if (!o) return null;

  // The action is saved on the server; the classroom then starts over from that state.
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); onReload(); } catch (e) { toast.error((e as Error).message); setBusy(null); }
  };

  const shell = (children: ReactNode, tone = 'rgba(251, 250, 246, 0.96)', center = true) => (
    <Reveal key={o.kind} y={0} duration={0.3} style={[tw('justify-center p-5'), { backgroundColor: tone, minHeight }]}>
      <Reveal y={14} duration={0.45} style={[tw('w-full self-center'), { maxWidth: 512 }, center ? tw('items-center') : null]}>
        <View testID={`overlay-${o.kind}`} style={center ? tw('items-center') : null}>{children}</View>
      </Reveal>
    </Reveal>
  );

  switch (o.kind) {
    case 'loading':
      return shell(<>
        <View style={tw('h-24 w-24 items-center justify-center')}>
          <Float><PlaneMark size={96} /></Float>
          <Spin duration={3000} style={[tw('absolute'), { width: 120, height: 120 }]}>
            <Svg width={120} height={120} viewBox="0 0 120 120"><Circle cx={60} cy={60} r={56} fill="none" stroke={COLORS['sky-200']} strokeWidth={2} strokeDasharray="4 10" /></Svg>
          </Spin>
        </View>
        {o.title ? <Txt style={tw('mt-6 text-center font-display text-3xl text-ink')}>{o.title}</Txt> : null}
        <View style={tw('mt-2')}><Shimmer style={tw('text-center text-sm')}>{t(o.bodyKey)}</Shimmer></View>
      </>);
    case 'text':
      return shell(<>
        <Badge tone="amber">{t('class.noVideo')}</Badge>
        <Txt style={tw('mt-3 font-display text-3xl text-ink')}>{o.title}</Txt>
        <Txt style={tw('mt-3 leading-relaxed text-ink-2')}>{o.body}</Txt>
      </>, undefined, false);
    case 'error':
      return shell(<>
        <Txt style={tw('text-center font-display text-3xl text-ink')}>{t(o.titleKey)}</Txt>
        <Txt style={tw('mt-2 text-center text-ink-2')}>{o.body}</Txt>
        <View style={tw('mt-6 flex-row flex-wrap justify-center gap-3')}>
          <Button variant="outline" onPress={onReload} icon={RefreshCw} testID="reload">{t('class.reload')}</Button>
          <Button href="/new" replace>{t('class.goNew')}</Button>
        </View>
      </>);
    case 'elsewhere':
      return shell(<>
        <Txt style={tw('text-center font-display text-3xl')}>{t('class.otherTab')}</Txt>
        <Txt style={tw('mt-2 text-center text-ink-2')}>{t('class.otherTabBody')}</Txt>
        <Button style={[tw('mt-6'), { alignSelf: 'center' }]} onPress={onReload} testID="reload">{t('class.reload')}</Button>
      </>);
    case 'offline':
      return shell(<>
        <Txt style={tw('text-center font-display text-3xl')}>{t('class.cantReach')}</Txt>
        <Txt style={tw('mt-2 text-center text-ink-2')}>{t('class.cantReachBody')}</Txt>
        <Button style={[tw('mt-6'), { alignSelf: 'center' }]} onPress={onReload} testID="reload">{t('class.reload')}</Button>
      </>);
    case 'complete':
      return shell(<>
        <DoneTick />
        <Txt style={tw('mt-6 text-center font-display text-4xl')}>{t('class.completeTitle')}</Txt>
        <Txt style={tw('mt-2 text-center text-ink-2')}>{t('class.completeBody', { n: n(Math.round(o.score)) })}</Txt>
      </>);
    case 'paused':
      return shell(<View testID="paused-panel">
        <View style={tw('h-14 w-14 items-center justify-center rounded-2xl bg-amber')}><Hand size={28} color={COLORS.white} /></View>
        <Txt style={tw('mt-4 font-display text-4xl text-ink')}>{t('class.pausedTitle')}</Txt>
        <Txt style={tw('mt-2 text-ink-2')}>{t('class.pausedBody', { c: o.concept })}</Txt>
        <View style={tw('mt-6 gap-3')}>
          <Button block onPress={() => void run('continue', () => ctl.act('continue'))} status={busy === 'continue' ? 'loading' : 'idle'} disabled={!!busy} icon={Play} testID="continue-lesson">
            {t('class.continueAgain')}
          </Button>
          <Button block variant="outline" href={`/review/${lessonId}`}>{t('class.practise')}</Button>
        </View>
        <SlideToConfirm style={tw('mt-3')} label={t('class.slideSkip')} disabled={!!busy}
          onConfirm={() => run('skip', async () => { await ctl.act('skip'); toast.success(t('class.skipped')); })} />
      </View>, 'rgba(251, 240, 217, 0.92)', false);
    case 'review': {
      const next = o.concepts[0];
      return shell(<View testID="review-panel">
        <View style={tw('h-14 w-14 items-center justify-center rounded-2xl bg-marigold-600')}><RefreshCw size={28} color={COLORS.white} /></View>
        <Txt style={tw('mt-4 font-display text-4xl text-ink')}>{t('class.reviewTitle', { n: n(o.concepts.length) })}</Txt>
        <Txt style={tw('mt-2 text-ink-2')}>{t('class.reviewBody', { list: o.concepts.map((c) => c.concept).join(', ') })}</Txt>
        <View style={tw('mt-6 gap-3')}>
          {next && <Button block onPress={() => void run('relearn', () => ctl.act('relearn', next.node_id))} status={busy ? 'loading' : 'idle'} testID="relearn-next">{t('class.reviewNext', { c: next.concept })}</Button>}
          <Button block variant="outline" href={`/review/${lessonId}`}>{t('class.practise')}</Button>
        </View>
      </View>, 'rgba(255, 249, 232, 0.94)', false);
    }
  }
}

/* ── rewatch dialog ──────────────────────────────────────────────────── */

export function RewatchDialog({ node, onClose }: { node: NodeView | null; onClose: () => void }) {
  const { t } = useI18n();
  // Keeps the last node on screen while the dialog animates away.
  const [shown, setShown] = useState<NodeView | null>(node);
  useEffect(() => { if (node) setShown(node); }, [node]);
  const current = node ?? shown;
  return (
    <Dialog open={!!node} onClose={onClose} tint={0.45} maxWidth={896} style={{ padding: 0, borderRadius: 28, borderWidth: 0 }}>
      {current && (
        <View style={[tw('overflow-hidden'), { borderRadius: 28 }]} accessibilityLabel={t('class.rewatching', { c: current.concept })}>
          <View style={tw('flex-row items-center justify-between gap-3 px-5 py-3')}>
            <Txt numberOfLines={1} style={tw('flex-1 font-medium')}>{t('class.rewatching', { c: current.concept })}</Txt>
            <Press onPress={onClose} accessibilityLabel={t('class.backToLesson')} style={tw('h-9 w-9 items-center justify-center rounded-xl')} activeStyle={{ backgroundColor: COLORS['paper-2'] }} testID="rewatch-close">
              <X size={20} color={COLORS.ink} />
            </Press>
          </View>
          {node?.video_url
            ? <MediaVideo url={node.video_url} style={tw('aspect-video w-full')} onError={(e) => { toast.error(e.message); onClose(); }} />
            : <View style={tw('aspect-video w-full bg-ink')} />}
          <View style={tw('gap-3 px-5 py-3')}>
            <Txt style={tw('text-xs text-ink-3')}>{t('class.rewatchNote')}</Txt>
            <Button size="sm" onPress={onClose} style={{ alignSelf: 'flex-end' }}>{t('class.backToLesson')}</Button>
          </View>
        </View>
      )}
    </Dialog>
  );
}
