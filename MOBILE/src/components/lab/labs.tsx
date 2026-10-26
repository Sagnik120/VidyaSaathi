import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Check, Play, RotateCcw, X } from 'lucide-react-native';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { MONO } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { haptic } from '@/lib/haptics';
import { ProgressBar, Reveal } from '@/components/motion';
import { Press } from '@/components/ui/press';
import { RangeSlider } from '@/components/ui/range-slider';
import { Txt } from '@/components/ui/text';

/* ── registry ──────────────────────────────────────────────────────────── */

export const LABS = [
  { id: 'gd', en: 'Gradient descent', hi: 'ग्रेडिएंट डिसेंट', keys: ['gradient', 'learning rate', 'optimi', 'ग्रेडिएंट'] },
  { id: 'fit', en: 'Overfitting', hi: 'ओवरफ़िटिंग', keys: ['overfit', 'underfit', 'generali', 'regulari', 'ओवरफ़िट'] },
  { id: 'neuron', en: 'A neuron', hi: 'न्यूरॉन', keys: ['neuron', 'perceptron', 'neural', 'न्यूरॉन'] },
  { id: 'attn', en: 'Attention', hi: 'अटेंशन', keys: ['attention', 'transformer', 'अटेंशन'] },
] as const;
export type LabId = (typeof LABS)[number]['id'];

/** Simulations relevant to some text (concept names, a lesson title). */
export function labsFor(text: string) {
  const low = (text || '').toLowerCase();
  return LABS.filter((l) => l.keys.some((k) => low.includes(k)));
}

export function Lab({ id }: { id: LabId }) {
  return id === 'gd' ? <GradientLab /> : id === 'fit' ? <FitLab /> : id === 'neuron' ? <NeuronLab /> : <AttentionLab />;
}

/* ── shared predict → run → check frame ────────────────────────────────── */

function useHi() { const { lang } = useI18n(); return lang === 'hi'; }

function Predict({ question, options, picked, onPick, verdict, explain }: {
  question: string; options: Array<{ id: string; label: string }>; picked: string | null; onPick: (id: string) => void;
  verdict: null | { right: boolean; answer: string }; explain: ReactNode;
}) {
  const hi = useHi();
  return (
    <View style={tw('rounded-2xl border border-line bg-paper p-4')}>
      <Txt style={[tw('text-xs font-semibold uppercase text-sky-700'), { letterSpacing: 0.6 }]}>{hi ? 'पहले अनुमान लगाइए' : 'Predict first'}</Txt>
      <Txt style={tw('mt-1 font-medium text-ink')}>{question}</Txt>
      <View style={tw('mt-3 flex-row flex-wrap gap-2')}>
        {options.map((o) => {
          const answer = !!verdict && o.id === verdict.answer;
          const on = picked === o.id;
          return (
            <Press key={o.id} onPress={() => { haptic.tap(); onPick(o.id); }} disabled={!!verdict} testID={`predict-${o.id}`}
              style={[tw('rounded-full border px-3 py-1.5'),
                answer ? { borderColor: COLORS.sage, backgroundColor: COLORS['sage-100'] } : on ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line }]}>
              <Txt style={[tw('text-sm'), { color: answer || on ? COLORS.ink : COLORS['ink-2'], fontWeight: on ? '500' : '400' }]}>{o.label}</Txt>
            </Press>
          );
        })}
      </View>
      {verdict && (
        <Reveal y={4} duration={0.3} style={[tw('mt-3 flex-row gap-2 rounded-xl p-3'), { backgroundColor: verdict.right ? COLORS['sage-100'] : COLORS['marigold-100'] }]}>
          <View style={{ marginTop: 2 }}>{verdict.right ? <Check size={16} color={COLORS.sage} /> : <X size={16} color={COLORS['marigold-600']} />}</View>
          <Txt testID="verdict" style={tw('flex-1 text-sm text-ink')}>
            {verdict.right ? (hi ? 'सही अनुमान! ' : 'Right prediction! ') : (hi ? 'इस बार नहीं। ' : 'Not this time. ')}{explain}
          </Txt>
        </Reveal>
      )}
    </View>
  );
}

