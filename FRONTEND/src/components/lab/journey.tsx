"use client";

/**
 * Gyaan Yatra — the journey of knowledge. Each chapter of a subject is a
 * level (a landmark on a winding road), each sub-topic a stage (a stepping
 * stone). Clear a stage to unlock the next. Every stage plays a different
 * game, with 3 hearts, a 50:50 hint bought with coins and a "peek" that
 * costs a heart.
 *
 * The map lives in a fixed-height box that scrolls on its own and opens on
 * the current stage, so the page itself never grows long.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Coins, Eye, Heart, Lock, Scissors, Sparkles, Star, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { JourneyLevel, JourneyStage, StageGame } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { LoadError } from "@/components/ui/load-error";
import { PlaneMark } from "@/components/brand/logo";
import { Card, Skeleton } from "@/components/ui/primitives";
import { makeOddOne, makeQuestions, shuffle, type GameQ } from "./game-bank";
import { cn, EASE } from "@/lib/utils";

export const STAGE_GAME: Record<StageGame, { en: string; hi: string; emoji: string; how: string; howHi: string }> = {
  quiz: { en: "Gyaan Quiz", hi: "ज्ञान क्विज़", emoji: "🧠", how: "Pick the right answer.", howHi: "सही उत्तर चुनें।" },
  truefalse: { en: "Sach ya Jhooth", hi: "सच या झूठ", emoji: "⚖️", how: "Is the statement true or false?", howHi: "कथन सच है या झूठ?" },
  match: { en: "Jodi Milao", hi: "जोड़ी मिलाओ", emoji: "🔗", how: "Match each question to its answer.", howHi: "हर प्रश्न को उसके उत्तर से जोड़ें।" },
  oddone: { en: "Kaun Alag?", hi: "कौन अलग?", emoji: "🕵️", how: "Three pairs are right. Find the one that's wrong.", howHi: "तीन जोड़ियाँ सही हैं। गलत वाली ढूँढिए।" },
};
const LANDMARK = ["🏕️", "🌉", "🏯", "⛰️", "🏰", "🗼"];
const ROUND = 5;

/* ── the map ───────────────────────────────────────────────────────────── */

type Node = { kind: "level"; level: JourneyLevel; i: number } | { kind: "stage"; stage: JourneyStage; level: JourneyLevel; i: number };
const W = 340, STEP = 84, PAD = 70;

