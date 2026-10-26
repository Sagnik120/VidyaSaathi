import { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ClipboardCheck, Loader2, RotateCcw } from 'lucide-react-native';
import { api } from '@/core/api';
import type { PlacementAnswer, PlacementStep, SkillMap } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS, color } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { Reveal, Spin } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

const TXT = {
  en: {
    offer: 'Skip what you already know', offerSub: 'A 2-minute placement check: about 6 questions, getting harder as you go right.',
    start: 'Take the check', later: 'Not now', q: 'Question {a} of up to {b}', finishing: 'Working out your level…',
    resultNone: 'No problem: your path starts from the very beginning.', result: 'You already know the foundations up to {c}.',
    resultSub: 'Those concepts are marked known on your map and skipped in your path. Real lesson scores always override them.',
    done: 'See my path', placed: 'Placement: known up to {c}.', placedNone: 'Placement: starting from the beginning.', retake: 'Retake', reset: 'Reset',
  },
  hi: {
    offer: 'जो आप जानते हैं उसे छोड़ें', offerSub: '2 मिनट की जाँच: लगभग 6 प्रश्न, सही उत्तर पर कठिन होते जाते हैं।',
    start: 'जाँच शुरू करें', later: 'अभी नहीं', q: 'प्रश्न {a} / अधिकतम {b}', finishing: 'आपका स्तर निकाला जा रहा है…',
    resultNone: 'कोई बात नहीं: आपका रास्ता बिल्कुल शुरुआत से शुरू होगा।', result: 'आप {c} तक की बुनियाद पहले से जानते हैं।',
    resultSub: 'ये अवधारणाएँ मैप पर ज्ञात मानी गईं और रास्ते में छोड़ी जाएँगी। असली पाठ के अंक हमेशा इन्हें बदल सकते हैं।',
    done: 'मेरा रास्ता देखें', placed: 'जाँच: {c} तक ज्ञात।', placedNone: 'जाँच: शुरुआत से।', retake: 'फिर से दें', reset: 'हटाएँ',
  },
};

type Phase = { kind: 'idle' } | { kind: 'asking'; step: Extract<PlacementStep, { done: false }>['next'] } | { kind: 'saving' } | { kind: 'result'; upto: string | null };

const SHELL = [tw('rounded-[24px] border border-sky-200 p-5'), { backgroundColor: color('sky-50', 0.4) }];

