import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, TextInput, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ArrowRight, Check, Circle, IndentIncrease, Lightbulb, Loader2, Lock, Play, RotateCcw, Sparkles, Trophy, X } from 'lucide-react-native';
import { storage } from '@/core/api';
import { useI18n } from '@/providers/i18n';
import { COLORS, SHADOW, color } from '@/theme/tokens';
import { MONO } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { ProgressBar, Reveal, Spin, useShake } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';
import { PythonRuntime, type PythonHandle } from './python';

/* ── challenges: ~80% given, the learner writes the key lines ─────────── */

type Test = { call: string; expect: string; hidden?: boolean };
type Challenge = { id: string; title: string; hi: string; concept: string; brief: string; prefix: string; blank: string; suffix: string; hint: string; why: string; tests: Test[] };

export const CHALLENGES: Challenge[] = [
  {
    id: 'neuron', title: 'A single neuron', hi: 'एक न्यूरॉन', concept: 'Perceptron',
    brief: 'Multiply each input by its weight, add the bias, and fire (return 1) only if the total is above 0.',
    prefix: 'def neuron(inputs, weights, bias):\n    total = bias\n    for x, w in zip(inputs, weights):\n',
    blank: '        # add x * w to total\n        \n', suffix: '    return 1 if total > 0 else 0\n',
    hint: 'total += x * w', why: 'This weighted sum + threshold is exactly what every neuron in a neural network computes.',
    tests: [{ call: 'neuron([1, 1], [0.5, 0.5], -0.7)', expect: '1' }, { call: 'neuron([1, 0], [0.5, 0.5], -0.7)', expect: '0' }, { call: 'neuron([0, 0], [1, 1], 0.1)', expect: '1' }, { call: 'neuron([2, 3], [-1, 1], -2)', expect: '0' }, { call: 'neuron([1, 1, 1], [1, 1, 1], -3)', expect: '0', hidden: true }, { call: 'neuron([], [], 0.5)', expect: '1', hidden: true }],
  },
  {
    id: 'mse', title: 'Mean squared error', hi: 'मीन स्क्वेयर्ड एरर', concept: 'Loss functions',
    brief: 'Return the average of the squared differences between true values and predictions.',
    prefix: 'def mse(y_true, y_pred):\n    total = 0\n    for t, p in zip(y_true, y_pred):\n',
    blank: '        # add the squared error\n        \n    # return the mean\n    \n', suffix: '',
    hint: 'total += (t - p) ** 2   then   return total / len(y_true)', why: 'MSE punishes big mistakes more than small ones because the error is squared.',
    tests: [{ call: 'mse([1, 2, 3], [1, 2, 3])', expect: '0' }, { call: 'mse([1, 2], [1, 4])', expect: '2.0' }, { call: 'mse([0, 0, 0, 0], [1, -1, 1, -1])', expect: '1.0' }, { call: 'mse([3], [0])', expect: '9' }, { call: 'mse([2.5, -1], [0.5, 1])', expect: '4.0', hidden: true }, { call: 'mse([10] * 5, [0] * 5)', expect: '100', hidden: true }],
  },
  {
    id: 'accuracy', title: 'Accuracy', hi: 'एक्यूरेसी', concept: 'Model evaluation',
    brief: 'Count how many predictions match the labels and return the fraction that are correct.',
    prefix: 'def accuracy(labels, preds):\n', blank: '    correct = 0\n    # count matches\n    \n', suffix: '    return correct / len(labels)\n',
    hint: 'for l, p in zip(labels, preds):\n        if l == p: correct += 1', why: 'Accuracy is the simplest metric, but on imbalanced data it can look great while the model is useless.',
    tests: [{ call: 'accuracy([1, 0, 1, 1], [1, 0, 0, 1])', expect: '0.75' }, { call: "accuracy(['cat', 'dog'], ['cat', 'dog'])", expect: '1.0' }, { call: 'accuracy([0, 0, 0], [1, 1, 1])', expect: '0.0' }, { call: 'accuracy([1], [1])', expect: '1.0', hidden: true }, { call: 'accuracy([1, 2, 3, 4, 5], [1, 0, 3, 0, 5])', expect: '0.6', hidden: true }],
  },
  {
    id: 'gd', title: 'One gradient descent step', hi: 'ग्रेडिएंट डिसेंट का एक कदम', concept: 'Optimisation',
    brief: 'Loss is L(w) = (w − 3)². Its gradient is 2(w − 3). Move w against the gradient, scaled by the learning rate.',
    prefix: 'def step(w, lr):\n    grad = 2 * (w - 3)\n', blank: '    # return the updated w\n    \n', suffix: '',
    hint: 'return w - lr * grad', why: 'Repeat this step and w slides down to 3, the minimum. Too big an lr and it overshoots (try the simulation!).',
    tests: [{ call: 'step(5, 0.1)', expect: '4.6' }, { call: 'step(3, 0.5)', expect: '3' }, { call: 'step(-1, 0.25)', expect: '1.0' }, { call: 'step(0, 0.5)', expect: '3.0' }, { call: 'step(3.5, 1.0)', expect: '2.5', hidden: true }, { call: 'step(100, 0)', expect: '100', hidden: true }],
  },
  {
    id: 'dist', title: 'Distance for k-NN', hi: 'k-NN के लिए दूरी', concept: 'Nearest neighbours',
    brief: 'Return the Euclidean distance between two points a and b of any dimension.',
    prefix: 'import math\n\ndef distance(a, b):\n    total = 0\n', blank: '    # sum the squared differences\n    \n    \n', suffix: '    return math.sqrt(total)\n',
    hint: 'for x, y in zip(a, b):\n        total += (x - y) ** 2', why: "k-NN classifies a point by the labels of the points closest to it, and this is what 'closest' means.",
    tests: [{ call: 'distance([0, 0], [3, 4])', expect: '5' }, { call: 'distance([1, 1, 1], [1, 1, 1])', expect: '0' }, { call: 'distance([1], [-2])', expect: '3' }, { call: 'distance([-1, -1], [2, 3])', expect: '5', hidden: true }, { call: 'distance([0, 0, 0, 0], [1, 1, 1, 1])', expect: '2', hidden: true }],
  },
  {
    id: 'softmax', title: 'Softmax', hi: 'सॉफ़्टमैक्स', concept: 'Probabilities',
    brief: 'Turn scores into probabilities: exponentiate each score, then divide by the total so they sum to 1.',
    prefix: 'import math\n\ndef softmax(scores):\n    exps = [math.exp(s) for s in scores]\n', blank: '    # total, then divide each exp by it\n    \n    \n', suffix: '',
    hint: 'total = sum(exps)\n    return [e / total for e in exps]', why: 'Softmax is how a classifier (and attention!) turns raw scores into a probability distribution.',
    tests: [{ call: 'softmax([0, 0])', expect: '[0.5, 0.5]' }, { call: 'round(sum(softmax([1, 2, 3])), 6)', expect: '1.0' }, { call: 'softmax([1, 2, 3]).index(max(softmax([1, 2, 3])))', expect: '2' }, { call: 'softmax([math.log(1), math.log(3)])', expect: '[0.25, 0.75]' }, { call: 'softmax([-2, -2, -2, -2])', expect: '[0.25, 0.25, 0.25, 0.25]', hidden: true }, { call: 'softmax([5])', expect: '[1.0]', hidden: true }],
  },
];

