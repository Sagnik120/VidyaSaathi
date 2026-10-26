import { View } from 'react-native';
import { ArrowUpRight, FileText, Sparkles } from 'lucide-react-native';
import type { Lesson } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { STATUS_TONE, lessonHref, relativeDays } from '@/lib/lesson';
import { Press } from '@/components/ui/press';
import { Badge, Ring } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

export function LessonRow({ lesson }: { lesson: Lesson }) {
  const { t, n, lang } = useI18n();
  const Icon = lesson.source === 'document' ? FileText : Sparkles;
  return (
    <Press href={lessonHref(lesson)} scaleTo={0.985} testID={`lesson-row-${lesson.id}`}
      style={tw('flex-row items-center gap-3 rounded-2xl px-2 py-3')} activeStyle={{ backgroundColor: COLORS['paper-2'] }}>
      <View style={tw('h-11 w-11 items-center justify-center rounded-2xl bg-sky-50')}><Icon size={20} color={COLORS['sky-700']} /></View>
      <View style={tw('min-w-0 flex-1')}>
        <Txt numberOfLines={1} style={tw('font-medium text-ink')}>{lesson.title}</Txt>
        <View style={tw('mt-1 flex-row flex-wrap items-center gap-2')}>
          <Badge tone={STATUS_TONE[lesson.status]} dot>{t(`status.${lesson.status}` as 'status.completed')}</Badge>
          {lesson.to_review > 0 && <Badge tone="marigold">{t('status.toReview', { n: n(lesson.to_review) })}</Badge>}
          <Txt style={tw('text-xs text-ink-3')}>{relativeDays(lesson.updated_at, lang)}</Txt>
        </View>
      </View>
      <Ring value={lesson.progress_pct} size={44} stroke={4} color={COLORS['sky-600']}
        label={<Txt style={[tw('font-semibold'), { fontSize: 9.9, lineHeight: 14 }]}>{n(Math.round(lesson.progress_pct))}</Txt>} />
      <ArrowUpRight size={16} color={COLORS['ink-3']} />
    </Press>
  );
}
