/** The welcome page's story, section by section — the website's landing narrative, on a phone. */
import { useEffect, useState, type ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowRight, BookOpen, Brain, CheckCheck, Clapperboard, FileSearch, Film, Hand, Layers, ListChecks,
  Mail, PauseCircle, RefreshCw, ShieldCheck, Sparkles, Wand2, Wifi,
} from 'lucide-react-native';
import { translate, type MessageKey } from '@/core/i18n';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { PlaneMark } from '@/components/brand/logo';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { CountUp, EASE_OUT, Ping, Reveal, Stagger, StaggerItem, useInView, useShake } from '@/components/motion';
import { Button, type IconType } from '@/components/ui/button';
import { Dots, Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { StorySection, useSectionProgress } from './story-scroll';

type Placed = { onPlace?: (y: number, height: number) => void };

function Kicker({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Txt style={[tw('font-hand text-xl text-sky-700'), style]}>{children}</Txt>;
}
function Title({ children }: { children: ReactNode }) {
  return <Txt accessibilityRole="header" style={[tw('mt-2 font-display text-ink'), { fontSize: 35.2, lineHeight: 38, letterSpacing: -0.35 }]}>{children}</Txt>;
}

/* ── 1. The problem: forty seats, one quiet student ─────────────────────── */

const LOST = 27;

function Classroom() {
  const { t, n } = useI18n();
  // 0 as the room scrolls in, 1 once it has been read past.
  const progress = useSectionProgress(1, 0.35);
  const lost = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(interpolate(progress.value, [0.36, 0.5], [0, 1], 'clamp'), [0, 1], ['#dfeaf9', '#e5917f']) }));
  const seen = useAnimatedStyle(() => {
    const on = interpolate(progress.value, [0.62, 0.76], [0, 1], 'clamp');
    return { opacity: on, transform: [{ scale: 2.4 - 1.4 * on }] };
  });
  const halo = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.62, 0.76], [0, 1], 'clamp') }));

  return (
    <View style={[tw('rounded-[28px] border border-line bg-surface p-6'), { boxShadow: SHADOW.soft }]} testID="classroom">
      <View style={[tw('mb-5 h-2 w-1/2 rounded-full'), { backgroundColor: 'rgba(42, 58, 92, 0.85)' }]} accessibilityLabel="board" />
      <View style={[tw('flex-row flex-wrap'), { marginHorizontal: -6 }]}>
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={{ width: '12.5%', padding: 6 }}>
            <View style={tw('aspect-square items-center justify-center')}>
              {i === LOST ? (
                <>
                  <Animated.View style={[tw('h-full w-full rounded-full'), { borderWidth: 2, borderColor: COLORS['line-2'] }, lost]} />
                  <Animated.View style={[tw('absolute rounded-full'), { top: -8, right: -8, bottom: -8, left: -8, borderWidth: 2, borderColor: COLORS['sky-600'] }, seen]} />
                  <Animated.View style={[tw('absolute'), { top: -8, right: -8, bottom: -8, left: -8 }, halo]}><Ping color="rgba(156, 188, 232, 0.5)" /></Animated.View>
                </>
              ) : (
                <Reveal y={0} scale={0} duration={0.35} delay={(i % 8) * 0.03 + Math.floor(i / 8) * 0.05} style={tw('h-full w-full rounded-full bg-sky-100')} />
              )}
            </View>
          </View>
        ))}
      </View>
      <View style={[tw('mt-8 flex-row gap-4 border-dashed pt-6'), { borderTopWidth: 1, borderColor: COLORS['line-2'] }]}>
        {([[40, '', 'problem.stat1'], [70, '%', 'problem.stat2'], [90, '', 'problem.stat3']] as const).map(([v, s, k]) => (
          <View key={k} style={tw('flex-1 items-center')}>
            <CountUp to={v} suffix={s} format={(x) => n(x)} style={tw('font-display text-4xl text-ink')} />
            <Txt style={[tw('mt-1 text-center text-xs text-ink-3'), { lineHeight: 16 }]}>{t(k)}</Txt>
          </View>
        ))}
      </View>
      <Txt style={[tw('mt-4 text-center text-ink-3'), { fontSize: 11.2, lineHeight: 16 }]}>{t('problem.note')}</Txt>
    </View>
  );
}

