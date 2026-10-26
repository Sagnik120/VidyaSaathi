import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Hand, Loader2, RefreshCw, Sparkles, Wifi, WifiOff } from 'lucide-react-native';
import type { MessageKey } from '@/core/i18n';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import type { ClassroomState, Connection, NodeView, VideoPort } from '@/features/classroom/controller';
import { ConceptRail, RewatchDialog, StageOverlay, StudyPanel } from '@/features/classroom/panels';
import { QuestionCard } from '@/features/classroom/question-card';
import { useClassroom } from '@/features/classroom/use-classroom';
import { PlaneMark } from '@/components/brand/logo';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { PathChip } from '@/components/lesson/path-progress';
import { LessonVideo } from '@/components/lesson/video';
import { Float, ProgressBar, Pulse, Reveal, Spin } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

const KEEP_AWAKE = 'shikshak-classroom';

type Tone = { bg: string; fg: string };
const SAGE: Tone = { bg: COLORS['sage-100'], fg: COLORS.sage };
const AMBER: Tone = { bg: COLORS['amber-100'], fg: COLORS.amber };
const ROSE: Tone = { bg: COLORS['rose-100'], fg: COLORS.rose };

const CONN: Record<Connection, { key: MessageKey; tone: Tone; icon: 'spin' | 'dot' | 'wifi' | 'off' | 'hand' | 'spark' }> = {
  connecting: { key: 'class.status.connecting', tone: { bg: COLORS['paper-2'], fg: COLORS['ink-2'] }, icon: 'spin' },
  live: { key: 'class.live', tone: SAGE, icon: 'dot' },
  reconnecting: { key: 'class.reconnecting', tone: AMBER, icon: 'wifi' },
  offline: { key: 'class.offline', tone: ROSE, icon: 'off' },
  paused: { key: 'class.paused', tone: AMBER, icon: 'hand' },
  unavailable: { key: 'class.status.unavailable', tone: ROSE, icon: 'off' },
  elsewhere: { key: 'class.status.elsewhere', tone: ROSE, icon: 'off' },
  done: { key: 'class.status.done', tone: SAGE, icon: 'spark' },
};