const STORE = 'shikshak.codeSolved';
export const readSolved = (): string[] => { try { return JSON.parse(storage.getItem(STORE) || '[]'); } catch { return []; } };
const writeSolved = (v: string[]) => storage.setItem(STORE, JSON.stringify(v));

type Result = { state: 'wait' | 'run' | 'pass' | 'fail'; got?: string };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── UI ────────────────────────────────────────────────────────────────── */

export function CodeChallenges({ onSolvedChange }: { onSolvedChange?: (n: number) => void }) {
  const { lang } = useI18n();
  const hi = lang === 'hi';
  const [solved, setSolved] = useState<string[]>(readSolved);
  const [idx, setIdx] = useState(() => {
    const s = readSolved();
    const first = CHALLENGES.findIndex((c) => !s.includes(c.id));
    return first < 0 ? 0 : first;
  });
  const py = useRef<PythonHandle>(null);
  useEffect(() => { onSolvedChange?.(solved.length); }, [solved, onSolvedChange]);

  const markSolved = (id: string) => setSolved((s) => { const v = s.includes(id) ? s : [...s, id]; writeSolved(v); return v; });
  const unlocked = (i: number) => i === 0 || solved.includes(CHALLENGES[i - 1].id) || solved.includes(CHALLENGES[i].id);

  return (
    <View style={tw('gap-5')}>
      <PythonRuntime ref={py} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={tw('gap-2 px-4 pb-1')}>
        {CHALLENGES.map((c, i) => {
          const done = solved.includes(c.id), open = unlocked(i), on = i === idx;
          return (
            <Press key={c.id} disabled={!open} onPress={() => { haptic.tap(); setIdx(i); }} testID={`challenge-${c.id}`}
              style={[tw('flex-row items-center gap-3 rounded-2xl border px-3 py-2.5'), { maxWidth: 240 },
                on ? { borderColor: '#7fa5dd', backgroundColor: COLORS['sky-50'], boxShadow: SHADOW.soft } : { borderColor: COLORS.line, backgroundColor: COLORS.surface },
                !open ? { opacity: 0.5 } : null]}>
              <View style={[tw('h-7 w-7 items-center justify-center rounded-full'), { backgroundColor: done ? COLORS.sage : on ? COLORS['sky-600'] : COLORS['paper-3'] }]}>
                {done ? <Check size={14} color={COLORS.white} /> : open
                  ? <Txt style={[tw('text-xs font-semibold'), { color: on ? COLORS.white : COLORS['ink-3'] }]}>{i + 1}</Txt>
                  : <Lock size={12} color={COLORS['ink-3']} />}
              </View>
              <View style={tw('shrink')}>
                <Txt numberOfLines={1} style={tw('text-sm font-medium text-ink')}>{hi ? c.hi : c.title}</Txt>
                <Txt numberOfLines={1} style={tw('text-xs text-ink-3')}>{c.concept}</Txt>
              </View>
            </Press>
          );
        })}
      </ScrollView>
      <Editor key={CHALLENGES[idx].id} c={CHALLENGES[idx]} hi={hi} py={py} solved={solved.includes(CHALLENGES[idx].id)}
        onPass={() => markSolved(CHALLENGES[idx].id)}
        onNext={idx < CHALLENGES.length - 1 ? () => setIdx(idx + 1) : undefined} />
    </View>
  );
}