/** A small sky "do it" button and its quiet outline twin. */
function Action({ onPress, disabled, icon, label, quiet, testID }: { onPress: () => void; disabled?: boolean; icon?: ReactNode; label: string; quiet?: boolean; testID?: string }) {
  return (
    <Press onPress={onPress} disabled={disabled} testID={testID}
      style={[tw('flex-row items-center gap-1.5 rounded-xl px-4 py-2'), quiet ? tw('border border-line') : tw('bg-sky-600'), disabled ? { opacity: 0.5 } : null]}>
      {icon}
      <Txt style={[tw('text-sm'), quiet ? { color: COLORS['ink-2'] } : { color: COLORS.white, fontWeight: '600' }]}>{label}</Txt>
    </Press>
  );
}

const W = 520, H = 240, PAD = 28;
const LABEL = 'Figtree_400Regular';

/** A chart drawn in the website's 520×240 coordinates, scaled to the screen. */
function Plot({ children, width = W, height = H, maxWidth }: { children: ReactNode; width?: number; height?: number; maxWidth?: number }) {
  const [w, setW] = useState(0);
  return (
    <View style={[tw('overflow-hidden rounded-2xl border border-line bg-surface'), { width: '100%', maxWidth }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && <Svg width={w - 2} height={((w - 2) * height) / width} viewBox={`0 0 ${width} ${height}`}>{children}</Svg>}
    </View>
  );
}

/* ── 1. gradient descent on L(w) = (w - 3)² ────────────────────────────── */

type GdOutcome = 'smooth' | 'zigzag' | 'diverge';
function gdOutcome(lr: number): GdOutcome {
  const r = Math.abs(1 - 2 * lr); // each step multiplies the distance to the minimum by |1 − 2η|
  return r >= 1 ? 'diverge' : lr > 0.5 ? 'zigzag' : 'smooth';
}

const gdX = (w: number) => PAD + ((w + 2) / 10) * (W - 2 * PAD);
const gdY = (w: number) => H - PAD - (Math.min((w - 3) ** 2, 25) / 25) * (H - 2 * PAD);
const GD_CURVE = Array.from({ length: 101 }, (_, i) => -2 + i / 10).map((w) => `${gdX(w)},${gdY(w)}`).join(' ');

function GradientLab() {
  const hi = useHi();
  const [lr, setLr] = useState(0.3);
  const [pick, setPick] = useState<string | null>(null);
  const [steps, setSteps] = useState<number[] | null>(null);
  // The walk is revealed one step at a time.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!steps) { setShown(0); return; }
    const id = setInterval(() => setShown((n) => { if (n >= steps.length) { clearInterval(id); return n; } return n + 1; }), 180);
    return () => clearInterval(id);
  }, [steps]);

  const run = () => {
    const ws = [-1];
    for (let i = 0; i < 12; i++) ws.push(ws[ws.length - 1] - lr * 2 * (ws[ws.length - 1] - 3));
    setSteps(ws.map((w) => Math.max(-2, Math.min(8, w))));
  };
  const reset = () => { setSteps(null); setPick(null); };
  const truth = gdOutcome(lr);
  const verdict = steps && pick ? { right: pick === truth, answer: truth } : null;
  const ratio = Math.abs(1 - 2 * lr).toFixed(2);

  return (
    <View style={tw('gap-4')}>
      <Predict
        question={hi ? `सीखने की दर η = ${lr.toFixed(2)} पर, w = −1 से शुरू करके, क्या होगा?` : `With learning rate η = ${lr.toFixed(2)}, starting at w = −1, what happens?`}
        options={[{ id: 'smooth', label: hi ? 'धीरे-धीरे न्यूनतम तक' : 'Slides smoothly to the minimum' },
                  { id: 'zigzag', label: hi ? 'आगे-पीछे झूलकर पहुँचता है' : 'Zig-zags but gets there' },
                  { id: 'diverge', label: hi ? 'कभी नहीं पहुँचता' : 'Never settles (blows up)' }]}
        picked={pick} onPick={setPick} verdict={verdict}
        explain={hi
          ? `हर कदम न्यूनतम से दूरी को |1 − 2η| = ${ratio} से गुणा करता है। 1 से कम हो तो पहुँचता है; 0.5 से ऊपर η पर निशान पार करके झूलता है।`
          : `Each step multiplies the distance to the minimum by |1 − 2η| = ${ratio}. Below 1 it converges; with η above 0.5 it overshoots and zig-zags; at 1 or more it diverges.`}
      />
      <View style={tw('gap-3')}>
        <View style={tw('flex-row items-center gap-3')}>
          <Txt style={tw('text-sm text-ink-2')}>η</Txt>
          <RangeSlider min={0.05} max={1.1} step={0.05} value={lr} disabled={!!steps} onChange={setLr} ariaLabel="η" style={tw('flex-1')} />
          <Txt style={{ width: 40, fontFamily: MONO, fontSize: 14, color: COLORS.ink }}>{lr.toFixed(2)}</Txt>
        </View>
        <View style={tw('flex-row flex-wrap items-center gap-3')}>
          {!steps
            ? <Action onPress={run} disabled={!pick} testID="gd-run" icon={<Play size={16} color={COLORS.white} />} label={hi ? 'चलाएँ' : 'Run 12 steps'} />
            : <Action onPress={reset} quiet testID="gd-reset" icon={<RotateCcw size={16} color={COLORS['ink-2']} />} label={hi ? 'फिर से' : 'Try another η'} />}
          {!pick && !steps && <Txt style={tw('text-xs text-ink-3')}>{hi ? 'पहले अनुमान चुनें' : 'Pick a prediction to run'}</Txt>}
        </View>
      </View>
      <Plot>
        <Polyline points={GD_CURVE} fill="none" stroke={COLORS['line-2']} strokeWidth={2} />
        <Line x1={gdX(3)} x2={gdX(3)} y1={PAD} y2={H - PAD} stroke={COLORS.sage} strokeDasharray="4 4" />
        <SvgText x={gdX(3) + 6} y={PAD + 10} fontSize={11} fill={COLORS['ink-3']} fontFamily={LABEL}>{hi ? 'न्यूनतम' : 'minimum'}</SvgText>
        {steps && steps.slice(0, shown).map((w, i) => i > 0 && (
          <Line key={i} x1={gdX(steps[i - 1])} y1={gdY(steps[i - 1])} x2={gdX(w)} y2={gdY(w)} stroke={COLORS['marigold-600']} strokeWidth={1.5} />
        ))}
        {steps && steps.slice(0, shown).map((w, i) => <Circle key={`p${i}`} cx={gdX(w)} cy={gdY(w)} r={4} fill={i === 0 ? COLORS['ink-3'] : COLORS['sky-600']} />)}
        <SvgText x={PAD} y={H - 8} fontSize={11} fill={COLORS['ink-3']} fontFamily={LABEL}>w</SvgText>
        <SvgText x={W - PAD - 70} y={H - 8} fontSize={11} fill={COLORS['ink-3']} fontFamily={LABEL}>L(w) = (w − 3)²</SvgText>
      </Plot>
    </View>
  );
}

