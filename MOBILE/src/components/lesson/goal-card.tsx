import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Compass, Flag, GraduationCap, Loader2, RotateCcw, Target, Trophy } from 'lucide-react-native';
import { storage } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { ProgressBar, Reveal, Spin } from '@/components/motion';
import type { IconType } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { stepHref } from './path-progress';
import { COURSE_GOAL, useSkillGoal } from './skill-map';

// "Just explore" is a per-device preference, not learning state.
const EXPLORE_KEY = 'shikshak.exploreFreely';
const readExplore = () => storage.getItem(EXPLORE_KEY) === '1';
const writeExplore = (v: boolean) => { if (v) storage.setItem(EXPLORE_KEY, '1'); else storage.removeItem(EXPLORE_KEY); };

const TXT = {
  en: {
    ask: 'How do you want to learn?', askSub: 'You can change this any time.',
    zero: 'Learn AI from zero', zeroSub: 'A complete course, foundations to frontier, skipping what you know.',
    topic: 'Reach a specific topic', topicSub: 'Pick a goal like Transformers or Mamba. We route you there.',
    explore: 'Just explore', exploreSub: 'Learn any topic freely. Your map still tracks progress.',
    exploring: 'Exploring freely.', setGoal: 'Set a learning goal',
    goal: 'Your goal', next: 'Next step', cont: 'Continue', change: 'Change goal', reached: 'Goal reached!', pick: 'Pick a new goal',
    of: '{d} of {t} concepts mastered',
  },
  hi: {
    ask: 'आप कैसे सीखना चाहते हैं?', askSub: 'इसे कभी भी बदल सकते हैं।',
    zero: 'शुरू से AI सीखें', zeroSub: 'बुनियाद से नवीनतम तक पूरा कोर्स, जो आप जानते हैं उसे छोड़कर।',
    topic: 'किसी खास विषय तक पहुँचें', topicSub: 'Transformers या Mamba जैसा लक्ष्य चुनें, हम रास्ता बनाएँगे।',
    explore: 'बस खोजें', exploreSub: 'कोई भी विषय खुलकर सीखें। आपका मैप प्रगति दर्ज करता रहेगा।',
    exploring: 'आप खुलकर सीख रहे हैं।', setGoal: 'सीखने का लक्ष्य चुनें',
    goal: 'आपका लक्ष्य', next: 'अगला कदम', cont: 'जारी रखें', change: 'लक्ष्य बदलें', reached: 'लक्ष्य पूरा!', pick: 'नया लक्ष्य चुनें',
    of: '{t} में से {d} अवधारणाओं में महारत',
  },
};

const CARD = [tw('rounded-[28px] border border-line bg-surface p-5'), { boxShadow: SHADOW.soft }];
// `at` makes every tap a fresh request, so the path page scrolls to the map each time.
const toMap = () => router.navigate({ pathname: '/path', params: { focus: 'skill-map', at: String(Date.now()) } });