export default function ClassroomPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // Bumping this starts the classroom over from the server's state (the web's page reload).
  const [session, setSession] = useState(0);
  const reload = useCallback(() => setSession((n) => n + 1), []);
  const { ctl, state: s } = useClassroom(id, session);
  const [port, setPort] = useState<VideoPort | null>(null);
  const [rewatch, setRewatch] = useState<NodeView | null>(null);
  const [columnWidth, setColumnWidth] = useState(0);
  const [topBar, setTopBar] = useState(64);
  const screen = useWindowDimensions();

  useEffect(() => { ctl?.attachVideo(port); }, [ctl, port]);

  // A lesson is watched, not touched: don't let the screen sleep mid-explanation.
  useEffect(() => {
    void activateKeepAwakeAsync(KEEP_AWAKE).catch(() => {});
    return () => { void deactivateKeepAwake(KEEP_AWAKE).catch(() => {}); };
  }, []);

  // Controller toasts (translated here, so they follow the language).
  const toastId = s?.toast?.id;
  useEffect(() => {
    if (!s?.toast) return;
    const msg = s.toast.raw && s.toast.key === 'common.error' ? s.toast.raw : t(s.toast.key);
    (s.toast.tone === 'error' ? toast.error : s.toast.tone === 'success' ? toast.success : s.toast.tone === 'warning' ? toast.warning : toast.info)(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId]);

  const openRewatch = useCallback((n: NodeView) => { ctl?.beginRewatch(); setRewatch(n); }, [ctl]);
  const closeRewatch = useCallback(() => { setRewatch(null); ctl?.endRewatch(); }, [ctl]);

  const onTime = useCallback(() => ctl?.videoTime(), [ctl]);
  const onPlay = useCallback(() => ctl?.videoPlay(), [ctl]);
  const onEnded = useCallback(() => ctl?.videoEnded(), [ctl]);
  const onFailed = useCallback(() => ctl?.videoFailed(), [ctl]);

  // Side by side once there is room for a real notes column (tablets, phones on their side).
  const wide = screen.width >= 900 || (screen.width > screen.height && screen.width >= 640);
  const notesWidth = wide ? Math.min(440, Math.max(300, screen.width * 0.36)) : 0;
  // The whole picture always shows: 16:9 within the column, and never taller than the screen can hold.
  const room = screen.height - topBar - insets.bottom - (wide ? 24 : 120);
  const fitWidth = Math.min(columnWidth || screen.width - 24, (Math.max(room, 160) * 16) / 9);
  const stageWidth = Math.floor(fitWidth);
  const stageHeight = Math.floor((stageWidth * 9) / 16);
  const asking = !!s?.question && !s.overlay;

  const stage = (
    <View style={[tw('self-center rounded-[26px]'), { width: stageWidth, backgroundColor: '#1d2a44', boxShadow: SHADOW.lift }]}>
      <View style={[tw('overflow-hidden rounded-[26px]'), { minHeight: stageHeight }]}>
        <View style={[tw('absolute inset-x-0 top-0'), { height: stageHeight }]}>
          <LessonVideo key={session} testID="lesson-video" onPort={setPort} onTime={onTime} onPlay={onPlay} onEnded={onEnded} onFailed={onFailed}
            controls={!!s && !s.stopped && s.videoVisible && !asking}
            style={[tw('h-full w-full'), { backgroundColor: COLORS.black, opacity: s?.videoVisible ? 1 : 0 }]} />
          {/* the paused lesson dims behind its question */}
          {asking && <View style={[tw('absolute inset-0'), { backgroundColor: 'rgba(0, 0, 0, 0.35)', pointerEvents: 'none' }]} />}
          {(!s || (!s.videoVisible && !s.overlay)) && (
            <View style={[tw('absolute inset-0 items-center justify-center'), { pointerEvents: 'none' }]}><Float style={{ opacity: 0.8 }}><PlaneMark size={Math.min(80, stageHeight * 0.4)} /></Float></View>
          )}
          {/* adaptation pill */}
          {s?.adaptation && !s.overlay && (
            <View style={[tw('absolute inset-x-0 top-4 items-center'), { pointerEvents: 'none' }]}>
              <Reveal key={`${s.adaptation.action}-${s.adaptation.slow}`} y={-20} duration={0.35}
                style={[tw('flex-row items-center gap-2 rounded-full px-4 py-2'), { backgroundColor: 'rgba(255,255,255,0.96)', boxShadow: SHADOW.lift, maxWidth: '92%' }]}>
                {s.adaptation.action === 'HUMAN' ? <Hand size={16} color={COLORS.amber} /> : <Spin duration={2000}><RefreshCw size={16} color={COLORS['sky-600']} /></Spin>}
                <Txt numberOfLines={2} testID="adaptation" style={tw('shrink text-sm text-ink')}>
                  {t(s.adaptation.slow ? 'class.stillWorking' : s.adaptation.action === 'MODIFY' ? 'class.modify' : s.adaptation.action === 'REGENERATE' ? 'class.regenerate' : 'class.mentorNotified')}
                </Txt>
              </Reveal>
            </View>
          )}
        </View>
        {s?.overlay && ctl && <StageOverlay s={s} ctl={ctl} lessonId={id} onReload={reload} minHeight={stageHeight} />}
      </View>
    </View>
  );
  const notes = s && <Reveal x={16} y={0} delay={0.1} duration={0.5}><StudyPanel s={s} lessonId={id} /></Reveal>;
  const scrollProps = { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' as const };

  return (
    <View style={tw('flex-1 bg-paper')}>
      {/* top bar */}
      <View onLayout={(e) => setTopBar(e.nativeEvent.layout.height)}
        style={[tw('flex-row items-center gap-3 border-b border-line bg-paper pb-2.5'), { paddingTop: insets.top + 10, paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right) }]}>
        <Press onPress={() => router.replace('/dashboard')} accessibilityLabel={t('class.leave')} testID="leave-lesson"
          style={tw('h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface')} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
          <ArrowLeft size={16} color={COLORS['ink-2']} />
        </Press>
        <View style={tw('min-w-0 flex-1')}>
          <Txt numberOfLines={1} testID="lesson-title" style={tw('font-display text-xl leading-tight text-ink')}>{s?.title || '…'}</Txt>
          <Txt numberOfLines={1} testID="lesson-status" style={tw('text-xs text-ink-3')}>{s?.statusKey ? t(s.statusKey) : ''}</Txt>
        </View>
        <LanguageToggle style={{ alignSelf: 'center' }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw('flex-1')}>
        {wide ? (
          <View style={[tw('flex-1 flex-row gap-3 pl-3'), { paddingLeft: Math.max(12, insets.left), paddingRight: Math.max(12, insets.right) }]}>
            <ScrollView {...scrollProps} style={tw('flex-1')} contentContainerStyle={[tw('gap-3 py-3'), { paddingBottom: insets.bottom + (asking ? 300 : 24) }]}>
              <View onLayout={(e) => setColumnWidth(Math.round(e.nativeEvent.layout.width))} style={tw('gap-3')}>
                {stage}
                {s && <Meta s={s} lessonId={id} />}
                {s && <ConceptRail s={s} onRewatch={openRewatch} />}
              </View>
            </ScrollView>
            <ScrollView {...scrollProps} style={{ width: notesWidth, flexGrow: 0 }} contentContainerStyle={[tw('py-3'), { paddingBottom: insets.bottom + 24 }]}>
              {notes}
            </ScrollView>
          </View>
        ) : (
          <ScrollView {...scrollProps} contentContainerStyle={[tw('gap-3 p-3'), { paddingLeft: Math.max(12, insets.left), paddingRight: Math.max(12, insets.right), paddingBottom: insets.bottom + 24 }]}>
            <View onLayout={(e) => setColumnWidth(Math.round(e.nativeEvent.layout.width))}>{stage}</View>
            {s && <Meta s={s} lessonId={id} />}
            {s && <ConceptRail s={s} onRewatch={openRewatch} />}
            {notes}
            {/* room for the question card, so the notes behind it can still be scrolled into view */}
            {asking && <View style={{ height: 280 }} />}
          </ScrollView>
        )}

        {/* the checkpoint rises over the lesson from the bottom edge */}
        {asking && ctl && s?.question && (
          <View style={[tw('absolute bottom-0 left-0 items-center p-3'), { right: wide ? notesWidth + 12 : 0, paddingBottom: Math.max(insets.bottom, 12), pointerEvents: 'box-none' }]}>
            <QuestionCard q={s.question} grading={s.grading} feedback={s.feedbackFor === s.question.interaction_id ? s.feedback : null}
              onSubmit={(a) => ctl.submit(a)} checks={s.checkpoints} />
          </View>
        )}
      </KeyboardAvoidingView>

      <RewatchDialog node={rewatch} onClose={closeRewatch} />
    </View>
  );
}