/** The line under the story that changes as the room is read: "…" → lost → noticed. */
function Verdict() {
  const { t } = useI18n();
  const progress = useSectionProgress(1, 0.35);
  const [stage, setStage] = useState(0);
  useAnimatedReaction(() => (progress.value < 0.42 ? 0 : progress.value < 0.7 ? 1 : 2), (now, before) => { if (now !== before) scheduleOnRN(setStage, now); });
  return (
    <View style={[tw('mt-6'), { minHeight: 76 }]}>
      <Reveal key={stage} y={10} duration={0.4}>
        <Txt testID="verdict-line" style={[tw('font-display text-3xl'), { color: stage === 2 ? COLORS['sky-700'] : stage === 1 ? COLORS.margin : COLORS['ink-3'] }]}>
          {stage === 0 ? '…' : stage === 1 ? t('landing.lost') : t('landing.seen')}
        </Txt>
        {stage === 1 && <Txt style={tw('text-lg text-ink-3')}>{t('landing.lostSub')}</Txt>}
      </Reveal>
    </View>
  );
}

export function Problem({ onPlace }: Placed) {
  const { t } = useI18n();
  return (
    <StorySection onPlace={onPlace} style={tw('bg-paper px-5 py-24')}>
      <Kicker>{t('problem.kicker')}</Kicker>
      <Title>{t('problem.title')}</Title>
      <Txt style={tw('mt-5 text-lg leading-relaxed text-ink-2')}>{t('problem.body')}</Txt>
      <Verdict />
      <View style={tw('mt-6')}><Classroom /></View>
    </StorySection>
  );
}

/* ── 2. The loop: eight steps ───────────────────────────────────────────── */

const STEPS: Array<{ k: MessageKey; d: MessageKey; icon: IconType; tint: string }> = [
  { k: 'loop.s1', d: 'loop.s1d', icon: FileSearch, tint: COLORS['sky-50'] },
  { k: 'loop.s2', d: 'loop.s2d', icon: ListChecks, tint: COLORS['marigold-50'] },
  { k: 'loop.s3', d: 'loop.s3d', icon: Wand2, tint: COLORS['sage-100'] },
  { k: 'loop.s4', d: 'loop.s4d', icon: Clapperboard, tint: COLORS['sky-50'] },
  { k: 'loop.s5', d: 'loop.s5d', icon: PauseCircle, tint: COLORS['marigold-100'] },
  { k: 'loop.s6', d: 'loop.s6d', icon: CheckCheck, tint: COLORS['sage-100'] },
  { k: 'loop.s7', d: 'loop.s7d', icon: RefreshCw, tint: COLORS['margin-100'] },
  { k: 'loop.s8', d: 'loop.s8d', icon: Hand, tint: COLORS['amber-100'] },
];

function StepCard({ i, s }: { i: number; s: (typeof STEPS)[number] }) {
  const { t, n } = useI18n();
  return (
    <View style={[tw('rounded-[26px] border border-line bg-surface'), { boxShadow: SHADOW.soft }]}>
      <Ruled margin={false} style={[tw('overflow-hidden p-6'), { borderRadius: 25 }]}>
        <View style={tw('flex-row items-start justify-between')}>
          <View style={[tw('h-12 w-12 items-center justify-center rounded-2xl'), { backgroundColor: s.tint }]}><s.icon size={24} color={COLORS['sky-700']} /></View>
          <Txt style={[tw('font-display text-6xl text-line-2'), { lineHeight: 62 }]}>{n(String(i + 1).padStart(2, '0'))}</Txt>
        </View>
        <Txt style={[tw('pt-10 text-xs uppercase text-ink-3'), { letterSpacing: 1.2 }]}>{t('landing.step')} {n(i + 1)}</Txt>
        <Txt style={tw('mt-1 font-display text-3xl text-ink')}>{t(s.k)}</Txt>
        <Txt style={tw('mt-2 text-ink-2')}>{t(s.d)}</Txt>
      </Ruled>
    </View>
  );
}