export function GoalCard() {
  const { lang, n } = useI18n();
  const tx = TXT[lang === 'hi' ? 'hi' : 'en'];
  const { q, data, setGoal, saving } = useSkillGoal();
  const [explore, setExplore] = useState(readExplore);

  if (q.isLoading) return <Skeleton style={tw('h-40 rounded-[28px]')} />;
  if (!data) return null; // map unavailable: the rest of the home page still works

  /* goal set: progress + next step */
  if (data.goal) {
    const next = data.route.find((s) => s.next) ?? data.route[0];
    const pct = data.scope_total ? (data.scope_done / data.scope_total) * 100 : 0;
    return (
      <Reveal y={10} duration={0.45} style={CARD}>
        <View testID="goal-card" style={tw('flex-row items-start justify-between gap-3')}>
          <View style={tw('min-w-0 flex-1')}>
            <View style={tw('flex-row items-center gap-2')}>
              <Flag size={14} color={COLORS['sky-700']} />
              <Txt style={[tw('text-xs font-semibold uppercase text-sky-700'), { letterSpacing: 0.6 }]}>{tx.goal}</Txt>
            </View>
            <Txt numberOfLines={2} style={tw('mt-1 font-display text-2xl leading-tight text-ink')}>{data.goal_title}</Txt>
          </View>
          <Press onPress={toMap} hitSlop={8} testID="goal-change"><Txt style={tw('text-sm text-ink-3')}>{tx.change}</Txt></Press>
        </View>
        <ProgressBar value={pct} style={tw('mt-4')} />
        <Txt style={tw('mt-1.5 text-xs text-ink-3')}>{tx.of.replace('{d}', n(data.scope_done)).replace('{t}', n(data.scope_total))}</Txt>

        {next ? (
          <View style={[tw('mt-4 gap-4 rounded-2xl border border-sky-200 p-4'), { backgroundColor: color('sky-50', 0.5) }]}>
            <View>
              <Txt style={tw('text-xs text-ink-3')}>{tx.next}</Txt>
              <Txt numberOfLines={2} style={tw('text-lg font-semibold leading-snug text-ink')}>{next.title}</Txt>
              <Txt numberOfLines={3} style={tw('mt-1 text-sm text-ink-2')}>{next.reason}</Txt>
            </View>
            <Press href={stepHref(next, data.goal)} testID="goal-continue" style={tw('flex-row items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3')} activeStyle={{ backgroundColor: COLORS['sky-700'] }}>
              {next.state === 'practice' || next.state === 'recap' ? <RotateCcw size={16} color={COLORS.white} /> : null}
              <Txt style={tw('text-sm font-semibold text-white')}>{tx.cont}</Txt>
              <ArrowRight size={16} color={COLORS.white} />
            </Press>
          </View>
        ) : (
          <View style={tw('mt-4 flex-row flex-wrap items-center justify-between gap-3 rounded-2xl bg-sage-100 p-4')}>
            <View style={tw('flex-row items-center gap-2')}>
              <Trophy size={20} color={COLORS['marigold-600']} />
              <Txt style={tw('font-semibold text-ink')}>{tx.reached}</Txt>
            </View>
            <Press onPress={toMap} hitSlop={8}><Txt style={tw('text-sm font-medium text-sky-700')}>{tx.pick}</Txt></Press>
          </View>
        )}
      </Reveal>
    );
  }

  /* exploring freely: stay out of the way */
  if (explore) {
    return (
      <View style={tw('flex-row flex-wrap items-center gap-2')}>
        <Compass size={16} color={COLORS['ink-3']} />
        <Txt style={tw('text-sm text-ink-3')}>{tx.exploring}</Txt>
        <Press onPress={() => { writeExplore(false); setExplore(false); }} hitSlop={8} testID="goal-set">
          <Txt style={tw('text-sm font-medium text-sky-700')}>{tx.setGoal}</Txt>
        </Press>
      </View>
    );
  }

  /* no goal yet: three ways to learn */
  const options: Array<{ id: string; icon: IconType; title: string; sub: string; onPress: () => void }> = [
    { id: 'zero', icon: GraduationCap, title: tx.zero, sub: tx.zeroSub, onPress: () => void setGoal(COURSE_GOAL) },
    { id: 'topic', icon: Target, title: tx.topic, sub: tx.topicSub, onPress: toMap },
    { id: 'explore', icon: Compass, title: tx.explore, sub: tx.exploreSub, onPress: () => { writeExplore(true); setExplore(true); } },
  ];
  return (
    <Reveal y={10} duration={0.45} style={CARD}>
      <Txt style={tw('font-display text-3xl text-ink')}>{tx.ask}</Txt>
      <Txt style={tw('mt-1 text-sm text-ink-3')}>{tx.askSub}</Txt>
      <View style={tw('mt-5 gap-3')}>
        {options.map((o, i) => (
          <Press key={o.id} onPress={o.onPress} disabled={saving} scaleTo={0.985} testID={`goal-option-${o.id}`}
            style={tw('rounded-2xl border border-line p-4')} activeStyle={{ borderColor: COLORS['sky-300'], backgroundColor: color('sky-50', 0.4) }}>
            <View style={tw('h-10 w-10 items-center justify-center rounded-xl bg-sky-50')}>
              {saving && i === 0 ? <Spin><Loader2 size={20} color={COLORS['sky-600']} /></Spin> : <o.icon size={20} color={COLORS['sky-600']} />}
            </View>
            <Txt style={tw('mt-3 font-semibold text-ink')}>{o.title}</Txt>
            <Txt style={tw('mt-1 text-sm text-ink-2')}>{o.sub}</Txt>
          </Press>
        ))}
      </View>
    </Reveal>
  );
}
