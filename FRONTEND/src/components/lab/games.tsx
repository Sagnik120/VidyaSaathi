"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Flame, Gamepad2, Map as MapIcon, Puzzle, Sparkles, Timer, ToggleLeft, Trophy, X, Zap } from "lucide-react";
import { api } from "@/core/api";
import { useI18n } from "@/providers/i18n";
import { LoadError } from "@/components/ui/load-error";
import { Card, Select, Skeleton } from "@/components/ui/primitives";
import { GameLeaderboard } from "@/components/school/leaderboard";
import { Journey } from "./journey";
import { Arcade } from "./arcade";
import { makeQuestions, shuffle, type GameQ } from "./game-bank";
import { cn, EASE } from "@/lib/utils";

type Mode = "quiz" | "truefalse" | "match";
const MODES: Array<{ id: Mode; icon: React.ReactNode; en: string; hi: string; dEn: string; dHi: string; tone: string }> = [
  { id: "quiz", icon: <Zap className="h-5 w-5" />, en: "Quiz Rush", hi: "क्विज़ रश", dEn: "10 questions, 60 seconds. Streaks score extra!", dHi: "10 प्रश्न, 60 सेकंड। लगातार सही पर बोनस!", tone: "from-sky-500 to-sky-700" },
  { id: "truefalse", icon: <ToggleLeft className="h-5 w-5" />, en: "True / False Blitz", hi: "सही / गलत ब्लिट्ज़", dEn: "Fast calls: is it right or wrong?", dHi: "जल्दी बताइए: सही या गलत?", tone: "from-marigold-400 to-marigold-600" },
  { id: "match", icon: <Puzzle className="h-5 w-5" />, en: "Match-up", hi: "जोड़ी मिलाओ", dEn: "Pair each question with its answer.", dHi: "हर प्रश्न को उसके उत्तर से जोड़िए।", tone: "from-[#5f9474] to-[#3f7356]" },
];

type Section = "yatra" | "arcade" | "quick";

