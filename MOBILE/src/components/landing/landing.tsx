/**
 * The welcome page a signed-out visitor sees: the website's landing story,
 * told on a phone. It scrolls natively; the sections animate as they arrive.
 */
import { useCallback, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/providers/i18n';
import { tw } from '@/theme/tw';
import { TextLink } from '@/components/auth/auth-kit';
import { Logo } from '@/components/brand/logo';
import { Txt } from '@/components/ui/text';
import { router } from 'expo-router';
import { Hero } from './hero';
import { IslandNav } from './island-nav';
import { Final, Grounded, Hood, Ladder, Langs, Loop, Numbers, Problem, VisitorCheck } from './story';
import { StoryProvider } from './story-scroll';

export function Landing() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const viewport = useSharedValue(height);
  const [places, setPlaces] = useState<Record<string, number>>({});
  const [pageHeight, setPageHeight] = useState(0);
  const demoY = useRef(0);

  const onScroll = useAnimatedScrollHandler((e) => { scrollY.set(e.contentOffset.y); });
  const place = useCallback((id: string) => (y: number) => setPlaces((p) => (p[id] === y ? p : { ...p, [id]: y })), []);
  const jump = useCallback((id: string) => {
    const y = id === 'top' ? 0 : id === 'demo' ? demoY.current - 96 : (places[id] ?? 0);
    scroll.current?.scrollTo({ y: Math.max(0, y), animated: true });
  }, [places, scroll]);

  return (
    <StoryProvider value={{ scrollY, viewport }}>
      <View style={tw('flex-1 bg-paper')} onLayout={(e) => viewport.set(e.nativeEvent.layout.height)}>
        <Animated.ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}
          onContentSizeChange={(_w, h) => setPageHeight(h)} testID="landing">
          <Hero onSeeProblem={() => jump('problem')} onSeeDemo={() => jump('demo')} onDemoPlace={(y) => { demoY.current = y; }} />
          <Problem onPlace={place('problem')} />
          <Loop onPlace={place('loop')} />
          <VisitorCheck />
          <Ladder onPlace={place('ladder')} />
          <Grounded onPlace={place('grounded')} />
          <Langs onPlace={place('langs')} />
          <Numbers />
          <Hood onPlace={place('hood')} />
          <Final />
          <View style={[tw('items-center gap-3 border-t border-line bg-paper px-5 pt-8'), { paddingBottom: insets.bottom + 32 }]}>
            <Logo size={28} />
            <Txt style={tw('text-center font-hand text-lg text-ink-2')}>{t('landing.footer')}</Txt>
            <TextLink tone="muted" weight="400" onPress={() => router.push('/staff/login')} testID="footer-staff">{t('staff.link')}</TextLink>
            <Txt style={tw('text-sm text-ink-3')}>© {new Date().getFullYear()} VidyaSaathi</Txt>
          </View>
        </Animated.ScrollView>
        <IslandNav places={places} pageHeight={pageHeight} onJump={jump} />
      </View>
    </StoryProvider>
  );
}