export function Loop({ onPlace }: Placed) {
  const { t } = useI18n();
  return (
    <StorySection onPlace={onPlace} style={tw('bg-paper-2')}>
      <Dots />
      <View style={tw('px-5 pt-24')}>
        <Kicker>{t('loop.kicker')}</Kicker>
        <Title>{t('loop.title')}</Title>
        <Txt style={tw('mt-4 text-ink-2')}>{t('loop.sub')}</Txt>
      </View>
      {/* each card reveals as it is reached, so the steps are read in order */}
      {STEPS.map((s, i) => (
        <StorySection key={s.k} style={[tw('px-5'), { marginTop: i ? 16 : 32 }]}><Reveal y={14} duration={0.55}><StepCard i={i} s={s} /></Reveal></StorySection>
      ))}
      <View style={tw('h-20')} />
    </StorySection>
  );
}

/* ── 3. The visitor's own checkpoint ────────────────────────────────────── */

function CheckOption({ label, chosen, right, onPress, testID }: { label: string; chosen: boolean; right: boolean; onPress: () => void; testID?: string }) {
  const [shakeStyle, shake] = useShake(8);
  useEffect(() => { if (chosen && !right) shake(); }, [chosen, right, shake]);
  return (
    <Animated.View style={shakeStyle}>
      <Press onPress={onPress} scaleTo={0.98} testID={testID}
        style={[tw('rounded-2xl border bg-surface px-5 py-4'),
          chosen ? (right ? { borderColor: COLORS.sage, backgroundColor: COLORS['sage-100'] } : { borderColor: color('rose', 0.5), backgroundColor: 'rgba(248, 226, 226, 0.5)' }) : { borderColor: COLORS.line }]}
        activeStyle={chosen ? null : { borderColor: COLORS['sky-300'] }}>
        <Txt style={tw('text-ink')}>{label}</Txt>
      </Press>
    </Animated.View>
  );
}

export function VisitorCheck() {
  const { t } = useI18n();
  const [pick, setPick] = useState<string | null>(null);
  const opts: Array<[string, MessageKey]> = [['a1', 'visitorCheck.a1'], ['a2', 'visitorCheck.a2'], ['a3', 'visitorCheck.a3']];
  const right = pick === 'a2';
  return (
    <StorySection style={tw('bg-paper px-5 py-28')}>
      <Reveal>
        <View style={[tw('rounded-[30px] border-dashed bg-marigold-50 p-7'), { borderWidth: 2, borderColor: COLORS['marigold-400'] }]}>
          <View style={[tw('absolute left-8 h-10 w-10 items-center justify-center rounded-full bg-marigold'), { top: -20, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }]}><PauseCircle size={20} color={COLORS.ink} /></View>
          <Kicker style={tw('text-marigold-600')}>{t('visitorCheck.kicker')}</Kicker>
          <Txt style={tw('mt-2 font-display text-3xl leading-tight text-ink')}>{t('visitorCheck.q')}</Txt>
          <View style={tw('mt-6 gap-3')}>
            {opts.map(([id, key]) => (
              <CheckOption key={id} label={t(key)} chosen={pick === id} right={id === 'a2'} testID={`visitor-${id}`}
                onPress={() => { if (id === 'a2') haptic.success(); else haptic.warning(); setPick(id); }} />
            ))}
          </View>
          {pick && (
            <Reveal key={String(right)} y={8} duration={0.3} style={tw('mt-5 flex-row items-start gap-2')}>
              <View style={{ marginTop: 2 }}>{right ? <Sparkles size={20} color={COLORS.sage} /> : <RefreshCw size={20} color={COLORS.rose} />}</View>
              <Txt testID="visitor-result" style={[tw('flex-1 font-medium'), { color: right ? COLORS.sage : COLORS.rose }]}>{right ? t('visitorCheck.right') : t('visitorCheck.wrong')}</Txt>
            </Reveal>
          )}
        </View>
      </Reveal>
    </StorySection>
  );
}

