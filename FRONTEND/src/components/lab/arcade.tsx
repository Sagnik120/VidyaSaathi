"use client";

/**
 * The Arcade: free, replayable classics with a classroom twist.
 *   Smriti Match  — memory flip: pair each question with its answer card.
 *   Shabd Jumble  — unscramble the key term from its clue.
 *   Ganit Dash    — a 60-second mental-maths sprint, scaled to your class.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Brain, Lightbulb, Shuffle, Timer, Trophy, Zap } from "lucide-react";
import { api } from "@/core/api";
import { useI18n } from "@/providers/i18n";
import { Card } from "@/components/ui/primitives";
import { keyTerms, makeQuestions, shuffle } from "./game-bank";
import { cn, EASE } from "@/lib/utils";

type ArcadeId = "smriti" | "jumble" | "dash";
const GAMES: Array<{ id: ArcadeId; en: string; hi: string; dEn: string; dHi: string; icon: React.ReactNode; tone: string }> = [
  { id: "smriti", en: "Smriti Match", hi: "स्मृति मैच", dEn: "Flip cards, pair questions with answers.", dHi: "पत्ते पलटें, प्रश्न-उत्तर जोड़ें।", icon: <Brain className="h-5 w-5" />, tone: "from-[#7c5cc4] to-[#4c3a8f]" },
  { id: "jumble", en: "Shabd Jumble", hi: "शब्द जम्बल", dEn: "Unscramble the key term from its clue.", dHi: "संकेत से शब्द सुलझाइए।", icon: <Shuffle className="h-5 w-5" />, tone: "from-[#e5917f] to-[#b8574a]" },
  { id: "dash", en: "Ganit Dash", hi: "गणित डैश", dEn: "60 seconds of quick maths. Go!", dHi: "60 सेकंड का तेज़ गणित। चलो!", icon: <Zap className="h-5 w-5" />, tone: "from-[#3b66ae] to-[#1e3a6e]" },
];

const MATH_TERMS = [
  ["PRIME", "A number with exactly two factors"], ["FRACTION", "A part of a whole, like 3/4"], ["ANGLE", "Formed where two rays meet"],
  ["RADIUS", "Centre to the edge of a circle"], ["INTEGER", "Whole numbers and their negatives"], ["PERIMETER", "Distance around a shape"],
  ["EQUATION", "Two expressions with an equals sign"], ["SQUARE", "A number times itself"], ["DECIMAL", "Numbers with a point, like 2.5"],
  ["TRIANGLE", "A polygon with three sides"], ["VOLUME", "Space inside a solid"], ["MEDIAN", "The middle value of sorted data"],
];

export function Arcade({ subject, topicText, grade }: { subject: string; topicText: string; grade: number }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [game, setGame] = useState<ArcadeId | null>(null);
  const [round, setRound] = useState(0);
  if (game) {
    const back = () => setGame(null);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button onClick={back} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="h-4 w-4" />{hi ? "आर्केड" : "Arcade"}</button>
        {game === "smriti" && <Smriti key={round} subject={subject} text={topicText} grade={grade} again={() => setRound((r) => r + 1)} />}
        {game === "jumble" && <Jumble key={round} subject={subject} text={topicText} grade={grade} again={() => setRound((r) => r + 1)} />}
        {game === "dash" && <Dash key={round} grade={grade} again={() => setRound((r) => r + 1)} />}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {GAMES.map((g, i) => (
        <motion.button key={g.id} onClick={() => setGame(g.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: EASE }}
          whileHover={{ y: -4, rotate: i === 1 ? 0 : i === 0 ? -1 : 1 }} whileTap={{ scale: 0.97 }}
          className={cn("relative overflow-hidden rounded-[24px] bg-gradient-to-br p-5 text-left text-white shadow-[var(--shadow-lift)]", g.tone)}>
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">{g.icon}</span>
          <p className="mt-4 font-display text-2xl">{hi ? g.hi : g.en}</p>
          <p className="mt-1 text-sm text-white/85">{hi ? g.dHi : g.dEn}</p>
          <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider">{hi ? "मुफ़्त" : "Free play"}</span>
        </motion.button>
      ))}
    </div>
  );
}

function useScore(subject: string, game: string) {
  const qc = useQueryClient();
  const [points, setPoints] = useState<number | null>(null);
  const save = async (correct: number, total: number, streak = 0) => {
    try {
      const r = await api.gameScore({ subject, topic: "arcade", game, correct, total: Math.max(1, total), streak });
      setPoints(r.points);
      qc.invalidateQueries({ queryKey: ["game-board"] });
    } catch { /* playing still counts for fun */ }
  };
  return { points, save };
}

function Done({ title, line, points, again }: { title: string; line: string; points: number | null; again: () => void }) {
  const { lang, n } = useI18n();
  return (
    <Card className="p-8 text-center">
      <Trophy className="mx-auto h-12 w-12 text-marigold-600" />
      <p className="mt-3 font-display text-4xl">{title}</p>
      <p className="mt-1 text-ink-2">{line}</p>
      {points != null && <p className="mt-3 inline-block rounded-full bg-marigold-50 px-3 py-1 font-semibold text-marigold-600">+{n(points)} {lang === "hi" ? "अंक" : "points"}</p>}
      <button onClick={again} className="mt-6 block w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">{lang === "hi" ? "फिर खेलें" : "Play again"}</button>
    </Card>
  );
}

