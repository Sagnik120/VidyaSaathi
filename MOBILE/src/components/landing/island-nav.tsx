/**
 * Welcome-page navigation, adapted from the Dynamic Scroll Island TOC: a
 * floating bar that shows the logo at the top, then shrinks into "where you
 * are" (section name + a reading-progress ring) as you scroll; tap it for the
 * table of contents.
 */
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedReaction, useDerivedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import type { MessageKey } from '@/core/i18n';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { Logo } from '@/components/brand/logo';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { useStory } from './story-scroll';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const SECTIONS: Array<{ id: string; key: MessageKey }> = [
  { id: 'problem', key: 'problem.kicker' },
  { id: 'loop', key: 'loop.kicker' },
  { id: 'ladder', key: 'ladder.kicker' },
  { id: 'grounded', key: 'grounded.kicker' },
  { id: 'langs', key: 'langs.kicker' },
  { id: 'hood', key: 'hood.kicker' },
];

const RING = 2 * Math.PI * 8;

export function IslandNav({ places, pageHeight, onJump }: {
  /** where each section starts, in page coordinates */
  places: Record<string, number>;
  pageHeight: number;
  onJump: (id: string) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { scrollY, viewport } = useStory();
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useAnimatedReaction(() => scrollY.value > 520, (now, before) => { if (now !== before) scheduleOnRN(setCompact, now); });

  // The section whose top edge has passed the middle of the screen.
  const order = SECTIONS.map((s) => places[s.id] ?? Number.MAX_SAFE_INTEGER);
  useAnimatedReaction(
    () => {
      const mid = scrollY.value + viewport.value * 0.5;
      let found = -1;
      for (let i = 0; i < order.length; i++) if (mid >= order[i]) found = i;
      return found;
    },
    (now, before) => { if (now !== before) scheduleOnRN(setCurrent, now < 0 ? null : SECTIONS[now].id); },
    [order.join(',')],
  );

  const read = useDerivedValue(() => {
    const total = Math.max(1, pageHeight - viewport.value);
    return withSpring(Math.min(1, Math.max(0, scrollY.value / total)), { stiffness: 200, damping: 30 });
  });
  const ring = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - read.value) }));

  const currentKey = SECTIONS.find((s) => s.id === current)?.key;
  const jump = (id: string) => { setOpen(false); onJump(id); };

  return (
    <View style={[tw('absolute inset-x-0 items-center px-3'), { top: insets.top + 12, pointerEvents: 'box-none' }]}>
      <View style={[tw('flex-row items-center gap-2 border border-line'), { backgroundColor: 'rgba(255,255,255,0.94)', boxShadow: SHADOW.lift },
        compact ? tw('rounded-full py-1.5 pl-2 pr-1.5') : [tw('w-full rounded-[22px] px-3 py-2'), { maxWidth: 1152 }]]}>
        <Press onPress={() => onJump('top')} accessibilityLabel="VidyaSaathi" hitSlop={6}><Logo size={compact ? 28 : 32} withWord={!compact && width >= 430} /></Press>

        {compact ? (
          <Reveal key="where" y={0} duration={0.3} style={tw('shrink')}>
            <Press onPress={() => setOpen((o) => !o)} accessibilityState={{ expanded: open }} style={tw('flex-row items-center gap-2 rounded-full px-2 py-1')} testID="island-where">
              <Svg width={18} height={18} viewBox="0 0 20 20" style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={10} cy={10} r={8} fill="none" stroke={COLORS.line} strokeWidth={2.5} />
                <AnimatedCircle cx={10} cy={10} r={8} fill="none" stroke={COLORS['sky-600']} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={`${RING} ${RING}`} animatedProps={ring} />
              </Svg>
              <Txt numberOfLines={1} style={[tw('shrink text-sm text-ink-2'), { maxWidth: 132 }]}>{currentKey ? t(currentKey) : t('hero.kicker')}</Txt>
              <View style={open ? { transform: [{ rotate: '180deg' }] } : null}><ChevronDown size={16} color={COLORS['ink-2']} /></View>
            </Press>
          </Reveal>
        ) : <View style={tw('flex-1')} />}

        <View style={tw('flex-row items-center gap-2')}>
          {!compact && width >= 380 && <LanguageToggle style={{ alignSelf: 'center' }} />}
          {!compact && <Button href="/login" size="sm" variant="ghost" style={{ alignSelf: 'center' }} testID="nav-signin">{t('nav.signIn')}</Button>}
          <Button href="/signup" size="sm" style={[{ alignSelf: 'center' }, compact ? { borderRadius: 999 } : null]} testID="nav-start">{t('nav.getStarted')}</Button>
        </View>
      </View>

      {open && compact && (
        <Reveal y={-6} scale={0.97} duration={0.25} style={[tw('mt-2 w-64 rounded-3xl border border-line bg-surface p-2'), { boxShadow: SHADOW.lift }]}>
          {SECTIONS.map((s, i) => (
            <Press key={s.id} onPress={() => jump(s.id)} scaleTo={0.99} testID={`toc-${s.id}`}
              style={[tw('flex-row items-center gap-3 rounded-2xl px-3 py-2'), current === s.id ? tw('bg-sky-50') : null]} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
              <Txt style={tw('font-hand text-base text-sky-600')}>{String(i + 1).padStart(2, '0')}</Txt>
              <Txt numberOfLines={1} style={[tw('flex-1 text-sm'), { color: current === s.id ? COLORS.ink : COLORS['ink-2'] }]}>{t(s.key)}</Txt>
            </Press>
          ))}
          <View style={tw('mt-1 items-center border-t border-line pt-2')}><LanguageToggle style={{ alignSelf: 'center' }} /></View>
        </Reveal>
      )}
    </View>
  );
}
