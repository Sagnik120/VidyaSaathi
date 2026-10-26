import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Loader2, RotateCcw, X } from 'lucide-react-native';
import { api } from '@/core/api';
import type { ReviewResult, ReviewSet } from '@/core/types';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { Reveal, Spin } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Skeleton, Textarea } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';

const TXT = {
  en: {
    card: 'Time to refresh', cardSub: '{n} concepts are fading. A quick review keeps them.', start: 'Review now',
    ago: 'learned {d} days ago', title: 'Refresh', sub: "Concepts come back just before you'd forget them. Two quick questions each.",
    none: 'Nothing to refresh right now. Concepts you master come back here after a few days.',
    begin: 'Start', check: 'Check', passed: 'Refreshed! Next review in {d} days.', failed: "That one has faded. It's back on your learning path to practise; next check in {d} days.",
    model: 'Answer:', next: 'Back to the list',
  },
  hi: {
    card: 'दोहराने का समय', cardSub: '{n} अवधारणाएँ धुंधली हो रही हैं। एक छोटी दोहराई उन्हें ताज़ा रखेगी।', start: 'अभी दोहराएँ',
    ago: '{d} दिन पहले सीखा', title: 'दोहराई', sub: 'अवधारणाएँ भूलने से ठीक पहले लौटती हैं। हर एक पर दो छोटे प्रश्न।',
    none: 'अभी दोहराने को कुछ नहीं। जिनमें महारत होगी, वे कुछ दिनों बाद यहाँ लौटेंगी।',
    begin: 'शुरू करें', check: 'जाँचें', passed: 'ताज़ा हो गया! अगली दोहराई {d} दिनों में।', failed: 'यह धुंधला गया है। इसे आपके रास्ते पर अभ्यास के लिए वापस रखा गया; अगली जाँच {d} दिनों में।',
    model: 'उत्तर:', next: 'सूची पर वापस',
  },
};
const useTx = () => { const { lang } = useI18n(); return TXT[lang === 'hi' ? 'hi' : 'en']; };

/* Home-page nudge; renders nothing when nothing is due. */
export function ReviewDueCard() {
  const tx = useTx();
  const { n } = useI18n();
  const q = useQuery({ queryKey: ['spaced-review'], queryFn: api.reviewDue, refetchOnMount: 'always' });
  const due = q.data?.due ?? [];
  if (!due.length) return null;
  return (
    <Reveal y={8} duration={0.45} style={tw('gap-4 rounded-[24px] border border-marigold-200 bg-marigold-50 p-5')}>
      <View style={tw('flex-row items-center gap-4')}>
        <View style={tw('h-11 w-11 items-center justify-center rounded-xl bg-surface')}><RotateCcw size={20} color={COLORS['marigold-600']} /></View>
        <View style={tw('min-w-0 flex-1')}>
          <Txt style={tw('font-semibold text-ink')}>{tx.card}</Txt>
          <Txt style={tw('text-sm text-ink-2')}>
            {tx.cardSub.replace('{n}', n(due.length))} <Txt style={tw('text-ink-3')}>· {due.slice(0, 3).map((d) => d.title).join(', ')}</Txt>
          </Txt>
        </View>
      </View>
      <Press href="/refresh" testID="review-due" style={tw('flex-row items-center justify-center gap-2 self-start rounded-xl bg-ink px-4 py-2')} activeStyle={{ opacity: 0.9 }}>
        <Txt style={tw('text-sm font-semibold text-white')}>{tx.start}</Txt>
        <ArrowRight size={16} color={COLORS.white} />
      </Press>
    </Reveal>
  );
}

/* The /refresh page body. */
export function SpacedReview() {
  const tx = useTx();
  const { n } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['spaced-review'], queryFn: api.reviewDue, refetchOnMount: 'always' });
  const [set, setSet] = useState<ReviewSet | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (cid: string) => {
    setOpening(cid);
    try { setSet(await api.reviewStart(cid)); } catch (e) { toast.error((e as Error).message); } finally { setOpening(null); }
  };
  const done = () => {
    setSet(null);
    void qc.invalidateQueries({ queryKey: ['spaced-review'] });
    void qc.invalidateQueries({ queryKey: ['skill-map'] });
  };

  if (set) return <ReviewRun set={set} onDone={done} />;
  if (q.isLoading) return <Skeleton style={tw('mt-6 h-40 rounded-[24px]')} />;
  const due = q.data?.due ?? [];
  if (!due.length) return <Txt style={tw('mt-10 text-center text-ink-3')}>{tx.none}</Txt>;
  return (
    <View style={tw('mt-6 gap-2')}>
      {due.map((d) => (
        <View key={d.id} style={tw('flex-row items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3')}>
          <RotateCcw size={16} color={COLORS['marigold-600']} />
          <View style={tw('min-w-0 flex-1')}>
            <Txt numberOfLines={1} style={tw('font-medium text-ink')}>{d.title}</Txt>
            <Txt style={tw('text-xs text-ink-3')}>{tx.ago.replace('{d}', n(d.days_since))}</Txt>
          </View>
          <Press onPress={() => void open(d.id)} disabled={!!opening} testID={`review-start-${d.id}`}
            style={[tw('flex-row items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5'), opening ? { opacity: 0.6 } : null]}>
            {opening === d.id && <Spin><Loader2 size={14} color={COLORS.white} /></Spin>}
            <Txt style={tw('text-sm font-semibold text-white')}>{tx.begin}</Txt>
          </Press>
        </View>
      ))}
    </View>
  );
}