/* ── Smriti Match ── */
function Smriti({ subject, text, grade, again }: { subject: string; text: string; grade: number; again: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const [cards] = useState(() => {
    const qs = makeQuestions(subject, text, grade, 6);
    return shuffle(qs.flatMap((q, i) => [{ id: `q${i}`, pair: i, text: q.q, side: "q" as const }, { id: `a${i}`, pair: i, text: q.a, side: "a" as const }]));
  });
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const { points, save } = useScore(subject, "smriti");
  const pairs = cards.length / 2;
  const flip = (id: string) => {
    if (open.length === 2 || open.includes(id)) return;
    const next = [...open, id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((x) => cards.find((c) => c.id === x)!);
      setTimeout(() => {
        if (a.pair === b.pair && a.side !== b.side) {
          const m = new Set(matched).add(a.pair);
          setMatched(m);
          if (m.size === pairs) void save(pairs, Math.max(pairs, moves + 1));
        }
        setOpen([]);
      }, a.pair === b.pair ? 450 : 900);
    }
  };
  if (pairs && matched.size === pairs) return <Done title={hi ? "याददाश्त कमाल!" : "Memory master!"} line={`${n(moves)} ${hi ? "चालों में" : "moves"}`} points={points} again={again} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm"><span className="font-display text-2xl">{hi ? "स्मृति मैच" : "Smriti Match"}</span><span className="text-ink-3">{n(matched.size)}/{n(pairs)} · {n(moves)} {hi ? "चालें" : "moves"}</span></div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map((c) => {
          const up = open.includes(c.id) || matched.has(c.pair);
          return (
            <motion.button key={c.id} onClick={() => flip(c.id)} disabled={matched.has(c.pair)} className="aspect-[4/3] [perspective:600px]" whileTap={{ scale: 0.96 }}>
              <motion.span animate={{ rotateY: up ? 180 : 0 }} transition={{ duration: 0.35 }} className="relative block h-full w-full [transform-style:preserve-3d]">
                <span className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-[#7c5cc4] to-[#4c3a8f] text-2xl text-white [backface-visibility:hidden]">?</span>
                <span className={cn("absolute inset-0 grid place-items-center rounded-2xl border-2 p-2 text-center text-[0.72rem] leading-tight [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-xs",
                  matched.has(c.pair) ? "border-sage bg-sage-100" : c.side === "q" ? "border-sky-300 bg-sky-50" : "border-marigold-200 bg-marigold-50 font-semibold")}>{c.text}</span>
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shabd Jumble ── */
function Jumble({ subject, text, grade, again }: { subject: string; text: string; grade: number; again: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const [words] = useState(() => {
    const list = subject === "Mathematics" ? shuffle(MATH_TERMS).slice(0, 5).map(([word, clue]) => ({ word, clue })) : keyTerms(subject, text, grade, 5);
    return list.map((w) => {
      const up = w.word.toUpperCase();
      let s = up;
      for (let k = 0; k < 6 && s === up; k++) s = shuffle(up.split("")).join("");
      return { ...w, word: up, scrambled: s };
    });
  });
  const [i, setI] = useState(0);
  const [v, setV] = useState("");
  const [score, setScore] = useState(0);
  const [hint, setHint] = useState(false);
  const [state, setState] = useState<"play" | "right" | "wrong">("play");
  const { points, save } = useScore(subject, "jumble");
  const w = words[i];
  const next = (got: boolean) => {
    const s = score + (got ? 1 : 0);
    setScore(s);
    setState(got ? "right" : "wrong");
    setTimeout(() => {
      setState("play"); setV(""); setHint(false);
      if (i + 1 >= words.length) { setI(words.length); void save(s, words.length); } else setI(i + 1);
    }, 1000);
  };
  if (!words.length) return <Card className="p-8 text-center text-ink-3">{hi ? "इस विषय के शब्द जल्द आएँगे।" : "Words for this subject are coming soon."}</Card>;
  if (i >= words.length) return <Done title={hi ? "शब्दों के जादूगर!" : "Word wizard!"} line={`${n(score)}/${n(words.length)}`} points={points} again={again} />;
  return (
    <Card className="p-6 text-center">
      <p className="text-xs text-ink-3">{n(i + 1)}/{n(words.length)} · {hi ? "संकेत" : "Clue"}</p>
      <p className="mt-1 text-ink-2">{w.clue}</p>
      <div className="my-5 flex flex-wrap justify-center gap-1.5">
        {w.scrambled.split("").map((ch, k) => (
          <motion.span key={`${i}-${k}`} initial={{ y: -20, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: k * 0.04, type: "spring" }}
            className={cn("grid h-11 w-10 place-items-center rounded-xl border-b-4 font-display text-2xl", state === "right" ? "border-sage bg-sage-100" : state === "wrong" ? "border-rose bg-rose-100" : "border-[#b8574a] bg-[#fbe7e2] text-ink")}>{ch}</motion.span>
        ))}
      </div>
      {hint && <p className="mb-2 text-sm text-marigold-600">{hi ? "पहला अक्षर" : "Starts with"} <b>{w.word[0]}</b></p>}
      {state === "wrong" && <p className="mb-2 text-sm text-ink-2">{hi ? "उत्तर" : "Answer"}: <b>{w.word}</b></p>}
      <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) next(v.trim().toUpperCase().replace(/[^A-Z]/g, "") === w.word); }} className="flex gap-2">
        <input value={v} onChange={(e) => setV(e.target.value)} autoFocus placeholder={hi ? "शब्द लिखें…" : "Type the word…"} className="h-11 min-w-0 flex-1 rounded-2xl border border-line-2 px-3 uppercase tracking-widest outline-none focus:border-sky-500" />
        <button className="rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white">{hi ? "जाँचें" : "Check"}</button>
      </form>
      <div className="mt-3 flex justify-center gap-2 text-xs">
        <button onClick={() => setHint(true)} disabled={hint} className="inline-flex items-center gap-1 rounded-full bg-marigold-50 px-3 py-1 font-medium text-marigold-600 disabled:opacity-40"><Lightbulb className="h-3.5 w-3.5" />{hi ? "पहला अक्षर" : "First letter"}</button>
        <button onClick={() => next(false)} className="rounded-full px-3 py-1 text-ink-3 hover:text-ink">{hi ? "छोड़ें" : "Skip"}</button>
      </div>
    </Card>
  );
}

/* ── Ganit Dash ── */
function sum(grade: number) {
  const big = grade >= 9 ? 50 : grade >= 7 ? 25 : 12;
  const op = ["+", "−", "×", grade >= 7 ? "÷" : "+"][Math.floor(Math.random() * 4)];
  const a = 2 + Math.floor(Math.random() * big), b = 2 + Math.floor(Math.random() * (op === "×" ? 12 : big));
  if (op === "÷") return { text: `${a * b} ÷ ${b}`, ans: a };
  if (op === "−") return { text: `${Math.max(a, b)} − ${Math.min(a, b)}`, ans: Math.max(a, b) - Math.min(a, b) };
  if (op === "×") return { text: `${a} × ${b}`, ans: a * b };
  return { text: `${a} + ${b}`, ans: a + b };
}

function Dash({ grade, again }: { grade: number; again: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const [q, setQ] = useState(() => sum(grade));
  const [v, setV] = useState("");
  const [left, setLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<null | boolean>(null);
  const { points, save } = useScore("Mathematics", "dash");
  const ended = useRef(false);
  const stats = useRef({ score: 0, tries: 0, best: 0 });
  useEffect(() => { stats.current = { score, tries, best }; }, [score, tries, best]);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) {
        clearInterval(t);
        if (!ended.current) { ended.current = true; const st = stats.current; void save(st.score, Math.max(1, st.tries), st.best); }
        return 0;
      }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = () => {
    if (!v.trim() || left === 0) return;
    const ok = Number(v) === q.ans;
    setTries((x) => x + 1);
    setScore((x) => x + (ok ? 1 : 0));
    setStreak((x) => { const s = ok ? x + 1 : 0; setBest((b) => Math.max(b, s)); return s; });
    setFlash(ok); setV(""); setQ(sum(grade));
    setTimeout(() => setFlash(null), 250);
  };
  const keys = useMemo(() => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "↵"], []);
  if (left === 0) return <Done title={hi ? "समय समाप्त!" : "Time's up!"} line={`${n(score)} ${hi ? "सही" : "correct"} · ${hi ? "लगातार" : "best streak"} ${n(best)}`} points={points} again={again} />;
  return (
    <Card className={cn("p-6 text-center transition-colors", flash === true && "bg-sage-100", flash === false && "bg-rose-100")}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold tabular-nums", left <= 10 ? "animate-pulse bg-rose-100 text-rose" : "bg-paper-2")}><Timer className="h-4 w-4" />{n(left)}s</span>
        <span className="font-semibold">{n(score)} ✓{streak >= 3 && <span className="ml-2 text-marigold-600">🔥{n(streak)}</span>}</span>
      </div>
      <AnimatePresence mode="wait"><motion.p key={q.text} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="my-6 font-display text-6xl">{q.text}</motion.p></AnimatePresence>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input value={v} onChange={(e) => setV(e.target.value.replace(/[^0-9-]/g, ""))} autoFocus inputMode="numeric" className="h-14 w-full rounded-2xl border-2 border-line-2 text-center font-display text-3xl outline-none focus:border-sky-500" />
      </form>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
        {keys.map((k) => <button key={k} onClick={() => (k === "⌫" ? setV((x) => x.slice(0, -1)) : k === "↵" ? submit() : setV((x) => x + k))} className="rounded-xl bg-paper-2 py-3 text-lg font-semibold">{k}</button>)}
      </div>
    </Card>
  );
}