/** Connection, live difficulty, progress and the route this lesson belongs to. */
function Meta({ s, lessonId }: { s: ClassroomState; lessonId: string }) {
  const { t, n } = useI18n();
  const conn = CONN[s.connection];
  const icon =
    conn.icon === 'spin' ? <Spin><Loader2 size={12} color={conn.tone.fg} /></Spin> :
    conn.icon === 'dot' ? <Pulse style={[tw('h-1.5 w-1.5 rounded-full'), { backgroundColor: conn.tone.fg }]} /> :
    conn.icon === 'wifi' ? <Wifi size={12} color={conn.tone.fg} /> :
    conn.icon === 'hand' ? <Hand size={12} color={conn.tone.fg} /> :
    conn.icon === 'spark' ? <Sparkles size={12} color={conn.tone.fg} /> : <WifiOff size={12} color={conn.tone.fg} />;
  return (
    <View style={tw('gap-2 px-1')}>
      <View style={tw('flex-row items-center gap-2')}>
        <View style={[tw('flex-row items-center gap-1.5 rounded-full px-2.5 py-1'), { backgroundColor: conn.tone.bg }]}>
          {icon}
          <Txt testID="connection" style={[tw('text-xs font-semibold'), { color: conn.tone.fg }]}>{t(conn.key)}</Txt>
        </View>
        {s.difficulty != null && <DifficultyMeter level={s.difficulty} />}
        <View style={tw('min-w-0 flex-1 flex-row items-center gap-2')} accessibilityLabel="progress">
          <ProgressBar value={s.progress.pct} color={COLORS['sky-600']} height={6} duration={0.6} style={tw('flex-1')} />
          <Txt testID="progress-label" style={[tw('text-xs text-ink-3'), { fontVariant: ['tabular-nums'] }]}>{n(s.progress.done)}/{n(s.progress.total)}</Txt>
        </View>
      </View>
      <PathChip lessonId={lessonId} />
    </View>
  );
}

function LevelDot({ on, current }: { on: boolean; current: boolean }) {
  const p = useSharedValue(1);
  useEffect(() => {
    if (current) p.set(withSequence(withTiming(1.6, { duration: 250 }), withTiming(1, { duration: 250 })));
  }, [current, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: p.value }] }));
  return <Animated.View style={[tw('h-1.5 w-1.5 rounded-full'), { backgroundColor: on ? COLORS['sky-500'] : COLORS['line-2'] }, style]} />;
}

/* Live difficulty: five dots, filled up to the current level. */
function DifficultyMeter({ level }: { level: number }) {
  const { t, n } = useI18n();
  return (
    <View style={tw('flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1')} accessibilityLabel={t('class.level', { n: n(level) })} testID="difficulty">
      {[1, 2, 3, 4, 5].map((i) => <LevelDot key={i} on={i <= level} current={i === level} />)}
      <Txt style={tw('text-xs text-ink-3')}>{t('class.level', { n: n(level) })}</Txt>
    </View>
  );
}
