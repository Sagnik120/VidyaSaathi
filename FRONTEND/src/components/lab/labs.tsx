"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Play, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { cn } from "@/lib/utils";

/* ── registry ──────────────────────────────────────────────────────────── */

export const LABS = [
  { id: "gd", en: "Gradient descent", hi: "ग्रेडिएंट डिसेंट", keys: ["gradient", "learning rate", "optimi", "ग्रेडिएंट"] },
  { id: "fit", en: "Overfitting", hi: "ओवरफ़िटिंग", keys: ["overfit", "underfit", "generali", "regulari", "ओवरफ़िट"] },
  { id: "neuron", en: "A neuron", hi: "न्यूरॉन", keys: ["neuron", "perceptron", "neural", "न्यूरॉन"] },
  { id: "attn", en: "Attention", hi: "अटेंशन", keys: ["attention", "transformer", "अटेंशन"] },
] as const;
export type LabId = (typeof LABS)[number]["id"];

/** Simulations relevant to some text (concept names, a lesson title). */
export function labsFor(text: string) {
  const low = (text || "").toLowerCase();
  return LABS.filter((l) => l.keys.some((k) => low.includes(k)));
}

export function Lab({ id }: { id: LabId }) {
  return id === "gd" ? <GradientLab /> : id === "fit" ? <FitLab /> : id === "neuron" ? <NeuronLab /> : <AttentionLab />;
}

/* ── shared predict → run → check frame ────────────────────────────────── */

function useHi() { const { lang } = useI18n(); return lang === "hi"; }

function Predict({ question, options, picked, onPick, verdict, explain }: {
  question: string; options: Array<{ id: string; label: string }>; picked: string | null; onPick: (id: string) => void;
  verdict: null | { right: boolean; answer: string }; explain: ReactNode;
}) {
  const hi = useHi();
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{hi ? "पहले अनुमान लगाइए" : "Predict first"}</p>
      <p className="mt-1 font-medium text-ink">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => onPick(o.id)} disabled={!!verdict}
            className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors",
              picked === o.id ? "border-sky-500 bg-sky-50 font-medium text-ink" : "border-line text-ink-2 hover:border-sky-300",
              verdict && o.id === verdict.answer && "border-sage bg-sage-100 text-ink")}>
            {o.label}
          </button>
        ))}
      </div>
      {verdict && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className={cn("mt-3 flex gap-2 rounded-xl p-3 text-sm", verdict.right ? "bg-sage-100 text-ink" : "bg-marigold-100 text-ink")}>
          {verdict.right ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-marigold-600" />}
          <div>{verdict.right ? (hi ? "सही अनुमान! " : "Right prediction! ") : (hi ? "इस बार नहीं। " : "Not this time. ")}{explain}</div>
        </motion.div>
      )}
    </div>
  );
}

const W = 520, H = 240, PAD = 28;

/* ── 1. gradient descent on L(w) = (w - 3)² ────────────────────────────── */

type GdOutcome = "smooth" | "zigzag" | "diverge";
function gdOutcome(lr: number): GdOutcome {
  const r = Math.abs(1 - 2 * lr);           // each step multiplies the distance to the minimum by |1 − 2η|
  return r >= 1 ? "diverge" : lr > 0.5 ? "zigzag" : "smooth";
}