/* ── 4. The adaptation ladder ───────────────────────────────────────────── */

function LadderRail() {
  const progress = useSectionProgress(0.75, 0.55);
  const fill = useAnimatedStyle(() => ({ height: `${progress.value * 100}%` }));
  return (
    <View style={[tw('absolute rounded-full bg-line'), { left: 22, top: 24, bottom: 24, width: 3, overflow: 'hidden' }]}>
      <Animated.View style={[{ width: 3, overflow: 'hidden' }, fill]}>
        <LinearGradient colors={[COLORS['sky-600'], COLORS['marigold-400'], COLORS.margin]} style={{ width: 3, height: 600 }} />
      </Animated.View>
    </View>
  );
}

export function Ladder({ onPlace }: Placed) {
  const { t } = useI18n();
  const rungs: Array<{ k: MessageKey; d: MessageKey; icon: IconType; tone: string }> = [
    { k: 'ladder.r1', d: 'ladder.r1d', icon: RefreshCw, tone: COLORS['sky-600'] },
    { k: 'ladder.r2', d: 'ladder.r2d', icon: Film, tone: COLORS['marigold-600'] },
    { k: 'ladder.r3', d: 'ladder.r3d', icon: Hand, tone: COLORS.margin },
  ];
  return (
    <StorySection onPlace={onPlace} style={tw('bg-paper px-5 py-28')}>
      <Kicker>{t('ladder.kicker')}</Kicker>
      <Title>{t('ladder.title')}</Title>
      <StorySection style={tw('mt-14 pl-14')}>
        <LadderRail />
        {rungs.map((r, i) => (
          <Reveal key={r.k} delay={i * 0.05} style={i < rungs.length - 1 ? tw('mb-6') : null}>
            {/* each rung's marker stands on the rail, ringed in paper */}
            <View style={[tw('absolute rounded-full bg-paper'), { left: -60, top: 16, padding: 4 }]}>
              <View style={[tw('h-11 w-11 items-center justify-center rounded-full'), { backgroundColor: r.tone, boxShadow: SHADOW.soft }]}><r.icon size={20} color={COLORS.white} /></View>
            </View>
            <View style={[tw('rounded-[24px] border border-line bg-surface p-6'), { boxShadow: SHADOW.soft }]}>
              <Txt style={tw('font-display text-3xl text-ink')}>{t(r.k)}</Txt>
              <Txt style={tw('mt-1.5 text-ink-2')}>{t(r.d)}</Txt>
              {i === 2 && (
                <Reveal y={12} rotate={-1} delay={0.3} duration={0.6} style={tw('mt-5')}>
                  <View style={[tw('rounded-2xl border border-line bg-paper-2 p-4'), { transform: [{ rotate: '-1deg' }] }]}>
                    <View style={tw('flex-row items-center gap-2')}>
                      <Mail size={14} color={COLORS['ink-3']} />
                      <Txt style={tw('text-xs text-ink-3')}>{t('landing.mentorTo')}</Txt>
                    </View>
                    <Txt style={tw('mt-1.5 text-sm text-ink')}>{t('landing.mentorMail')}</Txt>
                    <Txt style={tw('mt-2 font-hand text-lg text-margin')}>— {t('landing.human')}</Txt>
                  </View>
                </Reveal>
              )}
            </View>
          </Reveal>
        ))}
      </StorySection>
    </StorySection>
  );
}

/* ── 5. Grounded in your own notes ──────────────────────────────────────── */

