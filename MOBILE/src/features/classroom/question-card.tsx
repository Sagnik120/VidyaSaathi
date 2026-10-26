import { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { AlertCircle, Check, Loader2, PauseCircle } from 'lucide-react-native';
import type { MessageKey } from '@/core/i18n';
import type { EvaluationEvent, InteractionEvent } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { Reveal, Spin, useShake } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Press } from '@/components/ui/press';
import { Textarea } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';

type Mark = 'correct' | 'wrong' | null;

function Option({ label, letter, chosen, mark, disabled, onPress, testID }: {
  label: string; letter: string; chosen: boolean; mark: Mark; disabled: boolean; onPress: () => void; testID?: string;
}) {
  const [shakeStyle, shake] = useShake(7);
  useEffect(() => { if (mark === 'wrong') shake(); }, [mark, shake]);
  const box =
    mark === 'correct' ? { borderColor: COLORS.sage, backgroundColor: COLORS['sage-100'] } :
    mark === 'wrong' ? { borderColor: color('rose', 0.5), backgroundColor: 'rgba(248, 226, 226, 0.6)' } :
    chosen ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line };
  const tag = mark === 'correct' ? COLORS.sage : mark === 'wrong' ? COLORS.rose : chosen ? COLORS['sky-600'] : COLORS['paper-2'];
  return (
    <Animated.View style={shakeStyle}>
      <Press onPress={onPress} disabled={disabled} scaleTo={0.985} accessibilityRole="radio" accessibilityState={{ checked: chosen }} testID={testID}
        style={[tw('flex-row items-center gap-3 rounded-2xl border px-4 py-3'), box]} activeStyle={chosen || mark ? null : { borderColor: COLORS['sky-300'] }}>
        <View style={[tw('h-7 w-7 items-center justify-center rounded-lg'), { backgroundColor: tag }]}>
          {mark === 'correct' ? <Check size={16} color={COLORS.white} /> : <Txt style={[tw('text-xs font-semibold'), { color: mark || chosen ? COLORS.white : COLORS['ink-2'] }]}>{letter}</Txt>}
        </View>
        <Txt style={[tw('flex-1 text-ink'), { fontSize: 15.2, lineHeight: 22 }]}>{label}</Txt>
      </Press>
    </Animated.View>
  );
}

/**
 * The checkpoint, laid over the paused lesson. The typed answer survives a
 * reconnect because it lives here, keyed by interaction_id.
 */