export function Games() {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const path = useQuery({ queryKey: ["syllabus"], queryFn: api.syllabus });
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [section, setSection] = useState<Section>("yatra");
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState(0);
  const p = path.data;
  useEffect(() => { if (p?.subjects.length && !subject) setSubject(p.subjects[0].name); }, [p, subject]);
  const subj = p?.subjects.find((s) => s.name === subject);
  const grade = Number(p?.grade ?? 8);
  const topicText = useMemo(() => {
    if (!subj) return "";
    if (!topic) return subj.chapters.map((c) => c.title).join(" ");
    const [ci, ti] = topic.split("|");
    const c = subj.chapters.find((x) => x.id === ci);
    const t = c?.topics.find((x) => x.id === ti);
    return `${c?.title ?? ""} ${t?.title ?? ""}`;
  }, [subj, topic]);
  const topicLabel = useMemo(() => {
    if (!subj || !topic) return hi ? "पूरा विषय" : "Whole subject";
    const [ci, ti] = topic.split("|");
    const c = subj.chapters.find((x) => x.id === ci);
    return c?.topics.find((x) => x.id === ti)?.title ?? c?.title ?? "";
  }, [subj, topic, hi]);

  if (path.isError) return <LoadError error={path.error} onRetry={() => void path.refetch()} />;
  if (path.isLoading) return <Skeleton className="h-64 w-full rounded-[var(--radius)]" />;
  if (!p?.configured) return <Card className="p-8 text-center text-ink-3">{hi ? "गेम के लिए प्रोफ़ाइल में अपना बोर्ड और कक्षा चुनें।" : "Set your board and class in Profile to unlock games."}</Card>;

  if (mode) {
    return (
      <Play key={round} mode={mode} subject={subject} topic={topicLabel} text={topicText} grade={grade}
        onExit={() => setMode(null)} onAgain={() => setRound((r) => r + 1)} />
    );
  }
  const sections: Array<{ id: Section; icon: React.ReactNode; en: string; hi: string }> = [
    { id: "yatra", icon: <MapIcon className="h-4 w-4" />, en: "Gyaan Yatra", hi: "ज्ञान यात्रा" },
    { id: "arcade", icon: <Gamepad2 className="h-4 w-4" />, en: "Arcade", hi: "आर्केड" },
    { id: "quick", icon: <Zap className="h-4 w-4" />, en: "Quick Play", hi: "झटपट खेल" },
  ];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl border border-line bg-surface p-1">
            {sections.map((x) => (
              <button key={x.id} onClick={() => setSection(x.id)} className="relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium">
                {section === x.id && <motion.span layoutId="game-section" className="absolute inset-0 rounded-xl bg-ink" transition={{ ease: EASE, duration: 0.3 }} />}
                <span className={cn("relative flex items-center gap-1.5", section === x.id ? "text-white" : "text-ink-3")}>{x.icon}{hi ? x.hi : x.en}</span>
              </button>
            ))}
          </div>
          <Select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }} className="h-10 w-auto min-w-36 text-sm" aria-label={hi ? "विषय" : "Subject"}>
            {p.subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </Select>
          {section !== "yatra" && (
            <Select value={topic} onChange={(e) => setTopic(e.target.value)} className="h-10 w-auto min-w-40 max-w-full text-sm" aria-label={hi ? "टॉपिक" : "Topic"}>
              <option value="">{hi ? "पूरा विषय (मिश्रित)" : "Whole subject (mixed)"}</option>
              {subj?.chapters.map((c) => (
                <optgroup key={c.id} label={`${c.number}. ${c.title}`}>
                  <option value={`${c.id}|`}>{hi ? "पूरा अध्याय" : "Whole chapter"}: {c.title}</option>
                  {c.topics.map((t) => <option key={t.id} value={`${c.id}|${t.id}`}>{t.number} {t.title}</option>)}
                </optgroup>
              ))}
            </Select>
          )}
        </div>

        {section === "yatra" && subject && <Journey subject={subject} grade={grade} />}
        {section === "arcade" && <Arcade subject={subject} topicText={topicText} grade={grade} />}
        {section === "quick" && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {MODES.map((m, i) => (
                <motion.button key={m.id} onClick={() => setMode(m.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease: EASE }}
                  whileHover={{ y: -4, rotate: i === 1 ? 0 : i === 0 ? -1 : 1 }} whileTap={{ scale: 0.97 }}
                  className={cn("relative overflow-hidden rounded-[24px] bg-gradient-to-br p-5 text-left text-white shadow-[var(--shadow-lift)]", m.tone)}>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">{m.icon}</span>
                  <p className="mt-4 font-display text-2xl">{hi ? m.hi : m.en}</p>
                  <p className="mt-1 text-sm text-white/85">{hi ? m.dHi : m.dEn}</p>
                  <Sparkles className="absolute -right-2 -top-2 h-16 w-16 text-white/10" />
                </motion.button>
              ))}
            </div>
            <p className="text-sm text-ink-3">{hi ? "हर सही उत्तर = 10 अंक · लगातार सही = बोनस · पूरे सही = +20" : "Each right answer = 10 points · streaks = bonus · a perfect round = +20"}</p>
          </>
        )}
      </div>
      <GameBoardCard subject={subject} />
    </div>
  );
}

