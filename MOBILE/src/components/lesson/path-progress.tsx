import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Flag, RotateCcw, Trophy } from 'lucide-react-native';
import { api } from '@/core/api';
import type { SkillStep } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';

/* Link that starts a lesson as a step on the learner's route. */
export const stepHref = (s: Pick<SkillStep, 'id' | 'title'> & { state: string }, goal: string): Href => ({
  pathname: '/new',
  params: { topic: s.title, concept: s.id, goal, ...(s.state === 'practice' ? { level: 'beginner' } : {}) },
});

function usePath(lessonId: string) {
  const lesson = useQuery({ queryKey: ['lesson', lessonId], queryFn: () => api.getLesson(lessonId), enabled: !!lessonId });
  const goal = lesson.data?.skill_goal_id ?? null;
  // refetched on mount: the scores just changed
  const map = useQuery({ queryKey: ['skill-map', goal], queryFn: () => api.skillMap(goal), enabled: !!goal, refetchOnMount: 'always' });
  const goalTitle = map.data?.concepts.find((c) => c.id === goal)?.title;
  return { goal, goalTitle, route: map.data?.route, concept: lesson.data?.skill_concept_id };
}

/* Small "→ Mamba · 12 steps left" marker for the classroom header. */
export function PathChip({ lessonId, style }: { lessonId: string; style?: StyleProp<ViewStyle> }) {
  const { lang, n } = useI18n();
  const { goal, goalTitle, route } = usePath(lessonId);
  if (!goal || !goalTitle || !route) return null;
  return (
    <View accessibilityLabel={goalTitle} style={[tw('flex-row items-center gap-1.5 self-start rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1'), { maxWidth: '100%' }, style]}>
      <Flag size={12} color={COLORS['sky-700']} />
      <Txt numberOfLines={1} style={tw('shrink text-xs text-sky-700')}>{goalTitle} · {lang === 'hi' ? `${n(route.length)} कदम बाकी` : `${n(route.length)} steps left`}</Txt>
    </View>
  );
}

/* End-of-lesson card: the next step on the route, re-planned from this result. */
export function PathNextCard({ lessonId }: { lessonId: string }) {
  const { lang, n } = useI18n();
  const hi = lang === 'hi';
  const { goal, goalTitle, route, concept } = usePath(lessonId);
  if (!goal || !goalTitle || !route) return null;
  const next = route.find((s) => s.next) ?? route[0];
  const retry = next && next.id === concept;

  return (
    <View style={[tw('rounded-3xl border border-sky-200 p-5'), { backgroundColor: color('sky-50', 0.5) }]}>
      <View style={tw('flex-row items-center gap-2')}>
        <Flag size={14} color={COLORS['sky-700']} />
        <Txt numberOfLines={1} style={[tw('flex-1 text-xs font-semibold uppercase text-sky-700'), { letterSpacing: 0.6 }]}>{hi ? 'आपका रास्ता' : 'Your route'} · {goalTitle}</Txt>
      </View>
      {!next ? (
        <View style={tw('mt-3 flex-row items-center gap-2')}>
          <Trophy size={20} color={COLORS['marigold-600']} />
          <Txt style={tw('font-display text-2xl text-ink')}>{hi ? 'लक्ष्य पूरा!' : 'Goal reached!'}</Txt>
        </View>
      ) : (
        <View style={tw('mt-3 gap-4')}>
          <View>
            <Txt style={tw('text-sm text-ink-3')}>
              {retry ? (hi ? 'एक और कोशिश' : 'One more try') : (hi ? 'अगला कदम' : 'Next step')} · {hi ? `${n(route.length)} कदम बाकी` : `${n(route.length)} steps left`}
            </Txt>
            <Txt numberOfLines={2} style={tw('font-display text-2xl text-ink')}>{next.title}</Txt>
            <Txt style={tw('mt-0.5 text-sm text-ink-2')}>{next.reason}</Txt>
          </View>
          <Press href={stepHref(next, goal)} testID="path-next" style={tw('flex-row items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3')} activeStyle={{ backgroundColor: COLORS['sky-700'] }}>
            {retry || next.state === 'recap' ? <RotateCcw size={16} color={COLORS.white} /> : null}
            <Txt style={tw('text-sm font-semibold text-white')}>{hi ? 'जारी रखें' : 'Continue'}</Txt>
            <ArrowRight size={16} color={COLORS.white} />
          </Press>
        </View>
      )}
    </View>
  );
}