function GradientLab() {
  const hi = useHi();
  const [lr, setLr] = useState(0.3);
  const [pick, setPick] = useState<string | null>(null);
  const [steps, setSteps] = useState<number[] | null>(null);
  const x = (w: number) => PAD + ((w + 2) / 10) * (W - 2 * PAD);
  const y = (w: number) => H - PAD - (Math.min((w - 3) ** 2, 25) / 25) * (H - 2 * PAD);
  const curve = useMemo(() => Array.from({ length: 101 }, (_, i) => -2 + i / 10).map((w) => `${x(w)},${y(w)}`).join(" "), []);

  const run = () => {
    const ws = [-1];
    for (let i = 0; i < 12; i++) ws.push(ws[ws.length - 1] - lr * 2 * (ws[ws.length - 1] - 3));
    setSteps(ws.map((w) => Math.max(-2, Math.min(8, w))));
  };
  const reset = () => { setSteps(null); setPick(null); };
  const truth = gdOutcome(lr);
  const verdict = steps && pick ? { right: pick === truth, answer: truth } : null;

  return (
    <div className="space-y-4">
      <Predict
        question={hi ? `सीखने की दर η = ${lr.toFixed(2)} पर, w = −1 से शुरू करके, क्या होगा?` : `With learning rate η = ${lr.toFixed(2)}, starting at w = −1, what happens?`}
        options={[{ id: "smooth", label: hi ? "धीरे-धीरे न्यूनतम तक" : "Slides smoothly to the minimum" },
                  { id: "zigzag", label: hi ? "आगे-पीछे झूलकर पहुँचता है" : "Zig-zags but gets there" },
                  { id: "diverge", label: hi ? "कभी नहीं पहुँचता" : "Never settles (blows up)" }]}
        picked={pick} onPick={setPick} verdict={verdict}
        explain={hi ? <>हर कदम न्यूनतम से दूरी को |1 − 2η| = {Math.abs(1 - 2 * lr).toFixed(2)} से गुणा करता है। 1 से कम हो तो पहुँचता है; 0.5 से ऊपर η पर निशान पार करके झूलता है।</>
                    : <>Each step multiplies the distance to the minimum by |1 − 2η| = {Math.abs(1 - 2 * lr).toFixed(2)}. Below 1 it converges; with η above 0.5 it overshoots and zig-zags; at 1 or more it diverges.</>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-2">η
          <input type="range" min={0.05} max={1.1} step={0.05} value={lr} disabled={!!steps} onChange={(e) => setLr(Number(e.target.value))} className="w-48 accent-[var(--sky-600)]" />
          <span className="w-10 font-mono text-ink">{lr.toFixed(2)}</span>
        </label>
        {!steps
          ? <button onClick={run} disabled={!pick} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" />{hi ? "चलाएँ" : "Run 12 steps"}</button>
          : <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink"><RotateCcw className="h-4 w-4" />{hi ? "फिर से" : "Try another η"}</button>}
        {!pick && !steps && <span className="text-xs text-ink-3">{hi ? "पहले अनुमान चुनें" : "Pick a prediction to run"}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl border border-line bg-surface">
        <polyline points={curve} fill="none" stroke="var(--line-2)" strokeWidth={2} />
        <line x1={x(3)} x2={x(3)} y1={PAD} y2={H - PAD} stroke="var(--sage)" strokeDasharray="4 4" />
        <text x={x(3) + 6} y={PAD + 10} fontSize="11" fill="var(--ink-3)">{hi ? "न्यूनतम" : "minimum"}</text>
        {steps && steps.map((w, i) => i > 0 && (
          <motion.line key={i} x1={x(steps[i - 1])} y1={y(steps[i - 1])} x2={x(w)} y2={y(w)} stroke="var(--marigold-600)" strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: i * 0.18, duration: 0.18 }} />
        ))}
        {steps && steps.map((w, i) => (
          <motion.circle key={`p${i}`} cx={x(w)} cy={y(w)} r={4} fill={i === 0 ? "var(--ink-3)" : "var(--sky-600)"}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.18 }} />
        ))}
        <text x={PAD} y={H - 8} fontSize="11" fill="var(--ink-3)">w</text>
        <text x={W - PAD - 70} y={H - 8} fontSize="11" fill="var(--ink-3)">L(w) = (w − 3)²</text>
      </svg>
    </div>
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
  const n = deg + 1, A = Array.from({ length: n }, () => Array(n + 1).fill(0));
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
const band = (d: number) => (d <= 2 ? "low" : d <= 6 ? "mid" : "high");

function FitLab() {
  const hi = useHi();
  const [deg, setDeg] = useState(1);
  const [pick, setPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const w = useMemo(() => fit(deg), [deg]);
  const X = (xv: number) => PAD + ((xv + 1) / 2) * (W - 2 * PAD);
  const Y = (yv: number) => H / 2 - Math.max(-1.8, Math.min(1.8, yv)) * ((H - 2 * PAD) / 3.6);
  const line = Array.from({ length: 121 }, (_, i) => -1 + i / 60).map((xv) => `${X(xv)},${Y(evalPoly(w, xv))}`).join(" ");
  const e = ERRORS[deg - 1], maxE = Math.max(...ERRORS.map((v) => Math.min(v.test, 2)));
  const verdict = revealed && pick ? { right: pick === band(BEST), answer: band(BEST) } : null;

  return (
    <div className="space-y-4">
      <Predict
        question={hi ? "किस पॉलिनोमियल डिग्री पर नए (टेस्ट) डेटा पर त्रुटि सबसे कम होगी?" : "Which polynomial degree gives the lowest error on NEW (test) data?"}
        options={[{ id: "low", label: hi ? "कम (1–2)" : "Low (1–2)" }, { id: "mid", label: hi ? "मध्यम (3–6)" : "Medium (3–6)" }, { id: "high", label: hi ? "ऊँची (7–9)" : "High (7–9)" }]}
        picked={pick} onPick={setPick} verdict={verdict}
        explain={hi ? <>सबसे कम टेस्ट त्रुटि डिग्री {BEST} पर है। ऊँची डिग्री ट्रेनिंग बिंदुओं को रट लेती है: ट्रेन त्रुटि घटती है पर टेस्ट त्रुटि बढ़ती है। यही ओवरफ़िटिंग है।</>
                    : <>Lowest test error is at degree {BEST}. High degrees memorise the training points: train error keeps falling while test error climbs. That&apos;s overfitting.</>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-2">{hi ? "डिग्री" : "Degree"}
          <input type="range" min={1} max={9} step={1} value={deg} onChange={(ev) => { setDeg(Number(ev.target.value)); if (pick) setRevealed(true); }} className="w-48 accent-[var(--sky-600)]" />
          <span className="w-6 font-mono text-ink">{deg}</span>
        </label>
        {!revealed && <button onClick={() => setRevealed(true)} disabled={!pick} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{hi ? "जाँचें" : "Check"}</button>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl border border-line bg-surface">
        <polyline points={line} fill="none" stroke="var(--marigold-600)" strokeWidth={2} />
        {DATA.train.map(([xv, yv], i) => <circle key={`t${i}`} cx={X(xv)} cy={Y(yv)} r={4.5} fill="var(--sky-600)" />)}
        {DATA.test.map(([xv, yv], i) => <circle key={`s${i}`} cx={X(xv)} cy={Y(yv)} r={4.5} fill="none" stroke="var(--sage)" strokeWidth={2} />)}
        <text x={PAD} y={16} fontSize="11" fill="var(--sky-600)">● {hi ? "ट्रेन" : "train"}</text>
        <text x={PAD + 60} y={16} fontSize="11" fill="var(--sage)">○ {hi ? "टेस्ट" : "test"}</text>
      </svg>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[["train", e.train, "bg-sky-500"], ["test", e.test, "bg-sage"]].map(([k, v, c]) => (
          <div key={k as string}>
            <p className="text-ink-2">{k === "train" ? (hi ? "ट्रेन त्रुटि" : "Train error") : (hi ? "टेस्ट त्रुटि" : "Test error")} <span className="font-mono text-ink">{(v as number).toFixed(3)}</span></p>
            <div className="mt-1 h-2 rounded-full bg-paper-3"><motion.div className={cn("h-full rounded-full", c as string)} animate={{ width: `${Math.min(100, ((v as number) / maxE) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3. attention: which word does "bank" look at? ─────────────────────── */

// Tiny hand-made query/key vectors (dims: finance, water, place, function-word).
const SENTENCES = {
  river: { tokens: ["The", "bank", "of", "the", "river", "flooded"], answer: "river" },
  money: { tokens: ["She", "put", "money", "in", "the", "bank"], answer: "money" },
} as const;
const KEY: Record<string, number[]> = {
  the: [0, 0, 0, 1], of: [0, 0, 0, 1], in: [0, 0, 0, 1], she: [0, 0, 0.2, 0.5], put: [0.3, 0, 0, 0.3],
  bank: [0.4, 0.4, 1, 0], river: [0, 1.6, 0.6, 0], flooded: [0, 1.0, 0, 0], money: [1.6, 0, 0, 0],
};
const QUERY_BANK = [1.2, 1.2, 0.3, 0];       // "bank" asks: money-ish or water-ish context?

function weights(tokens: readonly string[]) {
  const s = tokens.map((t) => KEY[t.toLowerCase()].reduce((acc, k, i) => acc + k * QUERY_BANK[i], 0) / Math.sqrt(4) * 3);
  const m = Math.max(...s), e = s.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
}

function AttentionLab() {
  const hi = useHi();
  const [which, setWhich] = useState<keyof typeof SENTENCES>("river");
  const [pick, setPick] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const sent = SENTENCES[which];
  const ws = weights(sent.tokens);
  const choose = (k: keyof typeof SENTENCES) => { setWhich(k); setPick(null); setShown(false); };
  const options = sent.tokens.filter((t) => t !== "bank").map((t) => ({ id: t, label: t }));
  const verdict = shown && pick ? { right: pick === sent.answer, answer: sent.answer } : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {(Object.keys(SENTENCES) as Array<keyof typeof SENTENCES>).map((k) => (
          <button key={k} onClick={() => choose(k)} className={cn("rounded-full border px-3 py-1", which === k ? "border-sky-500 bg-sky-50 text-ink" : "border-line text-ink-2")}>
            “{SENTENCES[k].tokens.join(" ")}”
          </button>
        ))}
      </div>
      <Predict
        question={hi ? "“bank” शब्द किस शब्द पर सबसे ज़्यादा ध्यान देगा?" : "Which word will “bank” pay the most attention to?"}
        options={options} picked={pick} onPick={(id) => { setPick(id); setShown(true); }} verdict={verdict}
        explain={hi ? <>“bank” की क्वेरी हर शब्द की की (key) से गुणा होती है; सॉफ़्टमैक्स इन्हें भार बनाता है। संदर्भ वाला शब्द सबसे मेल खाता है, इसलिए एक ही शब्द का अर्थ वाक्य के अनुसार बदलता है।</>
                    : <>“bank”&apos;s query is dotted with every word&apos;s key and softmax turns the scores into weights. The context word matches best, which is how the same word gets a different meaning in each sentence.</>}
      />
      <div className="flex flex-wrap gap-2">
        {sent.tokens.map((t, i) => (
          <div key={`${which}-${i}`} className="text-center">
            <motion.div className="grid h-14 min-w-14 place-items-center rounded-xl border px-3 font-medium text-ink"
              animate={{ backgroundColor: shown ? `rgba(14,116,144,${0.08 + ws[i] * 0.8})` : "rgba(0,0,0,0)", color: shown && ws[i] > 0.45 ? "#fff" : "var(--ink)" }}
              style={{ borderColor: t === "bank" ? "var(--marigold-600)" : "var(--line)" }}>{t}</motion.div>
            <p className="mt-1 font-mono text-xs text-ink-3">{shown ? ws[i].toFixed(2) : "–"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 4. a single neuron: can one line separate AND / OR / XOR? ─────────── */

const GATES = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], XOR: [0, 1, 1, 0] } as const;
const PTS = [[0, 0], [0, 1], [1, 0], [1, 1]] as const;

function NeuronLab() {
  const hi = useHi();
  const [gate, setGate] = useState<keyof typeof GATES>("AND");
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
  const truth = gate === "XOR" ? "no" : "yes";
  const choose = (g: keyof typeof GATES) => { setGate(g); setPick(null); setChecked(false); };
  const sliders: Array<[string, number, (v: number) => void]> = [["w₁", w1, setW1], ["w₂", w2, setW2], ["b", b, setB]];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {(Object.keys(GATES) as Array<keyof typeof GATES>).map((g) => (
          <button key={g} onClick={() => choose(g)} className={cn("rounded-full border px-3 py-1 font-mono", gate === g ? "border-sky-500 bg-sky-50 text-ink" : "border-line text-ink-2")}>{g}</button>
        ))}
      </div>
      <Predict
        question={hi ? `क्या एक न्यूरॉन (एक सीधी रेखा) ${gate} के चारों बिंदु सही बाँट सकता है?` : `Can one neuron (one straight line) get all 4 points of ${gate} right?`}
        options={[{ id: "yes", label: hi ? "हाँ" : "Yes" }, { id: "no", label: hi ? "नहीं" : "No, impossible" }]}
        picked={pick} onPick={(id) => { setPick(id); setChecked(true); }} verdict={checked && pick ? { right: pick === truth, answer: truth } : null}
        explain={gate === "XOR"
          ? (hi ? <>XOR के बिंदु तिरछे हैं; कोई एक रेखा उन्हें अलग नहीं कर सकती। इसीलिए नेटवर्क में कई परतें (hidden layers) चाहिए।</> : <>XOR&apos;s points sit diagonally; no single line separates them. That&apos;s why neural networks need hidden layers.</>)
          : (hi ? <>{gate} रैखिक रूप से अलग किया जा सकता है, स्लाइडर से रेखा खिसकाकर 4/4 पाइए।</> : <>{gate} is linearly separable. Drag the sliders until you hit 4/4.</>)} />
      <div className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[240px] rounded-2xl border border-line bg-surface">
          <defs><clipPath id="nclip"><rect x={4} y={4} width={S - 8} height={S - 8} rx={12} /></clipPath></defs>
          <motion.line clipPath="url(#nclip)" animate={{ x1: X(seg[0][0]), y1: Y(seg[0][1]), x2: X(seg[1][0]), y2: Y(seg[1][1]) }} stroke="var(--marigold-600)" strokeWidth={2.5} strokeDasharray="6 4" />
          {PTS.map(([a, c], i) => {
            const want = GATES[gate][i], ok = out[i] === want;
            return (
              <g key={i}>
                <motion.circle cx={X(a)} cy={Y(c)} r={14} fill="none" stroke={ok ? "var(--sage)" : "var(--rose)"} strokeWidth={2} animate={{ scale: ok ? 1 : [1, 1.25, 1] }} transition={{ duration: 0.4 }} />
                <circle cx={X(a)} cy={Y(c)} r={9} fill={want ? "var(--sky-600)" : "var(--surface)"} stroke="var(--sky-600)" strokeWidth={2} />
                <text x={X(a)} y={Y(c) + 30} textAnchor="middle" fontSize="10" fill="var(--ink-3)">({a},{c})</text>
              </g>
            );
          })}
        </svg>
        <div className="space-y-3">
          {sliders.map(([k, v, set]) => (
            <label key={k} className="flex items-center gap-3 text-sm text-ink-2">
              <span className="w-6 font-mono">{k}</span>
              <input type="range" min={-2} max={2} step={0.1} value={v} onChange={(e) => set(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--sky-600)]" />
              <span className="w-10 text-right font-mono text-ink">{v.toFixed(1)}</span>
            </label>
          ))}
          <div className={cn("rounded-xl px-4 py-3 text-sm", acc === 4 ? "bg-sage-100 text-ink" : "bg-paper-2 text-ink-2")}>
            <span className="font-mono text-lg font-semibold text-ink">{acc}/4</span> {hi ? "सही" : "correct"}
            <span className="ml-2 font-mono text-xs text-ink-3">fire if {w1.toFixed(1)}·x₁ + {w2.toFixed(1)}·x₂ + {b.toFixed(1)} &gt; 0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