/* ── 2. overfitting: polynomial degree vs train / test error ───────────── */

// Fixed, seeded data: y = sin(πx) + noise; 10 training points and 10 test points.
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const DATA = (() => {
  const r = rng(7), noise = () => (r() - 0.5) * 0.5;
  const pts = (n: number, off: number) => Array.from({ length: n }, (_, i) => { const xv = -1 + (2 * (i + off)) / n; return [xv, Math.sin(Math.PI * xv) + noise()] as const; });
  return { train: pts(10, 0.25), test: pts(10, 0.75) };
})();

function fit(deg: number): number[] {
  // Least squares via normal equations with a tiny ridge for stability.
  const n = deg + 1, A: number[][] = Array.from({ length: n }, () => Array(n + 1).fill(0));
  for (const [xv, yv] of DATA.train) {
    const p = Array.from({ length: n }, (_, k) => xv ** k);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] += p[i] * p[j]; A[i][n] += p[i] * yv; }
  }
  for (let i = 0; i < n; i++) A[i][i] += 1e-6;
  for (let c = 0; c < n; c++) {
    let m = c; for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[m][c])) m = r2;
    [A[c], A[m]] = [A[m], A[c]];
    for (let r2 = 0; r2 < n; r2++) if (r2 !== c) { const f = A[r2][c] / A[c][c]; for (let k = c; k <= n; k++) A[r2][k] -= f * A[c][k]; }
  }
  return A.map((row, i) => row[n] / row[i]);
}
const evalPoly = (w: number[], xv: number) => w.reduce((s, c, k) => s + c * xv ** k, 0);
const mse = (w: number[], pts: ReadonlyArray<readonly [number, number]>) => pts.reduce((s, [xv, yv]) => s + (evalPoly(w, xv) - yv) ** 2, 0) / pts.length;
const ERRORS = Array.from({ length: 9 }, (_, i) => { const w = fit(i + 1); return { deg: i + 1, train: mse(w, DATA.train), test: mse(w, DATA.test) }; });
const BEST = ERRORS.reduce((b, e) => (e.test < b.test ? e : b)).deg;
const band = (d: number) => (d <= 2 ? 'low' : d <= 6 ? 'mid' : 'high');