export function Journey({ subject, grade }: { subject: string; grade: number }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["journey", subject], queryFn: () => api.gameJourney(subject), enabled: !!subject });
  const [playing, setPlaying] = useState<{ stage: JourneyStage; level: JourneyLevel } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const d = q.data;

  // Bottom-up like a board game: the first chapter starts at the bottom of the road.
  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = [];
    d?.levels.forEach((lv) => {
      out.push({ kind: "level", level: lv, i: out.length });
      lv.stages.forEach((st) => out.push({ kind: "stage", stage: st, level: lv, i: out.length }));
    });
    return out;
  }, [d]);
  const H = nodes.length * STEP + PAD * 2;
  const pos = (i: number) => ({ x: W / 2 + 110 * Math.sin(i * 0.85), y: H - PAD - i * STEP });
  const road = useMemo(() => {
    if (!nodes.length) return "";
    const pts = nodes.map((_, i) => pos(i));
    let p = `M ${pts[0].x} ${pts[0].y + 50}`;
    p += ` L ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      p += ` C ${a.x} ${a.y - STEP / 2}, ${b.x} ${b.y + STEP / 2}, ${b.x} ${b.y}`;
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, H]);
  const currentIdx = nodes.findIndex((nd) => nd.kind === "stage" && nd.stage.unlocked && !nd.stage.done);
  const reached = currentIdx === -1 ? nodes.length - 1 : currentIdx;

  // Open on the current stage, scrolling only inside the map box.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !nodes.length) return;
    el.scrollTop = Math.max(0, pos(Math.max(0, reached)).y - el.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, reached]);

  if (q.isError) return <LoadError error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isLoading || !d) return <Skeleton className="h-[480px] w-full rounded-[var(--radius)]" />;
  if (playing) {
    return <StagePlayer subject={subject} grade={grade} stage={playing.stage} level={playing.level} coins={d.coins} hintPrice={d.hint_price}
      onExit={() => { setPlaying(null); qc.invalidateQueries({ queryKey: ["journey", subject] }); qc.invalidateQueries({ queryKey: ["game-board"] }); }} />;
  }
  const stars = d.levels.reduce((a, l) => a + l.stars, 0), maxStars = d.levels.reduce((a, l) => a + l.max_stars, 0);

  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-gradient-to-b from-[#e8f3e9] via-[#f3efe0] to-[#e7eef9] shadow-[var(--shadow-soft)]">
        <div ref={box} className="relative h-[min(68vh,560px)] overflow-y-auto overscroll-contain">
          <div className="relative mx-auto" style={{ width: W, height: H }}>
            <svg width={W} height={H} className="absolute inset-0" aria-hidden>
              {/* scenery */}
              {nodes.map((_, i) => {
                const p = pos(i);
                const side = p.x > W / 2 ? -1 : 1;
                return i % 2 === 0 ? <text key={`t${i}`} x={p.x + side * 120} y={p.y + 10} fontSize="22" textAnchor="middle">{i % 4 === 0 ? "🌳" : "🌸"}</text> : null;
              })}
              {/* the road: edge, sand, dashed centre line, and the travelled part in gold */}
              <path d={road} fill="none" stroke="#d8c9a3" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
              <path d={road} fill="none" stroke="#f1e6c8" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
              <path d={road} fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="10 12" strokeLinecap="round" />
              <motion.path d={road} fill="none" stroke="#f0c35a" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.85"
                initial={{ pathLength: 0 }} animate={{ pathLength: nodes.length > 1 ? Math.min(1, reached / (nodes.length - 1)) : 0 }} transition={{ duration: 1.2, ease: EASE }} />
            </svg>
            {nodes.map((nd, i) => {
              const p = pos(i);
              if (nd.kind === "level") {
                const lv = nd.level;
                return (
                  <div key={lv.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
                    <div className={cn("relative grid h-16 w-16 place-items-center rounded-[22px] border-4 text-2xl shadow-[var(--shadow-lift)]",
                      lv.done ? "border-[#f0c35a] bg-gradient-to-b from-[#fff4cc] to-[#f8d978]" : lv.unlocked ? "border-sky-400 bg-surface" : "border-line-2 bg-paper-3 grayscale")}>
                      {LANDMARK[(lv.number - 1) % LANDMARK.length]}
                      {!lv.unlocked && <Lock className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-ink p-1 text-white" />}
                    </div>
                    <div className="absolute left-1/2 top-full mt-1 w-40 -translate-x-1/2 text-center">
                      <p className={cn("truncate rounded-full px-2 py-0.5 text-[0.7rem] font-semibold shadow-sm", i === 0 ? "bg-ink text-white" : "bg-surface/90 text-ink")}>
                        {i === 0 && <>{hi ? "शुरुआत" : "Start"} · </>}{hi ? "स्तर" : "Level"} {n(lv.number)} · {lv.title}
                      </p>
                      <p className="mt-0.5 flex justify-center gap-0.5">{Array.from({ length: 3 }, (_, k) => <Star key={k} className={cn("h-3 w-3", lv.stars >= ((k + 1) * lv.max_stars) / 3 ? "fill-[#f0c35a] text-[#f0c35a]" : "text-line-2")} />)}</p>
                    </div>
                  </div>
                );
              }
              const st = nd.stage;
              const cur = i === currentIdx;
              const g = STAGE_GAME[st.game];
              return (
                <div key={st.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
                  {cur && (
                    <motion.div className="absolute -top-11 left-1/2 -translate-x-1/2" animate={{ y: [0, -6, 0], rotate: [-8, 0, -8] }} transition={{ repeat: Infinity, duration: 1.8 }}>
                      <PlaneMark size={34} />
                    </motion.div>
                  )}
                  <motion.button disabled={!st.unlocked} onClick={() => setPlaying({ stage: st, level: nd.level })}
                    whileHover={st.unlocked ? { scale: 1.08 } : undefined} whileTap={st.unlocked ? { scale: 0.94 } : undefined}
                    title={`${st.title} · ${hi ? g.hi : g.en}`} aria-label={`${st.title} · ${hi ? g.hi : g.en}`}
                    className={cn("relative grid h-12 w-12 place-items-center rounded-full border-[3px] text-lg shadow-[var(--shadow-soft)] transition-colors",
                      st.done ? "border-sage bg-sage-100" : cur ? "border-sky-500 bg-sky-50" : st.unlocked ? "border-sky-300 bg-surface" : "border-line-2 bg-paper-2 text-ink-3")}>
                    {cur && <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/30" />}
                    <span className="relative">{st.unlocked ? g.emoji : <Lock className="h-4 w-4" />}</span>
                  </motion.button>
                  {st.done && <p className="absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 gap-0.5">{Array.from({ length: 3 }, (_, k) => <Star key={k} className={cn("h-2.5 w-2.5", k < st.stars ? "fill-[#f0c35a] text-[#f0c35a]" : "text-line-2")} />)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Card className="p-4">
          <p className="font-display text-2xl">{hi ? "ज्ञान यात्रा" : "Gyaan Yatra"}</p>
          <p className="text-xs text-ink-3">{subject} · {hi ? "हर अध्याय एक स्तर" : "every chapter is a level"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <span className="flex items-center gap-1.5 rounded-xl bg-marigold-50 px-2.5 py-1.5"><Star className="h-4 w-4 fill-[#f0c35a] text-[#f0c35a]" />{n(stars)}/{n(maxStars)}</span>
            <span className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-2.5 py-1.5"><Coins className="h-4 w-4 text-marigold-600" />{n(d.coins)}</span>
          </div>
        </Card>
        <Card className="space-y-1.5 p-4 text-xs text-ink-2">
          {(Object.keys(STAGE_GAME) as StageGame[]).map((k) => <p key={k}><span className="mr-1">{STAGE_GAME[k].emoji}</span><b>{hi ? STAGE_GAME[k].hi : STAGE_GAME[k].en}</b> — {hi ? STAGE_GAME[k].howHi : STAGE_GAME[k].how}</p>)}
          <p className="pt-1 text-ink-3">❤️×3 · ✂️ 50:50 = {d.hint_price} 🪙 · 👁️ {hi ? "झाँकें" : "Peek"} = 1 ❤️</p>
        </Card>
        {d.total_chapters > d.demo_chapters && <p className="px-1 text-[0.7rem] text-ink-3">{hi ? `डेमो: पहले ${d.demo_chapters} अध्याय` : `Demo: the first ${d.demo_chapters} chapters`}</p>}
      </div>
    </div>
  );
}

/* ── playing a stage ───────────────────────────────────────────────────── */

type Task =
  | { kind: "quiz"; q: GameQ; options: string[] }
  | { kind: "truefalse"; q: GameQ; shown: string; truth: boolean }
  | { kind: "oddone"; items: string[]; odd: number; explain: string };

function buildTasks(game: StageGame, qs: GameQ[]): Task[] {
  if (game === "quiz") return qs.slice(0, ROUND).map((q) => ({ kind: "quiz", q, options: shuffle([q.a, ...q.wrong.slice(0, 3)]) }));
  if (game === "truefalse") return qs.slice(0, ROUND).map((q) => { const truth = Math.random() < 0.5 || !q.wrong.length; return { kind: "truefalse", q, truth, shown: truth ? q.a : q.wrong[0] }; });
  if (game === "oddone") {
    const out: Task[] = [];
    for (let k = 0; k < ROUND; k++) { const o = makeOddOne(qs); if (o) out.push({ kind: "oddone", ...o }); }
    return out;
  }
  return [];
}

function StagePlayer({ subject, grade, stage, level, coins: startCoins, hintPrice, onExit }: {
  subject: string; grade: number; stage: JourneyStage; level: JourneyLevel; coins: number; hintPrice: number; onExit: () => void;
}) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const g = STAGE_GAME[stage.game];
  const [qs] = useState(() => makeQuestions(subject, `${level.title} ${stage.title}`, grade, stage.game === "match" ? 5 : 12));
  const [tasks] = useState(() => buildTasks(stage.game, qs));
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correct, setCorrect] = useState(0);
  const [hints, setHints] = useState(0);
  const [coins, setCoins] = useState(startCoins);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string | number | boolean | null>(null);
  const [peek, setPeek] = useState(false);
  const [result, setResult] = useState<null | { stars: number; cleared: boolean; points: number; next: JourneyStage | null }>(null);
  const total = stage.game === "match" ? qs.length : tasks.length;
  const t = tasks[i];

  const finish = async (c: number, h: number) => {
    try {
      const r = await api.journeyComplete({ subject, topic_id: stage.id, correct: c, total: Math.max(1, total), hearts_left: h, hints_used: hints });
      setResult(r);
    } catch (e) { toast.error((e as Error).message); onExit(); }
  };
  const answer = (right: boolean, val: string | number | boolean) => {
    if (picked != null) return;
    setPicked(val);
    const c = correct + (right ? 1 : 0), h = hearts - (right ? 0 : 1);
    setCorrect(c); setHearts(h);
    setTimeout(() => {
      setPicked(null); setPeek(false); setHidden(new Set());
      if (h <= 0 || i + 1 >= tasks.length) void finish(c, h); else setI(i + 1);
    }, right ? 650 : 1300);
  };
  const fifty = async () => {
    if (!t || t.kind !== "quiz" || hidden.size) return;
    try {
      const r = await api.spendCoins(hintPrice, "fifty");
      setCoins(r.coins); setHints((x) => x + 1);
      setHidden(new Set(shuffle(t.options.filter((o) => o !== t.q.a)).slice(0, 2)));
    } catch (e) { toast.error((e as Error).message); }
  };
  const doPeek = () => { if (hearts > 1 && !peek) { setPeek(true); setHearts((h) => h - 1); setHints((x) => x + 1); } };

  if (result) return <StageResult r={result} title={stage.title} onExit={onExit} />;
  if (stage.game !== "match" && !tasks.length) return <Card className="p-8 text-center text-ink-3">{hi ? "इस स्टेज के लिए प्रश्न तैयार हो रहे हैं।" : "Questions for this stage are on their way."}<button onClick={onExit} className="mt-3 block w-full text-sky-700">{hi ? "वापस" : "Back"}</button></Card>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-ink-3">{hi ? "स्तर" : "Level"} {n(level.number)} · {level.title}</p>
          <p className="truncate font-display text-2xl">{g.emoji} {hi ? g.hi : g.en} · <span className="text-ink-2">{stage.title}</span></p>
        </div>
        <span className="flex items-center gap-0.5" aria-label={`${hearts} hearts`}>
          {[0, 1, 2].map((k) => <motion.span key={k} animate={k >= hearts ? { scale: [1, 1.4, 0.9], opacity: 0.3 } : { scale: 1, opacity: 1 }}><Heart className={cn("h-5 w-5", k < hearts ? "fill-rose text-rose" : "text-line-2")} /></motion.span>)}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-marigold-50 px-2.5 py-1 text-sm font-semibold text-marigold-600"><Coins className="h-4 w-4" />{n(coins)}</span>
      </div>
      <p className="text-sm text-ink-3">{hi ? g.howHi : g.how}</p>
      <div className="h-2 overflow-hidden rounded-full bg-paper-3"><motion.div className="h-full rounded-full bg-sky-600" animate={{ width: `${(100 * (stage.game === "match" ? correct : i)) / Math.max(1, total)}%` }} /></div>

      {stage.game === "match" ? (
        <MatchStage qs={qs} hearts={hearts} onWrong={() => setHearts((h) => h - 1)} onPair={() => setCorrect((c) => c + 1)}
          onDone={(c, h) => void finish(c, h)} onHint={async () => { try { const r = await api.spendCoins(hintPrice, "match"); setCoins(r.coins); setHints((x) => x + 1); return true; } catch (e) { toast.error((e as Error).message); return false; } }} hintPrice={hintPrice} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22 }}>
            <Card className="p-6">
              {t.kind === "quiz" && (
                <>
                  <p className="font-display text-3xl text-ink">{t.q.q}</p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {t.options.map((o) => hidden.has(o) ? <span key={o} className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-ink-3 line-through opacity-40">{o}</span> : (
                      <motion.button key={o} whileTap={{ scale: 0.96 }} onClick={() => answer(o === t.q.a, o)} animate={picked === o && o !== t.q.a ? { x: [0, -8, 8, -4, 0] } : {}}
                        className={cn("rounded-2xl border-2 px-4 py-3 text-left font-medium transition-colors",
                          (picked != null || peek) && o === t.q.a ? "border-sage bg-sage-100" : picked === o ? "border-rose bg-rose-100" : "border-line hover:border-sky-400 hover:bg-sky-50")}>{o}</motion.button>
                    ))}
                  </div>
                </>
              )}
              {t.kind === "truefalse" && (
                <>
                  <p className="text-sm text-ink-3">{t.q.q}</p>
                  <p className="mt-1 font-display text-4xl text-ink">{t.shown}</p>
                  {(peek || picked != null) && <p className="mt-2 text-sm text-ink-2">{hi ? "सही उत्तर" : "Answer"}: <b>{t.q.a}</b></p>}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => answer(t.truth, true)} className={cn("rounded-2xl py-4 text-lg font-semibold text-white", picked === true ? (t.truth ? "bg-sage" : "bg-rose") : "bg-sage/90")}>{hi ? "सच" : "True"}</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => answer(!t.truth, false)} className={cn("rounded-2xl py-4 text-lg font-semibold text-white", picked === false ? (!t.truth ? "bg-sage" : "bg-rose") : "bg-rose/90")}>{hi ? "झूठ" : "False"}</motion.button>
                  </div>
                </>
              )}
              {t.kind === "oddone" && (
                <div className="space-y-2">
                  {t.items.map((it, k) => (
                    <motion.button key={k} whileTap={{ scale: 0.98 }} onClick={() => answer(k === t.odd, k)}
                      className={cn("w-full rounded-2xl border-2 px-4 py-3 text-left text-sm transition-colors",
                        (picked != null || peek) && k === t.odd ? "border-rose bg-rose-100" : picked === k ? "border-rose bg-rose-50" : "border-line hover:border-sky-400")}>{it}</motion.button>
                  ))}
                  {(picked != null || peek) && <p className="pt-1 text-sm text-ink-2">✓ {t.explain}</p>}
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {stage.game !== "match" && (
        <div className="flex flex-wrap gap-2">
          {t?.kind === "quiz" && <button onClick={() => void fifty()} disabled={!!hidden.size || picked != null || coins < hintPrice}
            className="inline-flex items-center gap-1.5 rounded-full border border-marigold-200 bg-marigold-50 px-3 py-1.5 text-sm font-medium text-marigold-600 disabled:opacity-40"><Scissors className="h-4 w-4" />50:50 · {hintPrice} 🪙</button>}
          <button onClick={doPeek} disabled={peek || hearts <= 1 || picked != null}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-100/60 px-3 py-1.5 text-sm font-medium text-rose disabled:opacity-40"><Eye className="h-4 w-4" />{hi ? "झाँकें" : "Peek"} · 1 ❤️</button>
        </div>
      )}
    </div>
  );
}

function MatchStage({ qs, hearts, onWrong, onPair, onDone, onHint, hintPrice }: {
  qs: GameQ[]; hearts: number; onWrong: () => void; onPair: () => void; onDone: (c: number, h: number) => void; onHint: () => Promise<boolean>; hintPrice: number;
}) {
  const { lang } = useI18n();
  const right = useMemo(() => shuffle(qs.map((q, i) => ({ i, a: q.a }))), [qs]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [h, setH] = useState(hearts);
  const finished = useRef(false);
  useEffect(() => {
    if (finished.current) return;
    if (done.size === qs.length || h <= 0) { finished.current = true; setTimeout(() => onDone(done.size, h), 500); }
  }, [done, h, qs.length, onDone]);
  const pick = (ri: number) => {
    if (sel == null || done.has(ri)) return;
    if (ri === sel) { setDone(new Set(done).add(ri)); setSel(null); onPair(); }
    else { setWrong(ri); setH((x) => x - 1); onWrong(); setTimeout(() => setWrong(null), 450); }
  };
  const hint = async () => {
    const left = qs.map((_, i) => i).filter((i) => !done.has(i));
    if (!left.length || !(await onHint())) return;
    setDone(new Set(done).add(left[0]));
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">{qs.map((q, i) => (
          <button key={i} disabled={done.has(i)} onClick={() => setSel(i)}
            className={cn("w-full rounded-2xl border-2 p-3 text-left text-sm transition-all", done.has(i) ? "border-sage bg-sage-100 opacity-60" : sel === i ? "border-sky-500 bg-sky-50" : "border-line bg-surface hover:border-sky-300")}>{q.q}</button>
        ))}</div>
        <div className="space-y-2">{right.map((r) => (
          <motion.button key={r.i} onClick={() => pick(r.i)} animate={wrong === r.i ? { x: [0, -6, 6, 0] } : {}} disabled={done.has(r.i)}
            className={cn("w-full rounded-2xl border-2 p-3 text-left text-sm font-medium", done.has(r.i) ? "border-sage bg-sage-100 opacity-60" : wrong === r.i ? "border-rose bg-rose-100" : "border-line bg-surface hover:border-marigold-400")}>{r.a}</motion.button>
        ))}</div>
      </div>
      <button onClick={() => void hint()} className="inline-flex items-center gap-1.5 rounded-full border border-marigold-200 bg-marigold-50 px-3 py-1.5 text-sm font-medium text-marigold-600">
        <Sparkles className="h-4 w-4" />{lang === "hi" ? "एक जोड़ी दिखाएँ" : "Show one pair"} · {hintPrice} 🪙
      </button>
    </div>
  );
}

function StageResult({ r, title, onExit }: { r: { stars: number; cleared: boolean; points: number; next: JourneyStage | null }; title: string; onExit: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-md">
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((k) => (
            <motion.span key={k} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25 + k * 0.25, type: "spring", stiffness: 260 }}>
              <Star className={cn("h-12 w-12", k < r.stars ? "fill-[#f0c35a] text-[#d9a21b]" : "text-line-2")} />
            </motion.span>
          ))}
        </div>
        <p className="mt-4 font-display text-4xl">{r.cleared ? (r.stars === 3 ? (hi ? "शानदार!" : "Brilliant!") : (hi ? "स्टेज पार!" : "Stage cleared!")) : (hi ? "फिर कोशिश करें" : "Try again")}</p>
        <p className="mt-1 text-sm text-ink-2">{title}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-marigold-50 px-3 py-1 text-sm font-semibold text-marigold-600"><Coins className="h-4 w-4" />+{n(r.points)}</p>
        {r.next && <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-sage"><Trophy className="h-4 w-4" />{hi ? "अगला खुला" : "Unlocked"}: <b>{r.next.title}</b></p>}
        {!r.cleared && <p className="mt-3 text-xs text-ink-3">{hi ? "आधे सही और कम से कम एक ❤️ चाहिए।" : "Get at least half right with a ❤️ left to clear it."}</p>}
        <button onClick={onExit} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><X className="h-4 w-4" />{hi ? "नक्शे पर लौटें" : "Back to the map"}</button>
      </Card>
    </motion.div>
  );
}
