import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDown, ArrowRight, BookOpenCheck, Languages, UserRoundCheck } from 'lucide-react-native';
import { useI18n } from '@/providers/i18n';
import { COLORS, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { TextLink } from '@/components/auth/auth-kit';
import { PlaneMark } from '@/components/brand/logo';
import { Bounce, EASE_OUT, Float, Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Grain, Ruled } from '@/components/ui/paper';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { LessonDemo } from './lesson-demo';
import { usePageProgress } from './story-scroll';

/** One word of the headline, lifting into place from behind its own baseline. */
function Word({ text, delay, size, italic, tint }: { text: string; delay: number; size: number; italic?: boolean; tint: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(delay * 1000, withTiming(1, { duration: 800, easing: EASE_OUT }))); }, [p, delay]);
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * size * 1.15 }, { rotate: `${4 * (1 - p.value)}deg` }] }));
  return (
    <View style={{ overflow: 'hidden', marginRight: size * 0.24 }}>
      <Animated.View style={lift}>
        <Txt style={{ fontFamily: 'display', fontStyle: italic ? 'italic' : 'normal', fontSize: size, lineHeight: size * 1.16, color: tint, letterSpacing: -size * 0.015 }}>{text}</Txt>
      </Animated.View>
    </View>
  );
}

/** Words lift in one by one, like a teacher writing them. */
function Words({ text, delay = 0, size, italic, tint = COLORS.ink }: { text: string; delay?: number; size: number; italic?: boolean; tint?: string }) {
  return <>{text.split(' ').filter(Boolean).map((w, i) => <Word key={`${w}-${i}`} text={w} delay={delay + i * 0.06} size={size} italic={italic} tint={tint} />)}</>;
}

/** The marigold stroke that sweeps under the italic half of the headline. */
function Underline({ size }: { size: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(1100, withTiming(1, { duration: 700, easing: EASE_OUT }))); }, [p]);
  const sweep = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, bottom: size * 0.14, height: size * 0.38, borderRadius: 2, backgroundColor: color('marigold', 0.55), transform: [{ rotate: '-1deg' }] }, sweep]} />
  );
}

export function Hero({ onSeeProblem, onSeeDemo, onDemoPlace }: { onSeeProblem: () => void; onSeeDemo: () => void; onDemoPlace: (y: number) => void }) {
  const { t, lang } = useI18n();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrolled = usePageProgress(height * 0.7);
  const fade = useAnimatedStyle(() => ({ opacity: 1 - scrolled.value }));
  const planeFade = useAnimatedStyle(() => ({ opacity: 0.4 * (1 - scrolled.value) }));

  const size = Math.min(72, Math.max(44, width * 0.125));
  const trust = [
    { icon: Languages, text: t('hero.trust1') },
    { icon: BookOpenCheck, text: t('hero.trust2') },
    { icon: UserRoundCheck, text: t('hero.trust3') },
  ];

  return (
    <View>
      <Ruled margin={false} style={[tw('overflow-hidden pb-20'), { paddingTop: insets.top + 104 }]}>
        <Grain />
        {/* the plane, floating over the page */}
        <Animated.View style={[tw('absolute'), { right: -64, top: insets.top + 8, width: 300, height: 220, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }, planeFade]}>
          <Float><PlaneMark size={180} /></Float>
        </Animated.View>

        <View style={tw('px-5')}>
          <View>
            <Reveal y={8} delay={0.1} duration={0.4} style={[tw('flex-row items-center gap-2 self-start rounded-full border border-line px-3 py-1'), { backgroundColor: 'rgba(255,255,255,0.8)' }]}>
              <View style={tw('h-1.5 w-1.5 rounded-full bg-sage')} />
              <Txt style={tw('text-sm text-ink-2')}>{t('hero.kicker')}</Txt>
            </Reveal>

            <View key={lang} accessibilityRole="header" accessibilityLabel={`${t('hero.title1')} ${t('hero.title2')}`} style={tw('mt-6 flex-row flex-wrap items-end')}>
              <Words text={t('hero.title1')} size={size} />
              <View style={[tw('flex-row flex-wrap'), { maxWidth: '100%' }]}>
                <Underline size={size} />
                <Words text={t('hero.title2')} delay={0.35} size={size} italic tint={COLORS['sky-700']} />
              </View>
            </View>

            <Reveal y={10} delay={0.7} duration={0.6}>
              <Txt style={tw('mt-6 text-lg leading-relaxed text-ink-2')}>{t('hero.sub')}</Txt>
            </Reveal>
            <Reveal y={10} delay={0.85} duration={0.6} style={tw('mt-8 flex-row flex-wrap gap-3')}>
              <Button href="/signup" size="lg" icon={ArrowRight} testID="hero-start">{t('hero.cta')}</Button>
              <Button size="lg" variant="outline" onPress={onSeeDemo} testID="hero-demo">{t('hero.ctaSecondary')}</Button>
            </Reveal>
            <Reveal y={0} delay={0.95} duration={0.5} style={tw('mt-4 flex-row flex-wrap items-center gap-1.5')}>
              <Txt style={tw('text-sm text-ink-2')}>{t('auth.haveAccount')}</Txt>
              <TextLink onPress={() => router.push('/login')} testID="hero-signin">{t('auth.signIn')}</TextLink>
            </Reveal>
            <View style={tw('mt-10 flex-row flex-wrap gap-x-6 gap-y-2')}>
              {trust.map((x, i) => (
                <Reveal key={i} y={0} delay={1 + i * 0.1} duration={0.4} style={tw('flex-row items-center gap-2')}>
                  <x.icon size={16} color={COLORS['sky-600']} />
                  <Txt style={tw('text-sm text-ink-2')}>{x.text}</Txt>
                </Reveal>
              ))}
            </View>
          </View>

          <View onLayout={(e) => onDemoPlace(e.nativeEvent.layout.y)} style={tw('mt-14')}>
            <Reveal y={40} rotate={2} delay={0.4} duration={0.9}>
              <View style={[tw('absolute'), { left: 4, top: -30, transform: [{ rotate: '-6deg' }], zIndex: 2 }]}>
                <Txt style={tw('font-hand text-xl text-sky-700')}>↓ {t('demo.label').split('·')[0].trim()}</Txt>
              </View>
              <LessonDemo />
              {/* tape */}
              <View style={[tw('absolute right-10 h-6 w-20 rounded-sm'), { top: -12, backgroundColor: 'rgba(249, 225, 154, 0.8)', transform: [{ rotate: '5deg' }], boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }]} />
            </Reveal>
          </View>
        </View>

        <Animated.View style={[tw('mt-14 items-center'), fade]}>
          <Press onPress={onSeeProblem} hitSlop={10} style={tw('flex-row items-center gap-2')} testID="hero-scroll">
            <Bounce><ArrowDown size={16} color={COLORS['ink-3']} /></Bounce>
            <Txt style={tw('text-sm text-ink-3')}>{t('hero.scroll')}</Txt>
          </Press>
        </Animated.View>
      </Ruled>
    </View>
  );
}