function GameBoardCard({ subject }: { subject: string }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [all, setAll] = useState(false);
  const q = useQuery({ queryKey: ["game-board", all ? "" : subject], queryFn: () => api.classLeaderboard(all ? undefined : subject), enabled: !!subject, refetchInterval: 20000 });
  return (
    <Card className="overflow-hidden xl:sticky xl:top-6">
      <div className="bg-gradient-to-br from-[#3b2a7a] via-[#4c3a8f] to-[#2a8a7a] px-5 py-4 text-white">
        <p className="flex items-center gap-2 font-display text-2xl"><Trophy className="h-5 w-5 text-[#f5c542]" />{hi ? "गेम लीग" : "Game League"}</p>
        <p className="text-xs text-white/80">{hi ? "सिर्फ़ आपकी कक्षा · टेस्ट की रैंक अलग है" : "Your class only · tests have their own board"}</p>
        <div className="mt-3 inline-flex rounded-xl bg-white/15 p-0.5 text-xs">
          <button onClick={() => setAll(false)} className={cn("rounded-lg px-2.5 py-1", !all && "bg-white text-ink")}>{subject}</button>
          <button onClick={() => setAll(true)} className={cn("rounded-lg px-2.5 py-1", all && "bg-white text-ink")}>{hi ? "सभी विषय" : "All subjects"}</button>
        </div>
      </div>
      <div className="p-4">{q.isError ? <LoadError error={q.error} onRetry={() => void q.refetch()} /> : q.data ? <GameLeaderboard data={q.data} /> : <Skeleton className="h-40 w-full" />}</div>
    </Card>
  );
}

/* ── one round ─────────────────────────────────────────────────────────── */

function Play({ mode, subject, topic, text, grade, onExit, onAgain }: { mode: Mode; subject: string; topic: string; text: string; grade: number; onExit: () => void; onAgain: () => void }) {
  const { lang, n } = useI18n();
  // Drawn once per round, so a background refetch can't swap questions mid-game.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => makeQuestions(subject, text, grade, mode === "match" ? 5 : 10), []);
  const hi = lang === "hi";
  const qc = useQueryClient();
  const [result, setResult] = useState<null | { correct: number; total: number; streak: number; points?: number; totalPoints?: number }>(null);
  const finish = async (correct: number, total: number, streak: number) => {
    setResult({ correct, total, streak });
    try {
      const r = await api.gameScore({ subject, topic, game: mode, correct, total, streak });
      setResult({ correct, total, streak, points: r.points, totalPoints: r.total_points });
      qc.invalidateQueries({ queryKey: ["game-board"] });
    } catch { /* points are a bonus; the round still counts for the student */ }
  };
  if (questions.length < 3) return <Card className="p-8 text-center text-ink-3">{hi ? "इस टॉपिक के लिए अभी पर्याप्त प्रश्न नहीं — पूरा विषय चुनें।" : "Not enough questions for this topic yet — try the whole subject."}<button onClick={onExit} className="mt-3 block w-full text-sky-700">{hi ? "वापस" : "Back"}</button></Card>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
        <p className="min-w-0 flex-1 truncate text-sm text-ink-2"><strong className="text-ink">{subject}</strong> · {topic}</p>
      </div>
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="r" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="relative overflow-hidden p-8 text-center">
              {result.correct === result.total && <Confetti />}
              <Trophy className="mx-auto h-12 w-12 text-marigold-600" />
              <p className="mt-3 font-display text-5xl">{n(result.correct)} / {n(result.total)}</p>
              <p className="mt-1 text-ink-2">{result.correct === result.total ? (hi ? "परफ़ेक्ट! 🎉" : "Perfect round! 🎉") : result.correct >= result.total * 0.7 ? (hi ? "शानदार!" : "Great going!") : (hi ? "अभ्यास जारी रखें 💪" : "Keep practising 💪")}</p>
              {result.points != null && (
                <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-marigold-50 px-4 py-2 font-semibold text-marigold-600">
                  +{n(result.points)} {hi ? "अंक" : "points"} · {hi ? "कुल" : "total"} {n(result.totalPoints ?? 0)}
                </motion.p>
              )}
              <div className="mt-6 flex justify-center gap-2">
                <button onClick={onAgain} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">{hi ? "फिर खेलें" : "Play again"}</button>
                <button onClick={onExit} className="rounded-xl border border-line px-5 py-2.5 text-sm text-ink-2 hover:text-ink">{hi ? "दूसरा गेम" : "Another game"}</button>
              </div>
            </Card>
          </motion.div>
        ) : mode === "quiz" ? <Quiz key="q" qs={questions} onDone={finish} /> : mode === "truefalse" ? <TrueFalse key="t" qs={questions} onDone={finish} /> : <Match key="m" qs={questions.slice(0, 5)} onDone={finish} />}
      </AnimatePresence>
    </div>
  );
}