export function PlacementCheck({ map }: { map: SkillMap }) {
  const { lang, n } = useI18n();
  const tx = TXT[lang === 'hi' ? 'hi' : 'en'];
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const titleOf = (id: string | null) => (id ? map.concepts.find((c) => c.id === id)?.title ?? id : null);

  const advance = async (next: PlacementAnswer[]) => {
    setBusy(true);
    try {
      const out = await api.placementNext(next);
      setAnswers(next);
      if (!out.done) return setPhase({ kind: 'asking', step: out.next });
      setPhase({ kind: 'saving' });
      const saved = await api.placementSave(next);
      qc.setQueryData(['skill-map', 'me'], saved.map);
      haptic.success();
      setPhase({ kind: 'result', upto: saved.placement.known_upto });
    } catch (e) {
      toast.error((e as Error).message);
      setPhase({ kind: 'idle' });
    } finally { setBusy(false); }
  };
  const start = () => { setAnswers([]); void advance([]); };
  const reset = async () => {
    setBusy(true);
    try { qc.setQueryData(['skill-map', 'me'], await api.placementReset()); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  if (phase.kind === 'asking') {
    const q = phase.step;
    return (
      <View style={SHELL} testID="placement-question">
        <View style={tw('flex-row items-center justify-between gap-3')}>
          <Txt style={[tw('text-xs font-semibold uppercase text-sky-700'), { letterSpacing: 0.6 }]}>{tx.q.replace('{a}', n(q.number)).replace('{b}', n(q.of))}</Txt>
          <View style={tw('flex-row gap-1')}>
            {Array.from({ length: q.of }, (_, i) => (
              <View key={i} style={[tw('h-1.5 rounded-full'), { width: 16, backgroundColor: i < q.number - 1 ? COLORS['sky-500'] : i === q.number - 1 ? COLORS['sky-300'] : COLORS.line }]} />
            ))}
          </View>
        </View>
        <Reveal key={q.id} x={12} y={0} duration={0.25}>
          <Txt style={tw('mt-3 text-lg font-semibold text-ink')}>{q.question}</Txt>
          <View style={tw('mt-4 gap-2')}>
            {q.options.map((o, i) => (
              <Press key={o} disabled={busy} scaleTo={0.985} testID={`placement-option-${i}`}
                onPress={() => { haptic.tap(); void advance([...answers, { id: q.id, choice: i }]); }}
                style={[tw('rounded-2xl border border-line bg-surface px-4 py-3'), busy ? { opacity: 0.6 } : null]}
                activeStyle={{ borderColor: '#7fa5dd', backgroundColor: COLORS['sky-50'] }}>
                <Txt style={tw('text-sm text-ink')}>{o}</Txt>
              </Press>
            ))}
          </View>
        </Reveal>
      </View>
    );
  }

  if (phase.kind === 'saving') {
    return (
      <View style={[SHELL, tw('flex-row items-center gap-3')]}>
        <Spin><Loader2 size={16} color={COLORS['ink-2']} /></Spin>
        <Txt style={tw('text-sm text-ink-2')}>{tx.finishing}</Txt>
      </View>
    );
  }

  if (phase.kind === 'result') {
    const c = titleOf(phase.upto);
    return (
      <Reveal y={0} scale={0.98} duration={0.3} style={SHELL}>
        <View style={tw('flex-row items-start gap-2')} testID="placement-result">
          <View style={{ marginTop: 6 }}><Check size={20} color={COLORS.sage} /></View>
          <Txt style={tw('flex-1 font-display text-2xl text-ink')}>{c ? tx.result.replace('{c}', c) : tx.resultNone}</Txt>
        </View>
        {c && <Txt style={tw('mt-1 text-sm text-ink-2')}>{tx.resultSub}</Txt>}
        <Press onPress={() => setPhase({ kind: 'idle' })} testID="placement-done"
          style={tw('mt-4 flex-row items-center gap-2 self-start rounded-xl bg-sky-600 px-4 py-2')} activeStyle={{ backgroundColor: COLORS['sky-700'] }}>
          <Txt style={tw('text-sm font-semibold text-white')}>{tx.done}</Txt>
          <ArrowRight size={16} color={COLORS.white} />
        </Press>
      </Reveal>
    );
  }

  /* idle: already placed -> one quiet line; otherwise offer it once a goal is set */
  if (map.placement) {
    const c = titleOf(map.placement.known_upto);
    return (
      <View style={tw('flex-row flex-wrap items-center gap-2')} testID="placement-placed">
        <ClipboardCheck size={16} color={COLORS['ink-3']} />
        <Txt style={tw('shrink text-sm text-ink-3')}>{c ? tx.placed.replace('{c}', c) : tx.placedNone}</Txt>
        <Press onPress={start} disabled={busy} hitSlop={8} testID="placement-retake"><Txt style={tw('text-sm font-medium text-sky-700')}>{tx.retake}</Txt></Press>
        <Txt style={tw('text-sm text-ink-3')}>·</Txt>
        <Press onPress={() => void reset()} disabled={busy} hitSlop={8} style={tw('flex-row items-center gap-1')} testID="placement-reset">
          <RotateCcw size={12} color={COLORS['ink-3']} />
          <Txt style={tw('text-sm text-ink-3')}>{tx.reset}</Txt>
        </Press>
      </View>
    );
  }
  if (!map.goal || hidden) return null;
  return (
    <View style={[SHELL, tw('gap-4')]} testID="placement-offer">
      <View style={tw('flex-row items-center gap-4')}>
        <View style={tw('h-11 w-11 items-center justify-center rounded-xl bg-surface')}><ClipboardCheck size={20} color={COLORS['sky-600']} /></View>
        <View style={tw('min-w-0 flex-1')}>
          <Txt style={tw('font-semibold text-ink')}>{tx.offer}</Txt>
          <Txt style={tw('text-sm text-ink-2')}>{tx.offerSub}</Txt>
        </View>
      </View>
      <View style={tw('flex-row items-center justify-end gap-4')}>
        <Press onPress={() => setHidden(true)} hitSlop={8}><Txt style={tw('text-sm text-ink-3')}>{tx.later}</Txt></Press>
        <Press onPress={start} disabled={busy} testID="placement-start"
          style={[tw('flex-row items-center gap-2 rounded-xl bg-sky-600 px-4 py-2'), busy ? { opacity: 0.6 } : null]} activeStyle={{ backgroundColor: COLORS['sky-700'] }}>
          {busy ? <Spin><Loader2 size={16} color={COLORS.white} /></Spin> : null}
          <Txt style={tw('text-sm font-semibold text-white')}>{tx.start}</Txt>
        </Press>
      </View>
    </View>
  );
}