/** The marigold stroke that runs across the quoted line once the page is in view. */
function QuoteMark() {
  const go = useInView();
  const p = useSharedValue(0);
  useEffect(() => { if (go) p.set(withDelay(700, withTiming(1, { duration: 900, easing: EASE_OUT }))); }, [go, p]);
  const sweep = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return <Animated.View style={[tw('absolute rounded'), { left: -4, top: 0, bottom: 0, backgroundColor: color('marigold', 0.45) }, sweep]} />;
}

function Bars({ widths }: { widths: number[] }) {
  return <>{widths.map((w, i) => <View key={i} style={[tw('h-2.5 rounded bg-paper-3'), { marginTop: 13, width: `${w}%` }]} />)}</>;
}

export function Grounded({ onPlace }: Placed) {
  const { t } = useI18n();
  return (
    <StorySection onPlace={onPlace} style={tw('overflow-hidden bg-paper-2 px-5 py-28')}>
      <Kicker>{t('grounded.kicker')}</Kicker>
      <Title>{t('grounded.title')}</Title>
      <Txt style={tw('mt-5 text-lg leading-relaxed text-ink-2')}>{t('grounded.body')}</Txt>
      <StorySection style={tw('mt-14')}>
        {/* the uploaded chapter */}
        <Reveal y={30} rotate={1.5} duration={0.8}>
          <View style={[tw('border border-line bg-surface'), { borderRadius: 6, transform: [{ rotate: '1.5deg' }], boxShadow: SHADOW.lift }]} testID="chapter">
            <Ruled margin={false} style={[tw('overflow-hidden px-10 pb-12 pt-10'), { borderRadius: 5 }]}>
              <View style={[tw('absolute inset-y-0'), { left: 28, width: 1, backgroundColor: color('margin', 0.7) }]} />
              <Txt style={tw('font-display text-2xl text-ink')}>9.4 Gradient Descent</Txt>
              <Bars widths={[92, 78, 85]} />
              <View style={tw('mt-4')}>
                <QuoteMark />
                <Txt style={[tw('text-ink-2'), { fontSize: 15.2, lineHeight: 28 }]}>{t('grounded.quote')}</Txt>
              </View>
              <Bars widths={[88, 64]} />
            </Ruled>
          </View>
        </Reveal>
        {/* the citation it produces */}
        <Reveal x={40} y={10} delay={1.4} duration={0.6} style={[tw('absolute'), { left: -8, bottom: -24, maxWidth: '90%' }]}>
          <View style={[tw('flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3'), { boxShadow: SHADOW.lift }]}>
            <View style={tw('h-9 w-9 items-center justify-center rounded-xl bg-sky-50')}><BookOpen size={16} color={COLORS['sky-700']} /></View>
            <Txt style={tw('shrink text-sm text-ink-2')}>{t('grounded.source')}</Txt>
          </View>
        </Reveal>
      </StorySection>
    </StorySection>
  );
}

/* ── 6. Your language ───────────────────────────────────────────────────── */

export function Langs({ onPlace }: Placed) {
  const { t } = useI18n();
  const keys: MessageKey[] = ['demo.caption1', 'demo.caption2', 'demo.caption3'];
  return (
    <StorySection onPlace={onPlace} style={tw('bg-paper px-5 py-28')}>
      <Kicker>{t('langs.kicker')}</Kicker>
      <Title>{t('langs.title')}</Title>
      <Txt style={tw('mt-4 text-lg text-ink-2')}>{t('langs.body')}</Txt>
      <View style={[tw('mt-6 self-start'), { transform: [{ scale: 1.25 }], marginLeft: 12 }]}><LanguageToggle /></View>
      <Txt style={tw('mt-12 text-sm text-ink-3')}>{t('landing.sameLesson')}</Txt>
      <View style={tw('mt-3 gap-5')}>
        {(['en', 'hi'] as const).map((l, col) => (
          <Reveal key={l} delay={col * 0.12}>
            <View style={[tw('rounded-[26px] border border-line bg-surface p-6'), { boxShadow: SHADOW.soft }]}>
              <Txt style={tw('font-display text-4xl text-ink')}>{l === 'en' ? 'English' : 'हिन्दी'}</Txt>
              <View style={tw('mt-4 gap-3')}>
                {keys.map((k, i) => (
                  <View key={k} style={tw('flex-row gap-3')}>
                    <Txt style={tw('font-hand text-lg text-sky-600')}>{l === 'hi' ? '१२३'[i] : i + 1}</Txt>
                    <Txt style={tw('flex-1 text-ink-2')}>{translate(l, k)}</Txt>
                  </View>
                ))}
              </View>
            </View>
          </Reveal>
        ))}
      </View>
    </StorySection>
  );
}