function useCountdown(sec: number, onEnd: () => void) {
  const [left, setLeft] = useState(sec);
  const end = useRef(onEnd);
  useEffect(() => { end.current = onEnd; });
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(t); end.current(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

function HUD({ i, total, streak, left }: { i: number; total: number; streak: number; left?: number }) {
  const { n } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3"><motion.div className="h-full rounded-full bg-sky-600" animate={{ width: `${(i / total) * 100}%` }} /></div>
      <AnimatePresence>{streak >= 2 && <motion.span key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 rounded-full bg-marigold-50 px-2.5 py-1 text-sm font-semibold text-marigold-600"><Flame className="h-4 w-4" />{n(streak)}</motion.span>}</AnimatePresence>
      {left != null && <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums", left <= 10 ? "animate-pulse bg-rose-100 text-rose" : "bg-paper-2")}><Timer className="h-4 w-4" />{n(left)}s</span>}
    </div>
  );
}

function Quiz({ qs, onDone }: { qs: GameQ[]; onDone: (c: number, t: number, s: number) => void }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ c: 0, streak: 0, best: 0 });
  const [picked, setPicked] = useState<string | null>(null);
  const opts = useMemo(() => qs.map((q) => shuffle([q.a, ...q.wrong.slice(0, 3)])), [qs]);
  const done = useRef(false);
  const end = (c = score.c, best = score.best) => { if (!done.current) { done.current = true; onDone(c, qs.length, best); } };
  const left = useCountdown(60, () => end());
  const q = qs[i];
  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    const right = o === q.a;
    const next = { c: score.c + (right ? 1 : 0), streak: right ? score.streak + 1 : 0, best: 0 };
    next.best = Math.max(score.best, next.streak);
    setScore(next);
    setTimeout(() => { setPicked(null); if (i + 1 >= qs.length) end(next.c, next.best); else setI(i + 1); }, 650);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <HUD i={i} total={qs.length} streak={score.streak} left={left} />
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22 }}>
          <Card className="p-6">
            <p className="font-display text-3xl text-ink">{q.q}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {opts[i].map((o) => (
                <motion.button key={o} whileTap={{ scale: 0.96 }} onClick={() => choose(o)} animate={picked && o === picked && o !== q.a ? { x: [0, -8, 8, -4, 0] } : {}}
                  className={cn("rounded-2xl border-2 px-4 py-3 text-left font-medium transition-colors",
                    picked ? (o === q.a ? "border-sage bg-sage-100" : o === picked ? "border-rose bg-rose-100" : "border-line opacity-60") : "border-line hover:border-sky-400 hover:bg-sky-50")}>
                  {o}
                </motion.button>
              ))}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function TrueFalse({ qs, onDone }: { qs: GameQ[]; onDone: (c: number, t: number, s: number) => void }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [items] = useState(() => qs.map((q) => { const truth = Math.random() < 0.5; return { q: q.q, shown: truth ? q.a : q.wrong[0] ?? q.a, truth: truth || !q.wrong.length, a: q.a }; }));
  const [i, setI] = useState(0);
  const [s, setS] = useState({ c: 0, streak: 0, best: 0 });
  const [flash, setFlash] = useState<null | boolean>(null);
  const done = useRef(false);
  const end = (c: number, best: number) => { if (!done.current) { done.current = true; onDone(c, items.length, best); } };
  const left = useCountdown(45, () => end(s.c, s.best));
  const it = items[i];
  const call = (v: boolean) => {
    if (flash != null) return;
    const right = v === it.truth;
    const next = { c: s.c + (right ? 1 : 0), streak: right ? s.streak + 1 : 0, best: Math.max(s.best, right ? s.streak + 1 : 0) };
    setS(next);
    setFlash(right);
    setTimeout(() => { setFlash(null); if (i + 1 >= items.length) end(next.c, next.best); else setI(i + 1); }, 700);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <HUD i={i} total={items.length} streak={s.streak} left={left} />
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ rotateX: -60, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ rotateX: 60, opacity: 0 }} transition={{ duration: 0.25 }}>
          <Card className={cn("p-8 text-center transition-colors", flash === true && "bg-sage-100", flash === false && "bg-rose-100")}>
            <p className="text-sm text-ink-3">{it.q}</p>
            <p className="mt-2 font-display text-4xl text-ink">{it.shown}</p>
            {flash === false && <p className="mt-2 text-sm text-ink-2">{hi ? "सही उत्तर" : "Answer"}: <strong>{it.a}</strong></p>}
          </Card>
        </motion.div>
      </AnimatePresence>
      <div className="grid grid-cols-2 gap-3">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => call(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-sage py-4 text-lg font-semibold text-white"><Check className="h-5 w-5" />{hi ? "सही" : "True"}</motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => call(false)} className="flex items-center justify-center gap-2 rounded-2xl bg-rose py-4 text-lg font-semibold text-white"><X className="h-5 w-5" />{hi ? "गलत" : "False"}</motion.button>
      </div>
    </motion.div>
  );
}

