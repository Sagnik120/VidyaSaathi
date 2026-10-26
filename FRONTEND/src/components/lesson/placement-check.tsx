"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ClipboardCheck, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { PlacementAnswer, PlacementStep, SkillMap } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { cn, EASE } from "@/lib/utils";

const TXT = {
  en: {
    offer: "Skip what you already know", offerSub: "A 2-minute placement check: about 6 questions, getting harder as you go right.",
    start: "Take the check", later: "Not now", q: "Question {a} of up to {b}", finishing: "Working out your level…",
    resultNone: "No problem: your path starts from the very beginning.", result: "You already know the foundations up to {c}.",
    resultSub: "Those concepts are marked known on your map and skipped in your path. Real lesson scores always override them.",
    done: "See my path", placed: "Placement: known up to {c}.", placedNone: "Placement: starting from the beginning.", retake: "Retake", reset: "Reset",
  },
  hi: {
    offer: "जो आप जानते हैं उसे छोड़ें", offerSub: "2 मिनट की जाँच: लगभग 6 प्रश्न, सही उत्तर पर कठिन होते जाते हैं।",
    start: "जाँच शुरू करें", later: "अभी नहीं", q: "प्रश्न {a} / अधिकतम {b}", finishing: "आपका स्तर निकाला जा रहा है…",
    resultNone: "कोई बात नहीं: आपका रास्ता बिल्कुल शुरुआत से शुरू होगा।", result: "आप {c} तक की बुनियाद पहले से जानते हैं।",
    resultSub: "ये अवधारणाएँ मैप पर ज्ञात मानी गईं और रास्ते में छोड़ी जाएँगी। असली पाठ के अंक हमेशा इन्हें बदल सकते हैं।",
    done: "मेरा रास्ता देखें", placed: "जाँच: {c} तक ज्ञात।", placedNone: "जाँच: शुरुआत से।", retake: "फिर से दें", reset: "हटाएँ",
  },
};

type Phase = { kind: "idle" } | { kind: "asking"; step: Extract<PlacementStep, { done: false }>["next"] } | { kind: "saving" } | { kind: "result"; upto: string | null };

export function PlacementCheck({ map }: { map: SkillMap }) {
  const { lang, n } = useI18n();
  const tx = TXT[lang === "hi" ? "hi" : "en"];
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const titleOf = (id: string | null) => (id ? map.concepts.find((c) => c.id === id)?.title ?? id : null);

  const advance = async (next: PlacementAnswer[]) => {
    setBusy(true);
    try {
      const out = await api.placementNext(next);
      setAnswers(next);
      if (!out.done) return setPhase({ kind: "asking", step: out.next });
      setPhase({ kind: "saving" });
      const saved = await api.placementSave(next);
      qc.setQueryData(["skill-map", "me"], saved.map);
      setPhase({ kind: "result", upto: saved.placement.known_upto });
    } catch (e) {
      toast.error((e as Error).message);
      setPhase({ kind: "idle" });
    } finally { setBusy(false); }
  };
  const start = () => { setAnswers([]); void advance([]); };
  const reset = async () => {
    setBusy(true);
    try { qc.setQueryData(["skill-map", "me"], await api.placementReset()); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const shell = "@container rounded-[24px] border border-sky-200 bg-sky-50/40 p-5";

  if (phase.kind === "asking") {
    const q = phase.step;
    return (
      <div className={shell}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{tx.q.replace("{a}", n(q.number)).replace("{b}", n(q.of))}</p>
          <div className="flex gap-1">{Array.from({ length: q.of }, (_, i) => <span key={i} className={cn("h-1.5 w-5 rounded-full", i < q.number - 1 ? "bg-sky-500" : i === q.number - 1 ? "bg-sky-300" : "bg-line")} />)}</div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: EASE }}>
            <p className="mt-3 text-lg font-semibold text-ink">{q.question}</p>
            <div className="mt-4 grid gap-2 @lg:grid-cols-2">
              {q.options.map((o, i) => (
                <button key={o} disabled={busy} onClick={() => void advance([...answers, { id: q.id, choice: i }])}
                  className="rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink transition-colors hover:border-sky-400 hover:bg-sky-50 disabled:opacity-60">
                  {o}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (phase.kind === "saving") {
    return <div className={cn(shell, "flex items-center gap-3 text-sm text-ink-2")}><Loader2 className="h-4 w-4 animate-spin" />{tx.finishing}</div>;
  }

  if (phase.kind === "result") {
    const c = titleOf(phase.upto);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={shell}>
        <p className="flex items-center gap-2 font-display text-2xl text-ink"><Check className="h-5 w-5 text-sage" />{c ? tx.result.replace("{c}", c) : tx.resultNone}</p>
        {c && <p className="mt-1 text-sm text-ink-2">{tx.resultSub}</p>}
        <button onClick={() => setPhase({ kind: "idle" })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">{tx.done}<ArrowRight className="h-4 w-4" /></button>
      </motion.div>
    );
  }

  /* idle: already placed -> one quiet line; otherwise offer it once a goal is set */
  if (map.placement) {
    const c = titleOf(map.placement.known_upto);
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <ClipboardCheck className="h-4 w-4" />{c ? tx.placed.replace("{c}", c) : tx.placedNone}
        <button onClick={start} disabled={busy} className="font-medium text-sky-700 hover:underline">{tx.retake}</button>·
        <button onClick={() => void reset()} disabled={busy} className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"><RotateCcw className="h-3 w-3" />{tx.reset}</button>
      </p>
    );
  }
  if (!map.goal || hidden) return null;
  return (
    <div className={cn(shell, "flex flex-wrap items-center gap-4")}>
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-sky-600"><ClipboardCheck className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{tx.offer}</p>
        <p className="text-sm text-ink-2">{tx.offerSub}</p>
      </div>
      <button onClick={() => setHidden(true)} className="text-sm text-ink-3 hover:text-ink">{tx.later}</button>
      <button onClick={start} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{tx.start}
      </button>
    </div>
  );
}
