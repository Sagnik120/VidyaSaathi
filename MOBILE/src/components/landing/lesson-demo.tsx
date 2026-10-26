/**
 * The hero's live mini-lesson. It plays captions over a chalk-blue board,
 * then pauses on its own (॥) and asks the visitor. Wrong → it re-explains
 * differently and asks again. Right → it resumes. Exactly what the product does.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Check, Pause, Play, RotateCcw, X } from 'lucide-react-native';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { Pulse, Reveal, useShake } from '@/components/motion';
import { Dots } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Phase = 'playing' | 'asking' | 'wrong' | 'right';
const PAUSE_AT = 72;
const POINTS = [[60, 140], [85, 118], [110, 128], [135, 96], [160, 104], [185, 74], [210, 86], [235, 56], [260, 66], [285, 40]];
const OVERFIT = 'M60 140 C72 100 78 112 85 118 S102 150 110 128 S128 80 135 96 S154 122 160 104 S178 52 185 74 S204 108 210 86 S228 34 235 56 S254 88 260 66 S278 20 285 40';
const OVERFIT_LEN = 520;

/** The board's diagram: training points, a good fit (dashed, flowing while it plays) and an overfit curve that draws in. */
function Board({ paused, showOverfit }: { paused: boolean; showOverfit: boolean }) {
  const flow = useSharedValue(0);
  const draw = useSharedValue(0);
  useEffect(() => {
    if (paused) { cancelAnimation(flow); return; }
    flow.set(0);
    flow.set(withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(flow);
  }, [paused, flow]);
  useEffect(() => { draw.set(withTiming(showOverfit ? 1 : 0, { duration: 1200 })); }, [showOverfit, draw]);
  const fit = useAnimatedProps(() => ({ strokeDashoffset: -24 * (1 - flow.value) }));
  const curve = useAnimatedProps(() => ({ strokeDashoffset: OVERFIT_LEN * (1 - draw.value), opacity: draw.value > 0.01 ? 1 : 0 }));
  return (
    <Svg viewBox="0 0 320 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <Path d="M40 20 V160 H300" fill="none" stroke="#f5f1e6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      {POINTS.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={4} fill="#f0c35a" />)}
      <AnimatedPath d="M55 142 L290 42" fill="none" stroke="#f5f1e6" strokeWidth={2} strokeLinecap="round" strokeDasharray="6 6" opacity={0.8} animatedProps={fit} />
      <AnimatedPath d={OVERFIT} fill="none" stroke="#e5917f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${OVERFIT_LEN} ${OVERFIT_LEN}`} animatedProps={curve} />
    </Svg>
  );
}

function Option({ id, label, wrongPick, onPress }: { id: string; label: string; wrongPick: boolean; onPress: () => void }) {
  const [shakeStyle, shake] = useShake(6);
  useEffect(() => { if (wrongPick) shake(); }, [wrongPick, shake]);
  return (
    <Animated.View style={shakeStyle}>
      <Press onPress={onPress} disabled={wrongPick} scaleTo={0.985} testID={`demo-option-${id}`}
        style={[tw('flex-row items-center gap-3 rounded-xl border px-3 py-2'), wrongPick ? { borderColor: color('rose', 0.4), backgroundColor: 'rgba(248, 226, 226, 0.6)' } : { borderColor: COLORS.line }]}
        activeStyle={{ borderColor: COLORS['sky-300'], backgroundColor: COLORS['sky-50'] }}>
        <View style={[tw('h-6 w-6 items-center justify-center rounded-lg'), { backgroundColor: wrongPick ? COLORS.rose : COLORS['paper-2'] }]}>
          {wrongPick ? <X size={14} color={COLORS.white} /> : <Txt style={tw('text-xs font-semibold text-ink-2')}>{id}</Txt>}
        </View>
        <Txt style={[tw('flex-1 text-sm'), { color: wrongPick ? COLORS['ink-2'] : COLORS.ink }]}>{label}</Txt>
      </Press>
    </Animated.View>
  );
}

export function LessonDemo() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('playing');
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The tallest the question panel gets, measured once, so the card (and the page under it) never changes height.
  const [panelHeight, setPanelHeight] = useState(178);
  const raf = useRef(0);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'right') return;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setProgress((p) => {
        const next = p + dt / 90;
        if (phase === 'playing' && p < PAUSE_AT && next >= PAUSE_AT) { setPhase('asking'); return PAUSE_AT; }
        if (next >= 100) return 100;
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase]);

  const restart = useCallback(() => { setProgress(0); setPicked(null); setAttempt(0); setPhase('playing'); }, []);
  useEffect(() => {
    if (progress < 100) return;
    const id = setTimeout(restart, 1800);
    return () => clearTimeout(id);
  }, [progress, restart]);
  const answer = (id: string) => {
    setPicked(id);
    setAttempt((a) => a + 1);
    if (id === 'A') { haptic.success(); setPhase('right'); setProgress((p) => p + 0.5); }
    else { haptic.warning(); setPhase('wrong'); }
  };

  const captions = [t('demo.caption1'), t('demo.caption2'), t('demo.caption3')];
  const caption = captions[Math.min(2, Math.floor((progress / PAUSE_AT) * 3))];
  const paused = phase === 'asking' || phase === 'wrong';
  const opts = [['A', t('demo.optA')], ['B', t('demo.optB')], ['C', t('demo.optC')]] as const;
  const line = phase === 'wrong' ? t('demo.reexplain') : phase === 'right' ? t('demo.resumes') : caption;

  return (
    <View style={[tw('w-full rounded-[28px] border border-line bg-surface'), { boxShadow: SHADOW.lift }]} testID="lesson-demo">
      <View style={[tw('overflow-hidden'), { borderRadius: 27 }]}>
        {/* window bar */}
        <View style={tw('flex-row items-center justify-between border-b border-line px-4 py-2.5')}>
          <View style={tw('flex-row gap-1.5')}>
            {['#e5917f', '#f0c35a', '#9cbce8'].map((c) => <View key={c} style={[tw('h-2.5 w-2.5 rounded-full'), { backgroundColor: c }]} />)}
          </View>
          <Txt numberOfLines={1} style={tw('flex-1 px-3 text-center text-xs text-ink-3')}>{t('demo.label')}</Txt>
          <View style={[tw('flex-row items-center gap-1.5 rounded-full px-2 py-0.5'), { backgroundColor: paused ? COLORS['marigold-100'] : COLORS['sky-50'] }]}>
            {paused ? <View style={tw('h-1.5 w-1.5 rounded-full bg-marigold-600')} /> : <Pulse style={tw('h-1.5 w-1.5 rounded-full bg-sky-600')} />}
            <Txt testID="demo-state" style={{ fontSize: 10.9, lineHeight: 16, fontWeight: '600', color: paused ? COLORS['marigold-600'] : COLORS['sky-700'] }}>{paused ? t('demo.paused') : t('demo.playing')}</Txt>
          </View>
        </View>

        {/* the "video" board */}
        <View style={[tw('aspect-[16/10] w-full overflow-hidden'), { backgroundColor: '#2a3a5c' }]}>
          <Dots gap={14} color="#ffffff" opacity={0.08} />
          <View style={[tw('absolute inset-x-6 top-5'), { height: '62%' }]}><Board paused={paused} showOverfit={progress > 30} /></View>
          {/* caption */}
          <View style={[tw('absolute inset-x-4 bottom-4 items-center'), { pointerEvents: 'none' }]}>
            <Reveal key={line} y={6} duration={0.35} style={[tw('rounded-xl px-3 py-1.5'), { maxWidth: '92%', backgroundColor: 'rgba(0, 0, 0, 0.45)' }]}>
              <Txt style={[tw('text-center text-white'), { fontSize: 13.1, lineHeight: 19 }]}>{line}</Txt>
            </Reveal>
          </View>
          {/* the ॥ that appears when it pauses */}
          {paused && (
            <Reveal y={0} scale={0.4} duration={0.3} style={tw('absolute right-4 top-4 h-11 w-11 items-center justify-center rounded-full bg-marigold')}>
              <Pause size={20} color={COLORS.ink} fill={COLORS.ink} />
            </Reveal>
          )}
        </View>

        {/* progress with a checkpoint notch */}
        <View style={tw('mx-4 mt-3 h-1.5 rounded-full bg-paper-3')}>
          <View style={[tw('h-full rounded-full bg-sky-600'), { width: `${progress}%` }]} />
          <View style={[tw('absolute rounded-full bg-marigold'), { left: `${PAUSE_AT}%`, top: -4, marginLeft: -7, width: 14, height: 14, borderWidth: 2, borderColor: COLORS.surface, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)' }]} />
        </View>

        {/* the question panel */}
        <View style={[tw('px-4 pb-4 pt-3'), { height: panelHeight }]}>
          {/* an unseen copy of its fullest state, only there to be measured */}
          <View style={[tw('absolute inset-x-4 top-3'), { opacity: 0, pointerEvents: 'none' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
            onLayout={(e) => setPanelHeight(Math.max(178, Math.ceil(e.nativeEvent.layout.height) + 28))}>
            <Txt style={tw('font-medium')}>{t('demo.question')}</Txt>
            <View style={tw('mt-2.5 gap-2')}>
              {opts.map(([id, label]) => (
                <View key={id} style={tw('flex-row gap-3 rounded-xl border px-3 py-2')}><View style={tw('h-6 w-6')} /><Txt style={tw('flex-1 text-sm')}>{label}</Txt></View>
              ))}
            </View>
            <Txt style={tw('mt-2 text-xs')}>{t('demo.wrong')} · {t('demo.tryAgain')}</Txt>
          </View>
          {paused ? (
            <Reveal key="q" y={10} duration={0.35}>
              <Txt style={tw('font-medium text-ink')}>{t('demo.question')}</Txt>
              <View style={tw('mt-2.5 gap-2')}>
                {opts.map(([id, label]) => <Option key={id} id={id} label={label} wrongPick={phase === 'wrong' && picked === id} onPress={() => answer(id)} />)}
              </View>
              {phase === 'wrong' && <Txt style={tw('mt-2 text-xs text-rose')}>{t('demo.wrong')} · {t('demo.tryAgain')}</Txt>}
            </Reveal>
          ) : phase === 'right' ? (
            <Reveal key="ok" y={0} scale={0.97} duration={0.3} style={tw('flex-row items-start gap-3 rounded-2xl bg-sage-100 p-4')}>
              <View style={tw('h-8 w-8 items-center justify-center rounded-full bg-sage')}><Check size={16} color={COLORS.white} /></View>
              <View style={tw('min-w-0 flex-1')}>
                <Txt style={tw('text-sm text-ink')} testID="demo-right">{t('demo.right')}</Txt>
                {attempt > 1 && <Txt style={tw('mt-1 font-hand text-lg text-sky-700')}>{t('demo.resumes')}</Txt>}
              </View>
              <Press onPress={restart} accessibilityLabel="Replay" hitSlop={8} style={tw('h-8 w-8 items-center justify-center rounded-lg')}><RotateCcw size={16} color={COLORS['ink-3']} /></Press>
            </Reveal>
          ) : (
            <View key="wait" style={tw('gap-2 pt-1')}>
              <View style={tw('flex-row items-center gap-2')}>
                <Play size={12} color={COLORS['ink-3']} fill={COLORS['ink-3']} />
                <Txt style={tw('text-xs text-ink-3')}>{t('hero.ctaSecondary')}</Txt>
              </View>
              <Skeleton style={[tw('h-3'), { width: '80%' }]} />
              <Skeleton style={[tw('h-3'), { width: '60%' }]} />
              <Skeleton style={[tw('h-3'), { width: '66%' }]} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