export function QuestionCard({ q, grading, feedback, onSubmit, checks }: {
  q: InteractionEvent; grading: boolean; feedback: EvaluationEvent | null; onSubmit: (a: string) => void;
  checks: { passed: number; total: number };
}) {
  const { t, n } = useI18n();
  const { height } = useWindowDimensions();
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState('');
  const isMcq = q.options?.length > 0;
  const answer = isMcq ? picked : text.trim();
  const canSubmit = !grading && !feedback && !!answer && (isMcq || text.trim().length >= 2);

  // A genuinely new question clears the old answer; a re-ask keeps it.
  const [forId, setForId] = useState(q.interaction_id);
  if (forId !== q.interaction_id) { setForId(q.interaction_id); setPicked(null); setText(''); }

  const tone = feedback ? (feedback.correct ? 'correct' : feedback.partial_credit >= 0.5 ? 'partial' : 'wrong') : null;
  useEffect(() => {
    if (!tone) return;
    if (tone === 'correct') haptic.success(); else if (tone === 'partial') haptic.warning(); else haptic.error();
  }, [tone]);

  const kind = t(`class.kind.${q.type}` as MessageKey);
  return (
    <Reveal key={q.interaction_id} y={40} scale={0.98} duration={0.45}
      style={[tw('w-full rounded-[26px] border p-5'), { maxWidth: 576, maxHeight: height * 0.72, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.98)', boxShadow: '0 30px 60px -20px rgba(30, 41, 66, 0.45)' }]}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false} testID="question-card" accessibilityLabel={t('class.questionTime')}>
        <View style={tw('flex-row items-center justify-between gap-3')}>
          <View style={tw('flex-row items-center gap-2 rounded-full bg-marigold-100 px-3 py-1')}>
            <PauseCircle size={14} color={COLORS['marigold-600']} />
            <Txt style={tw('text-xs font-semibold text-marigold-600')}>{kind.startsWith('class.kind.') ? t('class.questionTime') : kind}</Txt>
          </View>
          {checks.total > 0 && <Txt style={tw('text-xs text-ink-3')}>{t('class.checkpointOf', { a: n(Math.min(checks.total, checks.passed + 1)), b: n(checks.total) })}</Txt>}
        </View>
        <Txt testID="question-text" style={tw('mt-3 font-display text-2xl leading-snug text-ink')}>{q.question_text}</Txt>

        {isMcq ? (
          <View style={tw('mt-4 gap-2')} accessibilityRole="radiogroup">
            {q.options.map((opt, i) => {
              const chosen = picked === opt;
              const mark: Mark = chosen && tone ? (tone === 'correct' ? 'correct' : 'wrong') : null;
              return (
                <Option key={opt} label={opt} letter={String.fromCharCode(65 + i)} chosen={chosen} mark={mark} disabled={grading || !!feedback}
                  onPress={() => { haptic.tap(); setPicked(opt); }} testID={`option-${i}`} />
              );
            })}
            <Txt style={tw('text-xs text-ink-3')}>{t('class.pickOne')}</Txt>
          </View>
        ) : (
          <View style={tw('mt-4')}>
            <Textarea testID="answer-input" value={text} onChangeText={setText} rows={3} editable={!grading && !feedback}
              placeholder={t('class.answerPlaceholder')} accessibilityLabel={t('class.yourAnswer')} />
          </View>
        )}

        {feedback ? (
          <Reveal key="fb" y={8} duration={0.3}
            style={[tw('mt-4 rounded-2xl p-4'), { backgroundColor: tone === 'correct' ? COLORS['sage-100'] : tone === 'partial' ? COLORS['marigold-50'] : 'rgba(248, 226, 226, 0.6)' }]}>
            <View style={tw('flex-row items-center gap-2')} testID="feedback" accessibilityLiveRegion="polite">
              {tone === 'correct' ? <Check size={16} color={COLORS.sage} /> : <AlertCircle size={16} color={tone === 'partial' ? COLORS['marigold-600'] : COLORS.rose} />}
              <Txt testID={`feedback-${tone}`} style={[tw('font-semibold'), { color: tone === 'correct' ? COLORS.sage : tone === 'partial' ? COLORS['marigold-600'] : COLORS.rose }]}>
                {t(tone === 'correct' ? 'class.correct' : tone === 'partial' ? 'class.nearly' : 'class.notQuite')}
              </Txt>
            </View>
            {feedback.feedback_text ? <Txt style={tw('mt-1 text-sm text-ink-2')}>{feedback.feedback_text}</Txt> : null}
            {feedback.misconception_tag ? <Txt style={tw('mt-1.5 text-xs text-ink-3')}>{t('class.misconception', { t: feedback.misconception_tag })}</Txt> : null}
            <View style={tw('mt-2 flex-row items-center gap-1.5')}>
              <Spin><Loader2 size={14} color={COLORS['sky-700']} /></Spin>
              <Txt style={tw('font-hand text-lg text-sky-700')}>{t('class.continuing')}</Txt>
            </View>
          </Reveal>
        ) : (
          <View style={tw('mt-4 flex-row justify-end')}>
            <Button onPress={() => { if (answer) onSubmit(answer); }} disabled={!canSubmit} status={grading ? 'loading' : 'idle'} loadingLabel={t('class.grading')} testID="submit-answer">
              {t('class.submit')}
            </Button>
          </View>
        )}
      </ScrollView>
    </Reveal>
  );
}
