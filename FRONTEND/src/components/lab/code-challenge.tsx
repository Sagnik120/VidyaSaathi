"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Circle, Lightbulb, Loader2, Lock, Play, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { cn, EASE } from "@/lib/utils";

/* ── challenges: ~80% given, the learner writes the key lines ─────────── */

type Test = { call: string; expect: string; hidden?: boolean };
type Challenge = { id: string; title: string; hi: string; concept: string; brief: string; prefix: string; blank: string; suffix: string; hint: string; why: string; tests: Test[] };

export const CHALLENGES: Challenge[] = [
  {
    id: "neuron", title: "A single neuron", hi: "एक न्यूरॉन", concept: "Perceptron",
    brief: "Multiply each input by its weight, add the bias, and fire (return 1) only if the total is above 0.",
    prefix: "def neuron(inputs, weights, bias):\n    total = bias\n    for x, w in zip(inputs, weights):\n",
    blank: "        # add x * w to total\n        \n", suffix: "    return 1 if total > 0 else 0\n",
    hint: "total += x * w", why: "This weighted sum + threshold is exactly what every neuron in a neural network computes.",
    tests: [{ call: "neuron([1, 1], [0.5, 0.5], -0.7)", expect: "1" }, { call: "neuron([1, 0], [0.5, 0.5], -0.7)", expect: "0" }, { call: "neuron([0, 0], [1, 1], 0.1)", expect: "1" }, { call: "neuron([2, 3], [-1, 1], -2)", expect: "0" }, { call: "neuron([1, 1, 1], [1, 1, 1], -3)", expect: "0", hidden: true }, { call: "neuron([], [], 0.5)", expect: "1", hidden: true }],
  },
  {
    id: "mse", title: "Mean squared error", hi: "मीन स्क्वेयर्ड एरर", concept: "Loss functions",
    brief: "Return the average of the squared differences between true values and predictions.",
    prefix: "def mse(y_true, y_pred):\n    total = 0\n    for t, p in zip(y_true, y_pred):\n",
    blank: "        # add the squared error\n        \n    # return the mean\n    \n", suffix: "",
    hint: "total += (t - p) ** 2   then   return total / len(y_true)", why: "MSE punishes big mistakes more than small ones because the error is squared.",
    tests: [{ call: "mse([1, 2, 3], [1, 2, 3])", expect: "0" }, { call: "mse([1, 2], [1, 4])", expect: "2.0" }, { call: "mse([0, 0, 0, 0], [1, -1, 1, -1])", expect: "1.0" }, { call: "mse([3], [0])", expect: "9" }, { call: "mse([2.5, -1], [0.5, 1])", expect: "4.0", hidden: true }, { call: "mse([10] * 5, [0] * 5)", expect: "100", hidden: true }],
  },
  {
    id: "accuracy", title: "Accuracy", hi: "एक्यूरेसी", concept: "Model evaluation",
    brief: "Count how many predictions match the labels and return the fraction that are correct.",
    prefix: "def accuracy(labels, preds):\n", blank: "    correct = 0\n    # count matches\n    \n", suffix: "    return correct / len(labels)\n",
    hint: "for l, p in zip(labels, preds):\n        if l == p: correct += 1", why: "Accuracy is the simplest metric, but on imbalanced data it can look great while the model is useless.",
    tests: [{ call: "accuracy([1, 0, 1, 1], [1, 0, 0, 1])", expect: "0.75" }, { call: "accuracy(['cat', 'dog'], ['cat', 'dog'])", expect: "1.0" }, { call: "accuracy([0, 0, 0], [1, 1, 1])", expect: "0.0" }, { call: "accuracy([1], [1])", expect: "1.0", hidden: true }, { call: "accuracy([1, 2, 3, 4, 5], [1, 0, 3, 0, 5])", expect: "0.6", hidden: true }],
  },
  {
    id: "gd", title: "One gradient descent step", hi: "ग्रेडिएंट डिसेंट का एक कदम", concept: "Optimisation",
    brief: "Loss is L(w) = (w − 3)². Its gradient is 2(w − 3). Move w against the gradient, scaled by the learning rate.",
    prefix: "def step(w, lr):\n    grad = 2 * (w - 3)\n", blank: "    # return the updated w\n    \n", suffix: "",
    hint: "return w - lr * grad", why: "Repeat this step and w slides down to 3, the minimum. Too big an lr and it overshoots (try the simulation!).",
    tests: [{ call: "step(5, 0.1)", expect: "4.6" }, { call: "step(3, 0.5)", expect: "3" }, { call: "step(-1, 0.25)", expect: "1.0" }, { call: "step(0, 0.5)", expect: "3.0" }, { call: "step(3.5, 1.0)", expect: "2.5", hidden: true }, { call: "step(100, 0)", expect: "100", hidden: true }],
  },
  {
    id: "dist", title: "Distance for k-NN", hi: "k-NN के लिए दूरी", concept: "Nearest neighbours",
    brief: "Return the Euclidean distance between two points a and b of any dimension.",
    prefix: "import math\n\ndef distance(a, b):\n    total = 0\n", blank: "    # sum the squared differences\n    \n    \n", suffix: "    return math.sqrt(total)\n",
    hint: "for x, y in zip(a, b):\n        total += (x - y) ** 2", why: "k-NN classifies a point by the labels of the points closest to it, and this is what 'closest' means.",
    tests: [{ call: "distance([0, 0], [3, 4])", expect: "5" }, { call: "distance([1, 1, 1], [1, 1, 1])", expect: "0" }, { call: "distance([1], [-2])", expect: "3" }, { call: "distance([-1, -1], [2, 3])", expect: "5", hidden: true }, { call: "distance([0, 0, 0, 0], [1, 1, 1, 1])", expect: "2", hidden: true }],
  },
  {
    id: "softmax", title: "Softmax", hi: "सॉफ़्टमैक्स", concept: "Probabilities",
    brief: "Turn scores into probabilities: exponentiate each score, then divide by the total so they sum to 1.",
    prefix: "import math\n\ndef softmax(scores):\n    exps = [math.exp(s) for s in scores]\n", blank: "    # total, then divide each exp by it\n    \n    \n", suffix: "",
    hint: "total = sum(exps)\n    return [e / total for e in exps]", why: "Softmax is how a classifier (and attention!) turns raw scores into a probability distribution.",
    tests: [{ call: "softmax([0, 0])", expect: "[0.5, 0.5]" }, { call: "round(sum(softmax([1, 2, 3])), 6)", expect: "1.0" }, { call: "softmax([1, 2, 3]).index(max(softmax([1, 2, 3])))", expect: "2" }, { call: "softmax([math.log(1), math.log(3)])", expect: "[0.25, 0.75]" }, { call: "softmax([-2, -2, -2, -2])", expect: "[0.25, 0.25, 0.25, 0.25]", hidden: true }, { call: "softmax([5])", expect: "[1.0]", hidden: true }],
  },
];