function ReviewRun({ set, onDone }: { set: ReviewSet; onDone: () => void }) {
  const tx = useTx();
  const { n } = useI18n();
  const [final, setFinal] = useState<ReviewResult | null>(null);
  return (
    <View style={tw('mt-6 gap-4')}>
      <Txt style={tw('font-display text-3xl text-ink')}>{set.title}</Txt>
      {set.questions.map((q, i) => <ReviewQuestion key={q.id} cid={set.id} q={q} i={i} onResult={(r) => r.finished && setFinal(r)} />)}
      {final && (
        <Reveal y={6} duration={0.4} style={[tw('gap-3 rounded-2xl p-4'), { backgroundColor: final.passed ? COLORS['sage-100'] : COLORS['marigold-100'] }]}>
          <View style={tw('flex-row items-start gap-3')}>
            {final.passed ? <Check size={20} color={COLORS.sage} /> : <RotateCcw size={20} color={COLORS['marigold-600']} />}
            <Txt style={tw('min-w-0 flex-1 text-sm text-ink')}>{(final.passed ? tx.passed : tx.failed).replace('{d}', n(final.next_in_days ?? 0))}</Txt>
          </View>
          <Press onPress={onDone} hitSlop={8} style={tw('self-end')} testID="review-back">
            <Txt style={tw('text-sm font-medium text-sky-700')}>{tx.next}</Txt>
          </Press>
        </Reveal>
      )}
    </View>
  );
}

function ReviewQuestion({ cid, q, i, onResult }: { cid: string; q: ReviewSet['questions'][number]; i: number; onResult: (r: ReviewResult) => void }) {
  const tx = useTx();
  const { n } = useI18n();
  const [ans, setAns] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ReviewResult | null>(null);
  const mcq = q.options.length > 0;
  const submit = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      const r = await api.reviewAnswer(cid, q.id, value);
      setRes(r);
      if (r.correct) haptic.success(); else haptic.warning();
      onResult(r);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <View style={tw('rounded-2xl border border-line bg-surface p-5')}>
      <Txt style={tw('text-lg font-medium text-ink')}><Txt style={tw('font-display text-sky-600')}>{n(i + 1)}  </Txt>{q.question_text}</Txt>
      {mcq ? (
        <View style={tw('mt-3 gap-2')}>
          {q.options.map((o) => (
            <Press key={o} disabled={!!res || busy} onPress={() => { setAns(o); void submit(o); }} scaleTo={0.985}
              style={[tw('rounded-xl border px-4 py-2.5'), ans === o ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line }]}
              activeStyle={{ borderColor: COLORS['sky-300'] }}>
              <Txt style={tw('text-sm text-ink')}>{o}</Txt>
            </Press>
          ))}
        </View>
      ) : (
        <View style={tw('mt-3 gap-2')}>
          <Textarea value={ans} onChangeText={setAns} editable={!res} rows={3} />
          {!res && (
            <Press onPress={() => void submit(ans)} disabled={busy || !ans.trim()}
              style={[tw('flex-row items-center gap-1.5 self-start rounded-xl bg-sky-600 px-4 py-2'), busy || !ans.trim() ? { opacity: 0.5 } : null]}>
              {busy && <Spin><Loader2 size={14} color={COLORS.white} /></Spin>}
              <Txt style={tw('text-sm font-semibold text-white')}>{tx.check}</Txt>
            </Press>
          )}
        </View>
      )}
      {res && (
        <View style={[tw('mt-3 flex-row gap-2 rounded-xl p-3'), { backgroundColor: res.correct ? COLORS['sage-100'] : COLORS['marigold-100'] }]}>
          <View style={{ marginTop: 2 }}>{res.correct ? <Check size={16} color={COLORS.sage} /> : <X size={16} color={COLORS['marigold-600']} />}</View>
          <Txt style={tw('min-w-0 flex-1 text-sm text-ink')}>
            {res.feedback_text}{!res.correct && <Txt> <Txt style={tw('text-ink-3')}>{tx.model}</Txt> {res.model_answer}</Txt>}
          </Txt>
        </View>
      )}
    </View>
  );
}
