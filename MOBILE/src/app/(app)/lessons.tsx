import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Route, Sparkles, Trash2 } from 'lucide-react-native';
import { api } from '@/core/api';
import type { Lesson, LessonStatus } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { STATUS_TONE, lessonHref, relativeDays } from '@/lib/lesson';
import { Page } from '@/components/layout/page';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GlassSearch } from '@/components/ui/glass-search';
import { Press } from '@/components/ui/press';
import { Badge, Ring, Skeleton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

const FILTERS: Array<'all' | LessonStatus> = ['all', 'in_progress', 'escalated', 'completed', 'planned'];
type Filter = (typeof FILTERS)[number];

/** A filter chip; the ink fills in with a spring when it becomes the active one. */
function FilterChip({ active, label, onPress, testID }: { active: boolean; label: string; onPress: () => void; testID?: string }) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => { p.set(withSpring(active ? 1 : 0, { stiffness: 450, damping: 34 })); }, [active, p]);
  const ink = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.85 + 0.15 * p.value }] }));
  return (
    <Press onPress={onPress} accessibilityState={{ selected: active }} testID={testID} style={tw('rounded-full border border-line bg-surface px-4 py-1.5')}>
      <Animated.View style={[tw('absolute rounded-full bg-ink'), { top: -1, right: -1, bottom: -1, left: -1 }, ink]} />
      <Txt style={[tw('text-sm'), { color: active ? COLORS.white : COLORS['ink-2'] }]}>{label}</Txt>
    </Press>
  );
}

export default function LessonsPage() {
  const { t, n, lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('all');
  const term = useDeferredValue(search.trim());
  const q = useQuery({ queryKey: ['lessons', 'list', status, term], queryFn: () => api.listLessons({ status, search: term || undefined, limit: 100 }), placeholderData: keepPreviousData });

  const [pending, setPending] = useState<Lesson | null>(null);
  const [kind, setKind] = useState<'all' | 'path' | 'free'>('all');
  const shown = (q.data?.lessons ?? []).filter((l) => kind === 'all' || (kind === 'path') === !!l.skill_goal_id);
  const closeConfirm = useCallback(() => setPending(null), []);
  const confirmDelete = async () => {
    if (!pending) return;
    try {
      await api.deleteLesson(pending.id);
      toast.success(t('lessons.deleted'));
      setPending(null);
      void qc.invalidateQueries({ queryKey: ['lessons'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const kinds = lang === 'hi' ? { all: 'सभी', path: 'रास्ते के पाठ', free: 'मुक्त पाठ' } : { all: 'All lessons', path: 'Path lessons', free: 'Free lessons' };

  return (
    <Page onRefresh={() => q.refetch()}>
      <View style={tw('gap-4')}>
        <View>
          <Txt accessibilityRole="header" style={tw('font-display text-5xl text-ink')}>{t('lessons.title')}</Txt>
          <Txt style={tw('mt-2 text-ink-2')}>{t('lessons.sub')}</Txt>
        </View>
        <Button href="/new" icon={Plus}>{t('nav.newLesson')}</Button>
      </View>

      <GlassSearch style={tw('mt-8')} value={search} onChange={setSearch} placeholder={t('lessons.search')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[tw('mt-4'), { marginHorizontal: -16 }]} contentContainerStyle={tw('gap-2 px-4')}>
        {FILTERS.map((f) => (
          <FilterChip key={f} active={status === f} testID={`filter-${f}`} onPress={() => { haptic.tap(); setStatus(f); }}
            label={f === 'all' ? t('lessons.all') : t(`status.${f}` as 'status.completed')} />
        ))}
      </ScrollView>

      <View style={tw('mt-3 flex-row self-start rounded-xl border border-line bg-surface p-0.5')}>
        {(['all', 'path', 'free'] as const).map((k) => (
          <Press key={k} onPress={() => setKind(k)} scaleTo={1} style={[tw('rounded-lg px-3 py-1'), kind === k ? tw('bg-paper-3') : null]}>
            <Txt style={[tw('text-xs'), { color: kind === k ? COLORS.ink : COLORS['ink-3'], fontWeight: kind === k ? '500' : '400' }]}>{kinds[k]}</Txt>
          </Press>
        ))}
      </View>

      {q.isLoading ? (
        <View style={tw('mt-6 gap-4')}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} style={tw('h-48 rounded-[24px]')} />)}</View>
      ) : shown.length === 0 ? (
        <Txt style={tw('py-20 text-center text-ink-3')} testID="lessons-empty">{t('lessons.empty')}</Txt>
      ) : (
        <View style={tw('mt-6 gap-4')}>
          {shown.map((l, i) => (
            <Reveal key={l.id} y={12} delay={Math.min(i, 8) * 0.03} duration={0.4}>
              <Press onPress={() => router.push(lessonHref(l))} scaleTo={0.985} testID={`lesson-card-${l.id}`}
                style={[tw('rounded-[24px] border border-line bg-surface p-5'), { boxShadow: SHADOW.soft }]} activeStyle={{ boxShadow: SHADOW.lift }}>
                <View style={tw('flex-row items-start justify-between gap-3')}>
                  <View style={tw('h-10 w-10 items-center justify-center rounded-xl bg-sky-50')}>
                    {l.source === 'document' ? <FileText size={20} color={COLORS['sky-700']} /> : <Sparkles size={20} color={COLORS['sky-700']} />}
                  </View>
                  <Ring value={l.progress_pct} size={46} stroke={4} color={COLORS['sky-600']}
                    label={<Txt style={[tw('font-semibold'), { fontSize: 9.9, lineHeight: 14 }]}>{n(Math.round(l.progress_pct))}</Txt>} />
                </View>
                <Txt numberOfLines={2} style={tw('mt-4 font-display text-2xl leading-tight text-ink')}>{l.title}</Txt>
                <View style={tw('mt-3 flex-row flex-wrap gap-1.5')}>
                  <Badge tone={STATUS_TONE[l.status]} dot>{t(`status.${l.status}` as 'status.completed')}</Badge>
                  {l.to_review > 0 && <Badge tone="marigold">{t('status.toReview', { n: n(l.to_review) })}</Badge>}
                  {l.score_pct != null && l.status === 'completed' && <Badge tone="sage">{n(Math.round(l.score_pct))}%</Badge>}
                  {l.skill_goal_id ? <Badge tone="sky" icon={<Route size={12} color={COLORS['sky-700']} />}>{lang === 'hi' ? 'रास्ते का कदम' : 'Path step'}</Badge> : null}
                </View>
                <View style={tw('flex-row items-center justify-between pt-5')}>
                  <Txt style={tw('text-xs text-ink-3')}>{t('common.concepts', { n: n(l.node_count) })} · {relativeDays(l.updated_at, lang)}</Txt>
                  <View style={tw('h-8 w-8')} />
                </View>
              </Press>
              {/* a sibling, not a child: a button may not sit inside the card's own button */}
              <Press onPress={() => setPending(l)} accessibilityLabel={t('common.delete')} hitSlop={8} testID={`lesson-delete-${l.id}`}
                style={tw('absolute bottom-5 right-5 h-8 w-8 items-center justify-center rounded-lg')} activeStyle={{ backgroundColor: COLORS['rose-100'] }}>
                {(pressed) => <Trash2 size={16} color={pressed ? COLORS.rose : COLORS['ink-3']} />}
              </Press>
            </Reveal>
          ))}
        </View>
      )}
      <ConfirmDialog open={!!pending} title={pending ? t('lessons.deleteConfirm', { t: pending.title }) : ''} onConfirm={confirmDelete} onClose={closeConfirm} />
    </Page>
  );
}