/* ── pyodide, loaded once on first run ─────────────────────────────────── */

type Py = { runPython: (code: string) => unknown; globals: { get: (k: string) => unknown } };
let pyPromise: Promise<Py> | null = null;
function loadPy(): Promise<Py> {
  if (pyPromise) return pyPromise;
  const base = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
  pyPromise = new Promise<Py>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${base}pyodide.js`;
    s.onload = () => (window as unknown as { loadPyodide: (o: object) => Promise<Py> }).loadPyodide({ indexURL: base }).then(resolve, reject);
    s.onerror = () => reject(new Error("Could not load the Python runtime."));
    document.head.appendChild(s);
  }).catch((e) => { pyPromise = null; throw e; });
  return pyPromise;
}

// Runs one test in a fresh namespace; returns [passed, shown value].
const HARNESS = `
def _close(a, b):
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(_close(x, y) for x, y in zip(a, b))
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return abs(a - b) < 1e-6
    return a == b

def _run(src, call, expect):
    ns = {}
    try:
        exec(src, ns)
        got = eval(call, ns)
    except Exception as e:
        return [False, type(e).__name__ + ": " + str(e)]
    return [_close(got, eval(expect)), repr(got)]
`;

const STORE = "shikshak.codeSolved";
const readSolved = (): string[] => { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; } };
const writeSolved = (v: string[]) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* storage blocked */ } };

type Result = { state: "wait" | "run" | "pass" | "fail"; got?: string };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── UI ────────────────────────────────────────────────────────────────── */

export function CodeChallenges({ onSolvedChange }: { onSolvedChange?: (n: number) => void }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [solved, setSolved] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const s = readSolved();
    setSolved(s);
    const first = CHALLENGES.findIndex((c) => !s.includes(c.id));
    setIdx(first < 0 ? 0 : first);
  }, []);
  useEffect(() => { onSolvedChange?.(solved.length); }, [solved, onSolvedChange]);

  const markSolved = (id: string) => setSolved((s) => { const v = s.includes(id) ? s : [...s, id]; writeSolved(v); return v; });
  const unlocked = (i: number) => i === 0 || solved.includes(CHALLENGES[i - 1].id) || solved.includes(CHALLENGES[i].id);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {CHALLENGES.map((c, i) => {
          const done = solved.includes(c.id), open = unlocked(i);
          return (
            <li key={c.id} className="shrink-0">
              <button disabled={!open} onClick={() => setIdx(i)}
                className={cn("flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  i === idx ? "border-sky-400 bg-sky-50 shadow-[var(--shadow-soft)]" : "border-line bg-surface hover:border-sky-300", !open && "cursor-not-allowed opacity-50")}>
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  done ? "bg-sage text-white" : i === idx ? "bg-sky-600 text-white" : "bg-paper-3 text-ink-3")}>
                  {done ? <Check className="h-3.5 w-3.5" /> : open ? i + 1 : <Lock className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{hi ? c.hi : c.title}</span>
                  <span className="block truncate text-xs text-ink-3">{c.concept}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <Editor key={CHALLENGES[idx].id} c={CHALLENGES[idx]} hi={hi} solved={solved.includes(CHALLENGES[idx].id)}
        onPass={() => markSolved(CHALLENGES[idx].id)}
        onNext={idx < CHALLENGES.length - 1 ? () => setIdx(idx + 1) : undefined} />
    </div>
  );
}

function Editor({ c, hi, solved, onPass, onNext }: { c: Challenge; hi: boolean; solved: boolean; onPass: () => void; onNext?: () => void }) {
  const [code, setCode] = useState(c.blank);
  const [results, setResults] = useState<Result[]>(c.tests.map(() => ({ state: "wait" })));
  const [phase, setPhase] = useState<"idle" | "loading" | "running" | "pass" | "fail">("idle");
  const [hint, setHint] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const lines = (s: string) => (s ? s.replace(/\n$/, "").split("\n") : []);
  const pre = lines(c.prefix), post = lines(c.suffix);
  const rows = Math.max(3, code.split("\n").length);

  const run = async () => {
    setErr(null);
    setResults(c.tests.map(() => ({ state: "wait" })));
    setPhase("loading");
    let py: Py;
    try { py = await loadPy(); py.runPython(HARNESS); } catch (e) { setErr((e as Error).message); setPhase("idle"); return; }
    setPhase("running");
    const src = c.prefix + code + (code.endsWith("\n") ? "" : "\n") + c.suffix;
    const runOne = py.globals.get("_run") as (s: string, call: string, exp: string) => { toJs: () => [boolean, string]; destroy: () => void };
    let all = true;
    for (let i = 0; i < c.tests.length; i++) {
      setResults((r) => r.map((x, j) => (j === i ? { state: "run" } : x)));
      await sleep(380);
      const out = runOne(src, c.tests[i].call, c.tests[i].expect);
      const [ok, got] = out.toJs(); out.destroy();
      all &&= ok;
      setResults((r) => r.map((x, j) => (j === i ? { state: ok ? "pass" : "fail", got } : x)));
    }
    setPhase(all ? "pass" : "fail");
    if (all) onPass();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget, a = el.selectionStart, b = el.selectionEnd;
      setCode(code.slice(0, a) + "    " + code.slice(b));
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4; });
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void run(); }
  };

  const passed = results.filter((r) => r.state === "pass").length;
  const busy = phase === "loading" || phase === "running";

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{c.concept}{solved && <span className="ml-2 text-sage">· {hi ? "हल किया" : "Solved"}</span>}</p>
        <h3 className="mt-1 font-display text-3xl text-ink">{hi ? c.hi : c.title}</h3>
        <p className="mt-1 text-sm text-ink-2">{c.brief}</p>
      </div>

      {/* editor: locked lines around an editable block */}
      <div className="overflow-hidden rounded-2xl border border-[#1f2a37] bg-[#0f172a] font-mono text-[13px] leading-6 text-slate-200 shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs text-slate-400">{c.id}.py</span>
          <span className="ml-auto text-[11px] text-slate-500">{hi ? "हाइलाइट वाली पंक्तियाँ लिखें" : "Write the highlighted lines"}</span>
        </div>
        <div className="overflow-x-auto py-3">
          {pre.map((l, i) => <CodeLine key={`a${i}`} n={i + 1} text={l} />)}
          <div className="relative flex border-y border-sky-400/30 bg-sky-400/[0.07]">
            <div className="w-10 shrink-0 select-none pr-3 text-right text-sky-300/60">
              {Array.from({ length: rows }, (_, i) => <div key={i}>{pre.length + i + 1}</div>)}
            </div>
            <textarea ref={ta} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKey} spellCheck={false} rows={rows}
              aria-label="Your code" className="min-w-0 flex-1 resize-none whitespace-pre bg-transparent pr-4 text-sky-50 caret-sky-300 outline-none placeholder:text-slate-500" />
          </div>
          {post.map((l, i) => <CodeLine key={`b${i}`} n={pre.length + rows + i + 1} text={l} />)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => void run()} disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {phase === "loading" ? (hi ? "Python लोड हो रहा है…" : "Loading Python…") : (hi ? "टेस्ट चलाएँ" : "Run tests")}
        </button>
        <button onClick={() => setHint((h) => !h)} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm text-ink-2 hover:text-ink">
          <Lightbulb className="h-4 w-4" />{hi ? "संकेत" : "Hint"}
        </button>
        <button onClick={() => { setCode(c.blank); setPhase("idle"); setResults(c.tests.map(() => ({ state: "wait" }))); ta.current?.focus(); }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm text-ink-2 hover:text-ink">
          <RotateCcw className="h-4 w-4" />{hi ? "रीसेट" : "Reset"}
        </button>
        <span className="ml-auto hidden text-xs text-ink-3 sm:inline">⌘/Ctrl + Enter</span>
      </div>

      <AnimatePresence>
        {hint && (
          <motion.pre initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-amber/30 bg-amber-100/60 px-4 py-3 font-mono text-[13px] text-ink">{c.hint}</motion.pre>
        )}
      </AnimatePresence>
      {err && <p className="rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose">{err}</p>}

      {/* test cases */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">{hi ? "टेस्ट केस" : "Test cases"} <span className="ml-1 text-xs font-normal text-ink-3">{c.tests.filter((t) => !t.hidden).length} {hi ? "दिखे" : "visible"} · {c.tests.filter((t) => t.hidden).length} {hi ? "छिपे" : "hidden"}</span></p>
          <p className="font-mono text-xs text-ink-3">{passed}/{c.tests.length}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-3">
          <motion.div className={cn("h-full rounded-full", phase === "fail" ? "bg-marigold-600" : "bg-sage")} animate={{ width: `${(passed / c.tests.length) * 100}%` }} transition={{ ease: EASE }} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {c.tests.map((t, i) => {
            const r = results[i];
            return (
              <motion.li key={i} layout animate={r.state === "fail" ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }} transition={{ duration: 0.35 }}
                className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 font-mono text-xs transition-colors",
                  r.state === "pass" ? "border-sage/40 bg-sage-100" : r.state === "fail" ? "border-marigold-200 bg-marigold-50" : r.state === "run" ? "border-sky-300 bg-sky-50" : "border-line bg-paper")}>
                <span className="grid h-5 w-5 shrink-0 place-items-center">
                  {r.state === "pass" ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="h-4 w-4 text-sage" /></motion.span>
                    : r.state === "fail" ? <X className="h-4 w-4 text-marigold-600" />
                    : r.state === "run" ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> : <Circle className="h-3 w-3 text-ink-3" />}
                </span>
                {t.hidden
                  ? <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-ink-2"><Lock className="h-3 w-3" />{hi ? "छिपा टेस्ट" : "Hidden test"} #{c.tests.slice(0, i + 1).filter((x) => x.hidden).length}</span>
                  : <span className="min-w-0 flex-1 truncate text-ink">{t.call} <span className="text-ink-3">→ {t.expect}</span></span>}
                {r.state === "fail" && (t.hidden
                  ? <span className="shrink-0 text-marigold-600">{hi ? "किनारे के मामले सोचें" : "think about edge cases"}</span>
                  : r.got && <span className="max-w-[45%] truncate text-marigold-600">{hi ? "मिला" : "got"} {r.got}</span>)}
              </motion.li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence>
        {phase === "pass" && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ ease: EASE }}
            className="relative overflow-hidden rounded-2xl border border-sage/40 bg-sage-100 p-5">
            {Array.from({ length: 14 }, (_, i) => (
              <motion.span key={i} className="absolute h-2 w-2 rounded-full" style={{ left: `${8 + i * 6.5}%`, top: "60%", background: ["var(--sky-500)", "var(--marigold-600)", "var(--sage)"][i % 3] }}
                initial={{ y: 0, opacity: 1 }} animate={{ y: -70 - (i % 4) * 18, opacity: 0, rotate: 180 }} transition={{ duration: 1.1, delay: i * 0.03 }} />
            ))}
            <p className="flex items-center gap-2 font-display text-2xl text-ink"><Trophy className="h-5 w-5 text-marigold-600" />{hi ? "सभी टेस्ट पास!" : "All tests passed!"}</p>
            <p className="mt-1 flex gap-2 text-sm text-ink-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />{c.why}</p>
            {onNext ? (
              <button onClick={onNext} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                {hi ? "अगली चुनौती" : "Next challenge"}<ArrowRight className="h-4 w-4" />
              </button>
            ) : <p className="mt-3 text-sm font-medium text-sage">{hi ? "आपने सभी चुनौतियाँ पूरी कर लीं!" : "You've finished every challenge!"}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CodeLine({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex whitespace-pre text-slate-400">
      <span className="w-10 shrink-0 select-none pr-3 text-right text-slate-600">{n}</span>
      <span>{text || " "}</span>
    </div>
  );
}