/* ── 7. Numbers ─────────────────────────────────────────────────────────── */

export function Numbers() {
  const { t, n } = useI18n();
  const big = tw('font-display text-6xl text-ink');
  const items: Array<{ v: ReactNode; k: MessageKey }> = [
    { v: <Txt style={big}>{n(t('landing.n1v'))}</Txt>, k: 'numbers.n1' },
    { v: <CountUp to={2} format={(x) => n(x)} style={big} />, k: 'numbers.n2' },
    { v: <CountUp to={100} suffix="%" format={(x) => n(x)} style={big} />, k: 'numbers.n3' },
    { v: <CountUp to={2} format={(x) => n(x)} style={big} />, k: 'numbers.n4' },
  ];
  return (
    <StorySection style={tw('border-y border-line bg-surface px-5 py-16')}>
      <Kicker>{t('numbers.kicker')}</Kicker>
      <Stagger style={tw('mt-6 flex-row flex-wrap gap-y-8')}>
        {items.map((it) => (
          <StaggerItem key={it.k} style={{ width: '50%', paddingRight: 16 }}>
            {it.v}
            <Txt style={tw('mt-2 text-sm text-ink-2')}>{t(it.k)}</Txt>
          </StaggerItem>
        ))}
      </Stagger>
    </StorySection>
  );
}

/* ── 8. Under the hood ──────────────────────────────────────────────────── */

export function Hood({ onPlace }: Placed) {
  const { t } = useI18n();
  const cells: Array<{ k: MessageKey; d: MessageKey; icon: IconType }> = [
    { k: 'hood.b1', d: 'hood.b1d', icon: FileSearch },
    { k: 'hood.b2', d: 'hood.b2d', icon: PauseCircle },
    { k: 'hood.b3', d: 'hood.b3d', icon: Layers },
    { k: 'hood.b4', d: 'hood.b4d', icon: Clapperboard },
    { k: 'hood.b5', d: 'hood.b5d', icon: Wifi },
    { k: 'hood.b6', d: 'hood.b6d', icon: ShieldCheck },
  ];
  return (
    <StorySection onPlace={onPlace} style={tw('bg-paper-2 px-5 py-28')}>
      <Kicker>{t('hood.kicker')}</Kicker>
      <Title>{t('hood.title')}</Title>
      {cells.map((c, i) => (
        <StorySection key={c.k} style={{ marginTop: i ? 16 : 48 }}>
          <Reveal y={14} duration={0.55}>
            <Press scaleTo={0.985} style={tw('rounded-[26px] border border-line bg-surface p-6')} activeStyle={{ boxShadow: SHADOW.lift }}>
              {(pressed) => (
                <>
                  <View style={[tw('h-11 w-11 items-center justify-center rounded-2xl bg-sky-50'), pressed ? { transform: [{ rotate: '-8deg' }, { scale: 1.1 }] } : null]}><c.icon size={20} color={COLORS['sky-700']} /></View>
                  <Txt style={tw('mt-5 text-lg font-semibold text-ink')}>{t(c.k)}</Txt>
                  <Txt style={tw('mt-1.5 text-ink-2')}>{t(c.d)}</Txt>
                </>
              )}
            </Press>
          </Reveal>
        </StorySection>
      ))}
      <View style={tw('mt-6 flex-row items-center gap-2')}>
        <Brain size={16} color={COLORS['ink-3']} />
        <Txt style={tw('text-sm text-ink-3')}>Gemini · FastAPI · hybrid RAG · React Native</Txt>
      </View>
    </StorySection>
  );
}