function Match({ qs, onDone }: { qs: GameQ[]; onDone: (c: number, t: number, s: number) => void }) {
  const right = useMemo(() => shuffle(qs.map((q, i) => ({ i, a: q.a }))), [qs]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const pick = (ri: number) => {
    if (sel == null || done.has(ri)) return;
    if (ri === sel) {
      const d = new Set(done).add(ri);
      setDone(d);
      setSel(null);
      if (d.size === qs.length) setTimeout(() => onDone(Math.max(0, qs.length - miss), qs.length, Math.max(0, qs.length - miss)), 500);
    } else { setMiss((m) => m + 1); setWrong(ri); setTimeout(() => setWrong(null), 400); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <HUD i={done.size} total={qs.length} streak={0} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {qs.map((q, i) => (
            <button key={i} disabled={done.has(i)} onClick={() => setSel(i)}
              className={cn("w-full rounded-2xl border-2 p-3 text-left text-sm transition-all", done.has(i) ? "border-sage bg-sage-100 opacity-60" : sel === i ? "border-sky-500 bg-sky-50 shadow-[var(--shadow-soft)]" : "border-line bg-surface hover:border-sky-300")}>{q.q}</button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((r) => (
            <motion.button key={r.i} onClick={() => pick(r.i)} animate={wrong === r.i ? { x: [0, -6, 6, 0] } : {}} disabled={done.has(r.i)}
              className={cn("w-full rounded-2xl border-2 p-3 text-left text-sm font-medium transition-all", done.has(r.i) ? "border-sage bg-sage-100 opacity-60" : wrong === r.i ? "border-rose bg-rose-100" : "border-line bg-surface hover:border-marigold-400")}>{r.a}</motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Confetti() {
  const [bits] = useState(() => Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * 100, d: Math.random() * 0.6, r: Math.random() * 360, c: ["#f0c35a", "#3b66ae", "#5f9474", "#e5917f"][i % 4] })));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute top-0 h-2.5 w-1.5 rounded-sm" style={{ left: `${b.x}%`, background: b.c }}
          initial={{ y: -20, rotate: 0, opacity: 1 }} animate={{ y: 420, rotate: b.r + 360, opacity: 0 }} transition={{ duration: 1.8, delay: b.d, ease: "easeIn" }} />
      ))}
    </div>
  );
}
