/**
 * Opening screen: a ruled notebook page folds itself into a paper plane and
 * glides off; its dashed flight path is the progress line. Plays once when
 * the app opens — never longer than it needs.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { G, Line, Path } from 'react-native-svg';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { useI18n } from '@/providers/i18n';
import { EASE_OUT, Reveal } from '@/components/motion';
import { Ruled } from '@/components/ui/paper';
import { Txt } from '@/components/ui/text';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

// Same point count, so the page can morph into the plane.
const PAGE = [22, 14, 50, 14, 78, 14, 78, 86, 50, 86, 22, 86];
const PLANE = [10, 30, 46, 42, 90, 50, 90, 50, 46, 58, 10, 70];
const PATH_LEN = 226;
const PAUSE_LEN = 12.4;

type Stage = 'page' | 'plane' | 'fly';

export function PageLoader({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [stage, setStage] = useState<Stage>('page');
  const fold = useSharedValue(0); // 0 = page, 1 = plane
  const crease = useSharedValue(0);
  const mark1 = useSharedValue(0);
  const mark2 = useSharedValue(0);
  const tilt = useSharedValue(0);
  const fly = useSharedValue(0);
  const path = useSharedValue(0.25);
  const fade = useSharedValue(1);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('plane'), 650),
      setTimeout(() => setStage('fly'), 1350),
      setTimeout(() => { fade.set(withTiming(0, { duration: 450, easing: EASE_OUT })); }, 1900),
      setTimeout(() => { setVisible(false); onDone?.(); }, 2350),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage === 'page') return;
    fold.set(withTiming(1, { duration: 600, easing: EASE_OUT }));
    crease.set(withDelay(250, withTiming(1, { duration: 400, easing: EASE_OUT })));
    mark1.set(withDelay(450, withTiming(1, { duration: 250, easing: EASE_OUT })));
    mark2.set(withDelay(570, withTiming(1, { duration: 250, easing: EASE_OUT })));
    tilt.set(withTiming(1, { duration: 500, easing: EASE_OUT }));
    path.set(withTiming(stage === 'plane' ? 0.6 : 1, { duration: 600, easing: EASE_OUT }));
    if (stage === 'fly') fly.set(withTiming(1, { duration: 700, easing: EASE_OUT }));
  }, [stage, fold, crease, mark1, mark2, tilt, fly, path]);

  const shape = useAnimatedProps(() => {
    let d = '';
    for (let i = 0; i < PAGE.length; i += 2) {
      const x = PAGE[i] + (PLANE[i] - PAGE[i]) * fold.value;
      const y = PAGE[i + 1] + (PLANE[i + 1] - PAGE[i + 1]) * fold.value;
      d += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
    }
    return { d: `${d}Z` };
  });
  // The page's ruled lines fade as it folds into the narrow plane.
  const rules = useAnimatedProps(() => ({ opacity: 1 - Math.min(1, fold.value * 1.6) }));
  const creaseProps = useAnimatedProps(() => ({ strokeDashoffset: 80 * (1 - crease.value), opacity: crease.value > 0 ? 1 : 0 }));
  const mark1Props = useAnimatedProps(() => ({ strokeDashoffset: PAUSE_LEN * (1 - mark1.value), opacity: mark1.value > 0 ? 1 : 0 }));
  const mark2Props = useAnimatedProps(() => ({ strokeDashoffset: PAUSE_LEN * (1 - mark2.value), opacity: mark2.value > 0 ? 1 : 0 }));
  const flight = useAnimatedProps(() => ({ strokeDashoffset: PATH_LEN * (1 - path.value) }));
  const plane = useAnimatedStyle(() => ({
    opacity: 1 - fly.value,
    transform: [
      { translateX: 160 * fly.value }, { translateY: -60 * fly.value },
      { rotate: `${interpolate(tilt.value, [0, 1], [0, -6]) - 8 * fly.value}deg` },
    ],
  }));
  const screen = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!visible) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('loader.folding')}
      style={[StyleSheet.absoluteFill, tw('items-center justify-center bg-paper'), { zIndex: 100, pointerEvents: 'none' }, screen]}
    >
      <Ruled margin={false} opacity={0.5} style={StyleSheet.absoluteFill} />
      <View style={tw('items-center')}>
        <Animated.View style={plane}>
          <Svg viewBox="0 0 100 100" width={160} height={160}>
            <AnimatedPath animatedProps={shape} fill={COLORS.surface} stroke={COLORS.ink} strokeWidth={1.3} strokeLinejoin="round" />
            <AnimatedG animatedProps={rules}>
              {[26, 34, 42, 50, 58, 66, 74].map((y) => <Line key={y} x1="23" x2="77" y1={y} y2={y} stroke={COLORS.rule} strokeWidth={1} />)}
              <Line x1="32" x2="32" y1="15" y2="85" stroke={COLORS.margin} strokeWidth={0.8} />
            </AnimatedG>
            {/* centre crease and the ॥ appear once it's a plane */}
            <AnimatedLine x1="10" y1="50" x2="90" y2="50" stroke={COLORS.ink} strokeWidth={1.1} strokeDasharray="80 80" animatedProps={creaseProps} />
            <AnimatedLine x1="52" y1="44" x2="50" y2="56" stroke={COLORS['sky-600']} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={`${PAUSE_LEN} ${PAUSE_LEN}`} animatedProps={mark1Props} />
            <AnimatedLine x1="59" y1="44" x2="57" y2="56" stroke={COLORS['sky-600']} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={`${PAUSE_LEN} ${PAUSE_LEN}`} animatedProps={mark2Props} />
          </Svg>
        </Animated.View>

        {/* the flight path is the progress line */}
        <Svg viewBox="0 0 220 24" width={224} height={24} style={{ marginTop: -8 }}>
          <Path d="M4 18 C 50 4, 90 22, 130 10 S 200 6, 216 4" fill="none" stroke={COLORS['sky-100']} strokeWidth={2} strokeLinecap="round" strokeDasharray="4 6" />
          <AnimatedPath
            d="M4 18 C 50 4, 90 22, 130 10 S 200 6, 216 4" fill="none" stroke={COLORS['sky-300']} strokeWidth={2} strokeLinecap="round"
            strokeDasharray={`${PATH_LEN} ${PATH_LEN}`} animatedProps={flight}
          />
        </Svg>

        <Reveal delay={0.15} duration={0.4} y={6}>
          <Txt style={tw('mt-3 font-hand text-lg text-ink-2')}>{stage === 'fly' ? t('loader.ready') : t('loader.folding')}</Txt>
        </Reveal>
        <Reveal delay={0.3} duration={0.5} y={0}>
          <Txt style={tw('mt-1 font-display text-3xl text-ink')}>VidyaSaathi<Txt style={tw('text-sky-600')}>.</Txt></Txt>
        </Reveal>
      </View>
    </Animated.View>
  );
}
