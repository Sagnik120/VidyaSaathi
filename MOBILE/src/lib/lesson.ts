import type { Href } from 'expo-router';
import type { Lesson } from '@/core/types';
import type { Tone } from '@/components/ui/primitives';

export { relativeDays } from './dates';

/** Where a lesson card should take the learner. */
export function lessonHref(l: Pick<Lesson, 'id' | 'status' | 'review_pending'>): Href {
  if (l.status === 'completed') return l.review_pending ? `/review/${l.id}` : `/report/${l.id}`;
  return `/learn/${l.id}`;
}

export const STATUS_TONE: Record<string, Tone> = {
  created: 'neutral', planned: 'sky', in_progress: 'sky', completed: 'sage', escalated: 'amber', abandoned: 'rose',
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