const CODE: TextStyle = { fontFamily: MONO, fontSize: 13, lineHeight: 24 };
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
const CODE_WIDTH = 560;

function Editor({ c, hi, py, solved, onPass, onNext }: {
  c: Challenge; hi: boolean; py: React.RefObject<PythonHandle | null>; solved: boolean; onPass: () => void; onNext?: () => void;
}) {
  const [code, setCode] = useState(c.blank);
  const [results, setResults] = useState<Result[]>(c.tests.map(() => ({ state: 'wait' })));
  const [phase, setPhase] = useState<'idle' | 'loading' | 'running' | 'pass' | 'fail'>('idle');
  const [hint, setHint] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const caret = useRef({ start: c.blank.length, end: c.blank.length });
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  const lines = (s: string) => (s ? s.replace(/\n$/, '').split('\n') : []);
  const pre = lines(c.prefix), post = lines(c.suffix);
  const rows = Math.max(3, code.split('\n').length);

  const run = async () => {
    if (phase === 'loading' || phase === 'running') return;
    setErr(null);
    setResults(c.tests.map(() => ({ state: 'wait' })));
    setPhase('loading');
    const runtime = py.current;
    try {
      if (!runtime) throw new Error('Could not load the Python runtime.');
      await runtime.ready();
    } catch (e) { setErr((e as Error).message); setPhase('idle'); return; }
    setPhase('running');
    const src = c.prefix + code + (code.endsWith('\n') ? '' : '\n') + c.suffix;
    let all = true;
    for (let i = 0; i < c.tests.length; i++) {
      setResults((r) => r.map((x, j) => (j === i ? { state: 'run' } : x)));
      await sleep(380);
      const [ok, got] = await runtime.run(src, c.tests[i].call, c.tests[i].expect);
      all &&= ok;
      setResults((r) => r.map((x, j) => (j === i ? { state: ok ? 'pass' : 'fail', got } : x)));
    }
    setPhase(all ? 'pass' : 'fail');
    if (all) { haptic.success(); onPass(); } else haptic.warning();
  };

  // A phone keyboard has no Tab key: this inserts one level of indentation at the cursor.
  const indent = () => {
    const { start, end } = caret.current;
    const next = `${code.slice(0, start)}    ${code.slice(end)}`;
    setCode(next);
    const at = start + 4;
    caret.current = { start: at, end: at };
    setSelection({ start: at, end: at });
    input.current?.focus();
  };

  const passed = results.filter((r) => r.state === 'pass').length;
  const busy = phase === 'loading' || phase === 'running';
  const visibleTests = c.tests.filter((t) => !t.hidden).length;

  return (
    <View style={tw('gap-4')}>
      <View>
        <Txt style={[tw('text-xs font-semibold uppercase text-sky-700'), { letterSpacing: 0.6 }]}>
          {c.concept}{solved ? <Txt style={tw('text-sage')}>  · {hi ? 'हल किया' : 'Solved'}</Txt> : null}
        </Txt>
        <Txt style={tw('mt-1 font-display text-3xl text-ink')}>{hi ? c.hi : c.title}</Txt>
        <Txt style={tw('mt-1 text-sm text-ink-2')}>{c.brief}</Txt>
      </View>

      {/* editor: locked lines around an editable block */}
      <View style={[tw('rounded-2xl border'), { borderColor: '#1f2a37', backgroundColor: '#0f172a', boxShadow: SHADOW.lift }]}>
        <View style={[tw('flex-row items-center gap-1.5 border-b px-4 py-2'), { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <View style={[tw('h-2.5 w-2.5 rounded-full'), { backgroundColor: 'rgba(251,113,133,0.8)' }]} />
          <View style={[tw('h-2.5 w-2.5 rounded-full'), { backgroundColor: 'rgba(252,211,77,0.8)' }]} />
          <View style={[tw('h-2.5 w-2.5 rounded-full'), { backgroundColor: 'rgba(52,211,153,0.8)' }]} />
          <Txt style={[tw('ml-3 text-xs'), { color: '#94a3b8', fontFamily: MONO }]}>{c.id}.py</Txt>
          <Txt numberOfLines={1} style={[tw('flex-1 text-right'), { fontSize: 11, lineHeight: 16, color: '#64748b' }]}>{hi ? 'हाइलाइट वाली पंक्तियाँ लिखें' : 'Write the highlighted lines'}</Txt>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[tw('py-3'), { width: CODE_WIDTH }]}>
            {pre.map((l, i) => <CodeLine key={`a${i}`} n={i + 1} text={l} />)}
            <View style={[tw('flex-row border-y'), { borderColor: 'rgba(56,189,248,0.3)', backgroundColor: 'rgba(56,189,248,0.07)' }]}>
              <View style={tw('w-10 pr-3')}>
                {Array.from({ length: rows }, (_, i) => <Txt key={i} style={[CODE, { textAlign: 'right', color: 'rgba(125,211,252,0.6)' }]}>{pre.length + i + 1}</Txt>)}
              </View>
              <TextInput
                ref={input}
                testID="code-input"
                value={code}
                onChangeText={(v) => { setCode(v); setSelection(undefined); }}
                selection={selection}
                onSelectionChange={(e) => { caret.current = e.nativeEvent.selection; }}
                multiline
                scrollEnabled={false}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                smartInsertDelete={false}
                keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
                textAlignVertical="top"
                accessibilityLabel="Your code"
                selectionColor="#7dd3fc"
                style={[CODE, { flex: 1, minHeight: rows * 24, padding: 0, paddingRight: 16, color: '#f0f9ff' }, NO_OUTLINE]}
              />
            </View>
            {post.map((l, i) => <CodeLine key={`b${i}`} n={pre.length + rows + i + 1} text={l} />)}
          </View>
        </ScrollView>
      </View>

      <View style={tw('flex-row flex-wrap items-center gap-2')}>
        <Press onPress={() => void run()} disabled={busy} testID="run-tests"
          style={[tw('flex-row items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5'), busy ? { opacity: 0.6 } : null]} activeStyle={{ backgroundColor: COLORS['sky-700'] }}>
          {busy ? <Spin><Loader2 size={16} color={COLORS.white} /></Spin> : <Play size={16} color={COLORS.white} />}
          <Txt style={tw('text-sm font-semibold text-white')}>{phase === 'loading' ? (hi ? 'Python लोड हो रहा है…' : 'Loading Python…') : (hi ? 'टेस्ट चलाएँ' : 'Run tests')}</Txt>
        </Press>
        <Press onPress={indent} accessibilityLabel={hi ? 'इंडेंट' : 'Indent'} testID="code-indent" style={tw('flex-row items-center gap-1.5 rounded-xl border border-line px-3 py-2.5')}>
          <IndentIncrease size={16} color={COLORS['ink-2']} />
          <Txt style={tw('text-sm text-ink-2')}>{hi ? 'इंडेंट' : 'Indent'}</Txt>
        </Press>
        <Press onPress={() => setHint((h) => !h)} testID="code-hint" style={tw('flex-row items-center gap-1.5 rounded-xl border border-line px-3 py-2.5')}>
          <Lightbulb size={16} color={COLORS['ink-2']} />
          <Txt style={tw('text-sm text-ink-2')}>{hi ? 'संकेत' : 'Hint'}</Txt>
        </Press>
        <Press testID="code-reset" style={tw('flex-row items-center gap-1.5 rounded-xl border border-line px-3 py-2.5')}
          onPress={() => { setCode(c.blank); setPhase('idle'); setResults(c.tests.map(() => ({ state: 'wait' }))); input.current?.focus(); }}>
          <RotateCcw size={16} color={COLORS['ink-2']} />
          <Txt style={tw('text-sm text-ink-2')}>{hi ? 'रीसेट' : 'Reset'}</Txt>
        </Press>
      </View>

      {hint && (
        <Reveal y={-4} duration={0.25} style={[tw('rounded-xl border px-4 py-3'), { borderColor: color('amber', 0.3), backgroundColor: 'rgba(251, 240, 217, 0.6)' }]}>
          <Txt testID="hint-text" style={{ fontFamily: MONO, fontSize: 13, lineHeight: 20, color: COLORS.ink }}>{c.hint}</Txt>
        </Reveal>
      )}
      {err && <View style={[tw('rounded-xl px-4 py-3'), { backgroundColor: color('rose', 0.1) }]}><Txt style={tw('text-sm text-rose')}>{err}</Txt></View>}

      {/* test cases */}
      <View style={tw('rounded-2xl border border-line bg-surface p-4')}>
        <View style={tw('flex-row items-center justify-between')}>
          <Txt style={tw('text-sm font-semibold text-ink')}>
            {hi ? 'टेस्ट केस' : 'Test cases'} <Txt style={tw('text-xs font-normal text-ink-3')}> {visibleTests} {hi ? 'दिखे' : 'visible'} · {c.tests.length - visibleTests} {hi ? 'छिपे' : 'hidden'}</Txt>
          </Txt>
          <Txt testID="tests-passed" style={{ fontFamily: MONO, fontSize: 12, color: COLORS['ink-3'] }}>{passed}/{c.tests.length}</Txt>
        </View>
        <ProgressBar value={(passed / c.tests.length) * 100} color={phase === 'fail' ? COLORS['marigold-600'] : COLORS.sage} height={6} duration={0.4} style={tw('mt-2')} />
        <View style={tw('mt-3 gap-1.5')}>
          {c.tests.map((t, i) => <TestRow key={i} t={t} r={results[i]} hi={hi} hiddenNumber={c.tests.slice(0, i + 1).filter((x) => x.hidden).length} />)}
        </View>
      </View>

      {phase === 'pass' && (
        <Reveal y={12} scale={0.97} duration={0.4} style={[tw('overflow-hidden rounded-2xl border bg-sage-100 p-5'), { borderColor: color('sage', 0.4) }]}>
          {Array.from({ length: 14 }, (_, i) => <Confetti key={i} i={i} />)}
          <View style={tw('flex-row items-center gap-2')} testID="all-passed">
            <Trophy size={20} color={COLORS['marigold-600']} />
            <Txt style={tw('font-display text-2xl text-ink')}>{hi ? 'सभी टेस्ट पास!' : 'All tests passed!'}</Txt>
          </View>
          <View style={tw('mt-1 flex-row gap-2')}>
            <View style={{ marginTop: 2 }}><Sparkles size={16} color={COLORS['sky-600']} /></View>
            <Txt style={tw('flex-1 text-sm text-ink-2')}>{c.why}</Txt>
          </View>
          {onNext ? (
            <Press onPress={onNext} testID="next-challenge" style={tw('mt-4 flex-row items-center gap-2 self-start rounded-xl bg-ink px-4 py-2')} activeStyle={{ opacity: 0.9 }}>
              <Txt style={tw('text-sm font-semibold text-white')}>{hi ? 'अगली चुनौती' : 'Next challenge'}</Txt>
              <ArrowRight size={16} color={COLORS.white} />
            </Press>
          ) : <Txt style={tw('mt-3 text-sm font-medium text-sage')}>{hi ? 'आपने सभी चुनौतियाँ पूरी कर लीं!' : "You've finished every challenge!"}</Txt>}
        </Reveal>
      )}
    </View>
  );
}

function TestRow({ t, r, hi, hiddenNumber }: { t: Test; r: Result; hi: boolean; hiddenNumber: number }) {
  const [shakeStyle, shake] = useShake(5);
  useEffect(() => { if (r.state === 'fail') shake(); }, [r.state, shake]);
  const look =
    r.state === 'pass' ? { borderColor: color('sage', 0.4), backgroundColor: COLORS['sage-100'] } :
    r.state === 'fail' ? { borderColor: COLORS['marigold-200'], backgroundColor: COLORS['marigold-50'] } :
    r.state === 'run' ? { borderColor: COLORS['sky-300'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line, backgroundColor: COLORS.paper };
  const mono: TextStyle = { fontFamily: MONO, fontSize: 12, lineHeight: 18 };
  return (
    <Animated.View style={[tw('flex-row items-center gap-3 rounded-xl border px-3 py-2'), look, shakeStyle]}>
      <View style={tw('h-5 w-5 items-center justify-center')}>
        {r.state === 'pass' ? <Reveal y={0} scale={0} duration={0.25}><Check size={16} color={COLORS.sage} /></Reveal>
          : r.state === 'fail' ? <X size={16} color={COLORS['marigold-600']} />
          : r.state === 'run' ? <Spin><Loader2 size={16} color={COLORS['sky-600']} /></Spin> : <Circle size={12} color={COLORS['ink-3']} />}
      </View>
      {t.hidden ? (
        <View style={tw('min-w-0 flex-1 flex-row items-center gap-1.5')}>
          <Lock size={12} color={COLORS['ink-2']} />
          <Txt numberOfLines={1} style={[mono, { color: COLORS['ink-2'] }]}>{hi ? 'छिपा टेस्ट' : 'Hidden test'} #{hiddenNumber}</Txt>
        </View>
      ) : (
        <Txt numberOfLines={1} style={[mono, tw('min-w-0 flex-1'), { color: COLORS.ink }]}>{t.call} <Txt style={{ color: COLORS['ink-3'] }}>→ {t.expect}</Txt></Txt>
      )}
      {r.state === 'fail' && (t.hidden
        ? <Txt style={[mono, { color: COLORS['marigold-600'] }]}>{hi ? 'किनारे के मामले सोचें' : 'think about edge cases'}</Txt>
        : r.got ? <Txt numberOfLines={1} style={[mono, { color: COLORS['marigold-600'], maxWidth: '45%' }]}>{hi ? 'मिला' : 'got'} {r.got}</Txt> : null)}
    </Animated.View>
  );
}

/** One of the dots that rise and fade when every test passes. */
function Confetti({ i }: { i: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(i * 30, withTiming(1, { duration: 1100 }))); }, [p, i]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateY: -(70 + (i % 4) * 18) * p.value }, { rotate: `${180 * p.value}deg` }] }));
  return (
    <Animated.View
      style={[tw('absolute h-2 w-2 rounded-full'), { left: `${8 + i * 6.5}%`, top: '60%', backgroundColor: [COLORS['sky-500'], COLORS['marigold-600'], COLORS.sage][i % 3], pointerEvents: 'none' }, style]}
    />
  );
}

function CodeLine({ n, text }: { n: number; text: string }) {
  return (
    <View style={tw('flex-row')}>
      <Txt style={[CODE, tw('w-10 pr-3'), { textAlign: 'right', color: '#475569' }]}>{n}</Txt>
      <Txt style={[CODE, { color: '#94a3b8' }]}>{text || ' '}</Txt>
    </View>
  );
}