/* ── 9. Final call: the page folds and flies ────────────────────────────── */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const FLIGHT = 'M-20 170 C 250 40, 420 210, 640 100 S 1000 10, 1220 60';
const FLIGHT_LEN = 1340;
// The same curve as two cubic segments, for placing the plane along it.
const SEGMENTS = [
  [[-20, 170], [250, 40], [420, 210], [640, 100]],
  [[640, 100], [860, -10], [1000, 10], [1220, 60]],
];

function Flight() {
  const { width } = useWindowDimensions();
  const progress = useSectionProgress(1, 1);
  const k = width / 1200;
  const draw = useAnimatedProps(() => ({ strokeDashoffset: FLIGHT_LEN * (1 - interpolate(progress.value, [0.1, 0.95], [0, 1], 'clamp')) }));
  const plane = useAnimatedStyle(() => {
    const u = interpolate(progress.value, [0.1, 0.95], [0, 1], 'clamp') * 2;
    const seg = SEGMENTS[u >= 1 ? 1 : 0];
    const s = u >= 1 ? Math.min(1, u - 1) : u;
    const a = 1 - s;
    const x = a * a * a * seg[0][0] + 3 * a * a * s * seg[1][0] + 3 * a * s * s * seg[2][0] + s * s * s * seg[3][0];
    const y = a * a * a * seg[0][1] + 3 * a * a * s * seg[1][1] + 3 * a * s * s * seg[2][1] + s * s * s * seg[3][1];
    const dx = 3 * a * a * (seg[1][0] - seg[0][0]) + 6 * a * s * (seg[2][0] - seg[1][0]) + 3 * s * s * (seg[3][0] - seg[2][0]);
    const dy = 3 * a * a * (seg[1][1] - seg[0][1]) + 6 * a * s * (seg[2][1] - seg[1][1]) + 3 * s * s * (seg[3][1] - seg[2][1]);
    return { transform: [{ translateX: x * k - 28 }, { translateY: y - 28 }, { rotate: `${(Math.atan2(dy, dx * k) * 180) / Math.PI + 20}deg` }] };
  });
  return (
    <View style={[tw('absolute inset-x-0'), { top: 40, height: 200, pointerEvents: 'none' }]}>
      <Svg width={width} height={200} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <Path d={FLIGHT} fill="none" stroke={COLORS['sky-100']} strokeWidth={2} strokeDasharray="5 9" />
        <AnimatedPath d={FLIGHT} fill="none" stroke={COLORS['sky-300']} strokeWidth={2} strokeDasharray={`${FLIGHT_LEN} ${FLIGHT_LEN}`} animatedProps={draw} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, plane]}><PlaneMark size={56} /></Animated.View>
    </View>
  );
}

export function Final() {
  const { t } = useI18n();
  return (
    <StorySection style={tw('bg-paper')}>
      {/* the flight path crosses the top of the page; the words start below it */}
      <Ruled style={[tw('overflow-hidden pb-16'), { paddingTop: 232 }]}>
        <Flight />
        <View style={tw('items-center px-5')}>
          <Reveal>
            <Txt accessibilityRole="header" style={[tw('text-center font-display text-ink'), { fontSize: 41.6, lineHeight: 44 }]}>{t('final.title')}</Txt>
          </Reveal>
          <Reveal delay={0.15} style={tw('mt-10 items-center gap-3')}>
            <Button href="/signup" size="lg" icon={ArrowRight} style={{ alignSelf: 'center' }} testID="final-start">{t('final.cta')}</Button>
            <Button href="/login" size="lg" variant="outline" style={{ alignSelf: 'center' }} testID="final-signin">{t('final.signin')}</Button>
          </Reveal>
        </View>
      </Ruled>
    </StorySection>
  );
}