function FitLab() {
  const hi = useHi();
  const [deg, setDeg] = useState(1);
  const [pick, setPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const w = useMemo(() => fit(deg), [deg]);
  const X = (xv: number) => PAD + ((xv + 1) / 2) * (W - 2 * PAD);
  const Y = (yv: number) => H / 2 - Math.max(-1.8, Math.min(1.8, yv)) * ((H - 2 * PAD) / 3.6);
  const line = Array.from({ length: 121 }, (_, i) => -1 + i / 60).map((xv) => `${X(xv)},${Y(evalPoly(w, xv))}`).join(' ');
  const e = ERRORS[deg - 1], maxE = Math.max(...ERRORS.map((v) => Math.min(v.test, 2)));
  const verdict = revealed && pick ? { right: pick === band(BEST), answer: band(BEST) } : null;

  return (
    <View style={tw('gap-4')}>
      <Predict
        question={hi ? 'किस पॉलिनोमियल डिग्री पर नए (टेस्ट) डेटा पर त्रुटि सबसे कम होगी?' : 'Which polynomial degree gives the lowest error on NEW (test) data?'}
        options={[{ id: 'low', label: hi ? 'कम (1–2)' : 'Low (1–2)' }, { id: 'mid', label: hi ? 'मध्यम (3–6)' : 'Medium (3–6)' }, { id: 'high', label: hi ? 'ऊँची (7–9)' : 'High (7–9)' }]}
        picked={pick} onPick={setPick} verdict={verdict}
        explain={hi
          ? `सबसे कम टेस्ट त्रुटि डिग्री ${BEST} पर है। ऊँची डिग्री ट्रेनिंग बिंदुओं को रट लेती है: ट्रेन त्रुटि घटती है पर टेस्ट त्रुटि बढ़ती है। यही ओवरफ़िटिंग है।`
          : `Lowest test error is at degree ${BEST}. High degrees memorise the training points: train error keeps falling while test error climbs. That's overfitting.`}
      />
      <View style={tw('flex-row items-center gap-3')}>
        <Txt style={tw('text-sm text-ink-2')}>{hi ? 'डिग्री' : 'Degree'}</Txt>
        <RangeSlider min={1} max={9} step={1} value={deg} onChange={(v) => { setDeg(v); if (pick) setRevealed(true); }} ariaLabel={hi ? 'डिग्री' : 'Degree'} style={tw('flex-1')} />
        <Txt style={{ width: 20, fontFamily: MONO, fontSize: 14, color: COLORS.ink }}>{deg}</Txt>
        {!revealed && <Action onPress={() => setRevealed(true)} disabled={!pick} label={hi ? 'जाँचें' : 'Check'} testID="fit-check" />}
      </View>
      <Plot>
        <Polyline points={line} fill="none" stroke={COLORS['marigold-600']} strokeWidth={2} />
        {DATA.train.map(([xv, yv], i) => <Circle key={`t${i}`} cx={X(xv)} cy={Y(yv)} r={4.5} fill={COLORS['sky-600']} />)}
        {DATA.test.map(([xv, yv], i) => <Circle key={`s${i}`} cx={X(xv)} cy={Y(yv)} r={4.5} fill="none" stroke={COLORS.sage} strokeWidth={2} />)}
        <SvgText x={PAD} y={16} fontSize={11} fill={COLORS['sky-600']} fontFamily={LABEL}>● {hi ? 'ट्रेन' : 'train'}</SvgText>
        <SvgText x={PAD + 60} y={16} fontSize={11} fill={COLORS.sage} fontFamily={LABEL}>○ {hi ? 'टेस्ट' : 'test'}</SvgText>
      </Plot>
      <View style={tw('flex-row gap-3')}>
        {([['train', e.train, COLORS['sky-500']], ['test', e.test, COLORS.sage]] as const).map(([k, v, c]) => (
          <View key={k} style={tw('flex-1')}>
            <Txt style={tw('text-sm text-ink-2')}>
              {k === 'train' ? (hi ? 'ट्रेन त्रुटि' : 'Train error') : (hi ? 'टेस्ट त्रुटि' : 'Test error')} <Txt style={{ fontFamily: MONO, color: COLORS.ink }}>{v.toFixed(3)}</Txt>
            </Txt>
            <ProgressBar value={Math.min(100, (v / maxE) * 100)} color={c} duration={0.3} style={tw('mt-1')} />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── 3. attention: which word does "bank" look at? ─────────────────────── */

// Tiny hand-made query/key vectors (dims: finance, water, place, function-word).
const SENTENCES = {
  river: { tokens: ['The', 'bank', 'of', 'the', 'river', 'flooded'], answer: 'river' },
  money: { tokens: ['She', 'put', 'money', 'in', 'the', 'bank'], answer: 'money' },
} as const;
const KEY: Record<string, number[]> = {
  the: [0, 0, 0, 1], of: [0, 0, 0, 1], in: [0, 0, 0, 1], she: [0, 0, 0.2, 0.5], put: [0.3, 0, 0, 0.3],
  bank: [0.4, 0.4, 1, 0], river: [0, 1.6, 0.6, 0], flooded: [0, 1.0, 0, 0], money: [1.6, 0, 0, 0],
};
const QUERY_BANK = [1.2, 1.2, 0.3, 0]; // "bank" asks: money-ish or water-ish context?

function weights(tokens: readonly string[]) {
  const s = tokens.map((t) => KEY[t.toLowerCase()].reduce((acc, k, i) => acc + k * QUERY_BANK[i], 0) / Math.sqrt(4) * 3);
  const m = Math.max(...s), e = s.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
}

function AttentionLab() {
  const hi = useHi();
  const [which, setWhich] = useState<keyof typeof SENTENCES>('river');
  const [pick, setPick] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const sent = SENTENCES[which];
  const ws = weights(sent.tokens);
  const choose = (k: keyof typeof SENTENCES) => { setWhich(k); setPick(null); setShown(false); };
  const options = sent.tokens.filter((t) => t !== 'bank').map((t) => ({ id: t, label: t }));
  const verdict = shown && pick ? { right: pick === sent.answer, answer: sent.answer } : null;

  return (
    <View style={tw('gap-4')}>
      <View style={tw('flex-row flex-wrap gap-2')}>
        {(Object.keys(SENTENCES) as Array<keyof typeof SENTENCES>).map((k) => (
          <Press key={k} onPress={() => choose(k)} testID={`sentence-${k}`}
            style={[tw('rounded-full border px-3 py-1'), which === k ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line }]}>
            <Txt style={[tw('text-sm'), { color: which === k ? COLORS.ink : COLORS['ink-2'] }]}>“{SENTENCES[k].tokens.join(' ')}”</Txt>
          </Press>
        ))}
      </View>
      <Predict
        question={hi ? '“bank” शब्द किस शब्द पर सबसे ज़्यादा ध्यान देगा?' : 'Which word will “bank” pay the most attention to?'}
        options={options} picked={pick} onPick={(id) => { setPick(id); setShown(true); }} verdict={verdict}
        explain={hi
          ? '“bank” की क्वेरी हर शब्द की की (key) से गुणा होती है; सॉफ़्टमैक्स इन्हें भार बनाता है। संदर्भ वाला शब्द सबसे मेल खाता है, इसलिए एक ही शब्द का अर्थ वाक्य के अनुसार बदलता है।'
          : "“bank”'s query is dotted with every word's key and softmax turns the scores into weights. The context word matches best, which is how the same word gets a different meaning in each sentence."}
      />
      <View style={tw('flex-row flex-wrap gap-2')}>
        {sent.tokens.map((t, i) => (
          <View key={`${which}-${i}`} style={tw('items-center')}>
            <View style={[tw('h-14 min-w-14 items-center justify-center rounded-xl border px-3'),
              { borderColor: t === 'bank' ? COLORS['marigold-600'] : COLORS.line, backgroundColor: shown ? `rgba(14,116,144,${(0.08 + ws[i] * 0.8).toFixed(3)})` : 'transparent' }]}>
              <Txt style={[tw('font-medium'), { color: shown && ws[i] > 0.45 ? COLORS.white : COLORS.ink }]}>{t}</Txt>
            </View>
            <Txt style={[tw('mt-1 text-ink-3'), { fontFamily: MONO, fontSize: 12 }]}>{shown ? ws[i].toFixed(2) : '–'}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── 4. a single neuron: can one line separate AND / OR / XOR? ─────────── */

const GATES = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], XOR: [0, 1, 1, 0] } as const;
const PTS = [[0, 0], [0, 1], [1, 0], [1, 1]] as const;

function NeuronLab() {
  const hi = useHi();
  const [gate, setGate] = useState<keyof typeof GATES>('AND');
  const [w1, setW1] = useState(1), [w2, setW2] = useState(1), [b, setB] = useState(-0.5);
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const S = 240, P = 36, X = (v: number) => P + v * (S - 2 * P), Y = (v: number) => S - P - v * (S - 2 * P);
  const out = PTS.map(([a, c]) => (w1 * a + w2 * c + b > 0 ? 1 : 0));
  const acc = out.filter((o, i) => o === GATES[gate][i]).length;
  // boundary w1·x + w2·y + b = 0, clipped to the plot
  const lo = -0.4, hiX = 1.4;
  const seg = Math.abs(w2) > 1e-6
    ? [[lo, -(w1 * lo + b) / w2], [hiX, -(w1 * hiX + b) / w2]]
    : [[-b / (w1 || 1e-6), lo], [-b / (w1 || 1e-6), hiX]];
  const truth = gate === 'XOR' ? 'no' : 'yes';
  const choose = (g: keyof typeof GATES) => { setGate(g); setPick(null); setChecked(false); };
  const sliders: Array<[string, number, (v: number) => void]> = [['w₁', w1, setW1], ['w₂', w2, setW2], ['b', b, setB]];

  return (
    <View style={tw('gap-4')}>
      <View style={tw('flex-row gap-2')}>
        {(Object.keys(GATES) as Array<keyof typeof GATES>).map((g) => (
          <Press key={g} onPress={() => choose(g)} testID={`gate-${g}`}
            style={[tw('rounded-full border px-3 py-1'), gate === g ? { borderColor: COLORS['sky-500'], backgroundColor: COLORS['sky-50'] } : { borderColor: COLORS.line }]}>
            <Txt style={{ fontFamily: MONO, fontSize: 14, color: gate === g ? COLORS.ink : COLORS['ink-2'] }}>{g}</Txt>
          </Press>
        ))}
      </View>
      <Predict
        question={hi ? `क्या एक न्यूरॉन (एक सीधी रेखा) ${gate} के चारों बिंदु सही बाँट सकता है?` : `Can one neuron (one straight line) get all 4 points of ${gate} right?`}
        options={[{ id: 'yes', label: hi ? 'हाँ' : 'Yes' }, { id: 'no', label: hi ? 'नहीं' : 'No, impossible' }]}
        picked={pick} onPick={(id) => { setPick(id); setChecked(true); }} verdict={checked && pick ? { right: pick === truth, answer: truth } : null}
        explain={gate === 'XOR'
          ? (hi ? 'XOR के बिंदु तिरछे हैं; कोई एक रेखा उन्हें अलग नहीं कर सकती। इसीलिए नेटवर्क में कई परतें (hidden layers) चाहिए।' : "XOR's points sit diagonally; no single line separates them. That's why neural networks need hidden layers.")
          : (hi ? `${gate} रैखिक रूप से अलग किया जा सकता है, स्लाइडर से रेखा खिसकाकर 4/4 पाइए।` : `${gate} is linearly separable. Drag the sliders until you hit 4/4.`)} />
      <View style={tw('items-center gap-4')}>
        <Plot width={S} height={S} maxWidth={240}>
          <Defs><ClipPath id="nclip"><Rect x={4} y={4} width={S - 8} height={S - 8} rx={12} /></ClipPath></Defs>
          <Line clipPath="url(#nclip)" x1={X(seg[0][0])} y1={Y(seg[0][1])} x2={X(seg[1][0])} y2={Y(seg[1][1])} stroke={COLORS['marigold-600']} strokeWidth={2.5} strokeDasharray="6 4" />
          {PTS.map(([a, c], i) => {
            const want = GATES[gate][i], ok = out[i] === want;
            return (
              <G key={i}>
                <Circle cx={X(a)} cy={Y(c)} r={14} fill="none" stroke={ok ? COLORS.sage : COLORS.rose} strokeWidth={2} />
                <Circle cx={X(a)} cy={Y(c)} r={9} fill={want ? COLORS['sky-600'] : COLORS.surface} stroke={COLORS['sky-600']} strokeWidth={2} />
                <SvgText x={X(a)} y={Y(c) + 30} textAnchor="middle" fontSize={10} fill={COLORS['ink-3']} fontFamily={LABEL}>({a},{c})</SvgText>
              </G>
            );
          })}
        </Plot>
        <View style={tw('w-full gap-3')}>
          {sliders.map(([k, v, set]) => (
            <View key={k} style={tw('flex-row items-center gap-3')}>
              <Txt style={{ width: 24, fontFamily: MONO, fontSize: 14, color: COLORS['ink-2'] }}>{k}</Txt>
              <RangeSlider min={-2} max={2} step={0.1} value={v} onChange={set} ariaLabel={k} style={tw('min-w-0 flex-1')} />
              <Txt style={{ width: 40, textAlign: 'right', fontFamily: MONO, fontSize: 14, color: COLORS.ink }}>{v.toFixed(1)}</Txt>
            </View>
          ))}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[tw('rounded-xl'), { backgroundColor: acc === 4 ? COLORS['sage-100'] : COLORS['paper-2'] }]} contentContainerStyle={tw('flex-row items-baseline gap-2 px-4 py-3')}>
            <Txt testID="neuron-score" style={{ fontFamily: MONO, fontSize: 18, fontWeight: '600', color: COLORS.ink }}>{acc}/4</Txt>
            <Txt style={[tw('text-sm'), { color: acc === 4 ? COLORS.ink : COLORS['ink-2'] }]}>{hi ? 'सही' : 'correct'}</Txt>
            <Txt style={{ fontFamily: MONO, fontSize: 12, color: COLORS['ink-3'] }}>fire if {w1.toFixed(1)}·x₁ + {w2.toFixed(1)}·x₂ + {b.toFixed(1)} {'>'} 0</Txt>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
