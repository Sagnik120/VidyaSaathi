"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, Flag, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { SkillConcept } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { Card, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const COURSE_GOAL = "__all__";
export const trackGoal = (track: string) => `__track_${track}`;

/* The learner's own map + saved goal; shared by the Progress map and the home goal card. */
export function useSkillGoal() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["skill-map", "me"], queryFn: () => api.skillMap(), placeholderData: keepPreviousData, refetchOnMount: "always" });
  const [saving, setSaving] = useState(false);
  const setGoal = async (goal: string | null) => {
    setSaving(true);
    try { qc.setQueryData(["skill-map", "me"], await api.setSkillGoal(goal)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  return { q, data: q.data, setGoal, saving };
}

const TXT = {
  en: {
    title: "Your AI skill map", sub: "Pick what you want to understand. VidyaSaathi routes you there, skipping what you've mastered.",
    goal: "Your goal", search: "Search a concept, or type any new AI topic…", add: "Add “{t}” to the map", adding: "Placing it on the map…",
    route: "Your route", steps: "{n} steps to go", done: "You've mastered everything on this route.", clear: "Clear goal",
    next: "Up next", practice: "Practise again", started: "In progress", start: "Start", mastered: "mastered",
    legend: ["Mastered", "Needs practice", "Started", "On your route"], hint: "Click any concept to make it your goal.",
    added: "Added to the map", custom: "new", recap: "Quick recap", course: "Learn AI from zero",
  },
  hi: {
    title: "आपका AI स्किल मैप", sub: "चुनिए आप क्या समझना चाहते हैं। शिक्षक वहाँ तक का रास्ता बनाता है, जो आप जानते हैं उसे छोड़कर।",
    goal: "आपका लक्ष्य", search: "कोई अवधारणा खोजें, या कोई नया AI विषय लिखें…", add: "“{t}” को मैप में जोड़ें", adding: "मैप में जोड़ा जा रहा है…",
    route: "आपका रास्ता", steps: "{n} कदम बाकी", done: "इस रास्ते की हर चीज़ में आपको महारत है।", clear: "लक्ष्य हटाएँ",
    next: "अगला", practice: "फिर अभ्यास करें", started: "जारी", start: "शुरू करें", mastered: "महारत",
    legend: ["महारत", "अभ्यास चाहिए", "शुरू किया", "आपके रास्ते पर"], hint: "किसी भी अवधारणा पर क्लिक करके उसे लक्ष्य बनाइए।",
    added: "मैप में जोड़ा गया", custom: "नया", recap: "जल्दी दोहराएँ", course: "शुरू से AI सीखें",
  },
};

export function SkillMap() {
  const { lang, n } = useI18n();
  const tx = TXT[lang === "hi" ? "hi" : "en"];
  const qc = useQueryClient();
  const { q, data, setGoal: saveGoal, saving } = useSkillGoal();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const setGoal = (g: string | null) => { setQuery(""); void saveGoal(g); };
  const byId = useMemo(() => new Map((data?.concepts ?? []).map((c) => [c.id, c])), [data]);
  const onRoute = useMemo(() => new Set((data?.route ?? []).map((s) => s.id)), [data]);
  const hoverPre = useMemo(() => new Set(hover ? byId.get(hover)?.prereqs ?? [] : []), [hover, byId]);

  const term = query.trim().toLowerCase();
  const matches = term ? (data?.concepts ?? []).filter((c) => c.title.toLowerCase().includes(term)).slice(0, 6) : [];
  const exact = matches.some((c) => c.title.toLowerCase() === term);

  const addTopic = async () => {
    setAdding(true);
    try {
      const c = await api.addSkillConcept(query.trim());
      if (!c.existing) toast.success(tx.added);
      await qc.invalidateQueries({ queryKey: ["skill-map"] });
      await saveGoal(c.id);
      setQuery("");
    } catch (e) { toast.error((e as Error).message); } finally { setAdding(false); }
  };

  if (q.isLoading || !data) return <Skeleton className="h-96 rounded-[var(--radius)]" />;

  return (
    <Card id="skill-map" className="scroll-mt-24 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-3xl text-ink">{tx.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">{tx.sub}</p>
        </div>
        <p className="text-sm font-medium text-ink-2">{n(data.mastered_count)} / {n(data.concepts.length)} {tx.mastered}</p>
      </div>

      {/* goal picker */}
      <div className="relative mt-5">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-2.5 focus-within:border-sky-400">
          <Search className="h-4 w-4 shrink-0 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx.search} maxLength={80}
            onKeyDown={(e) => { if (e.key === "Enter" && term) { if (matches[0] && (exact || matches.length === 1)) setGoal(matches[0].id); else void addTopic(); } }}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" />
        </div>
        <AnimatePresence>
          {term && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lift)]">
              {matches.map((c) => (
                <button key={c.id} onClick={() => setGoal(c.id)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-paper-2">
                  <Flag className="h-3.5 w-3.5 text-ink-3" /><span className="truncate">{c.title}</span>
                </button>
              ))}
              {!exact && term.length >= 2 && (
                <button onClick={() => void addTopic()} disabled={adding} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm text-sky-700 hover:bg-sky-50">
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  <span className="truncate">{adding ? tx.adding : tx.add.replace("{t}", query.trim())}</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <button onClick={() => setGoal(COURSE_GOAL)} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium",
          data.goal === COURSE_GOAL ? "border-marigold-600 bg-marigold-100 text-ink" : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400")}>
          <Sparkles className="h-3 w-3" />{tx.course}
        </button>
        {data.tracks.map((t) => (
          <button key={t.id} onClick={() => setGoal(trackGoal(t.id))} className={cn("rounded-full border px-2.5 py-1",
            data.goal === trackGoal(t.id) ? "border-marigold-600 bg-marigold-100 text-ink" : "border-line text-ink-2 hover:border-sky-300")}>
            {t.title}
          </button>
        ))}
        {data.goal && !saving && (
          <button onClick={() => setGoal(null)} className="inline-flex items-center gap-1 px-1.5 text-ink-3 hover:text-ink"><X className="h-3 w-3" />{tx.clear}</button>
        )}
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
      </div>

      {/* map */}
      <div className="mt-6 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {data.tracks.map((track) => {
          const cs = data.concepts.filter((c) => c.track === track.id);
          const m = cs.filter((c) => c.mastery?.state === "mastered").length;
          return (
          <div key={track.id} className="min-w-0 break-inside-avoid rounded-2xl border border-line bg-paper/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-ink-3" title={track.title}>{track.title}</p>
              <span className="shrink-0 font-mono text-[11px] text-ink-3">{m}/{cs.length}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-3">
              <motion.div className="h-full rounded-full bg-sage" initial={{ width: 0 }} animate={{ width: `${cs.length ? (m / cs.length) * 100 : 0}%` }} transition={{ duration: 0.8 }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cs.map((c) => (
                <Chip key={c.id} c={c} goal={c.id === data.goal} route={onRoute.has(c.id)} pre={hoverPre.has(c.id)}
                  onHover={setHover} onPick={() => setGoal(c.id)} customLabel={tx.custom} />
              ))}
            </div>
          </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        {[["bg-sage", tx.legend[0]], ["bg-amber", tx.legend[1]], ["bg-sky-400", tx.legend[2]], ["ring-2 ring-sky-300 bg-surface", tx.legend[3]]].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", c)} />{l}</span>
        ))}
        <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />{tx.hint}</span>
      </div>
    </Card>
  );
}

function Chip({ c, goal, route, pre, onHover, onPick, customLabel }: {
  c: SkillConcept; goal: boolean; route: boolean; pre: boolean; onHover: (id: string | null) => void; onPick: () => void; customLabel: string;
}) {
  const st = c.mastery?.state;
  return (
    <button onClick={onPick} onMouseEnter={() => onHover(c.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(c.id)} onBlur={() => onHover(null)}
      title={c.mastery?.score != null ? `${Math.round(c.mastery.score * 100)}%` : undefined}
      className={cn("inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all",
        goal ? "border-marigold-600 bg-marigold-100 font-semibold text-ink" :
        st === "mastered" ? "border-sage/40 bg-sage-100 text-ink" :
        st === "practice" ? "border-amber/50 bg-amber-100 text-ink" :
        st === "started" ? "border-sky-200 bg-sky-50 text-ink" : "border-line text-ink-2 hover:border-sky-300",
        route && !goal && "ring-2 ring-sky-300", pre && "scale-105 border-sky-500 shadow-[var(--shadow-soft)]")}>
      {goal && <Flag className="h-3 w-3 shrink-0" />}
      {st === "mastered" && !goal && <Check className="h-3 w-3 shrink-0 text-sage" />}
      <span className="truncate" title={c.title}>{c.title}</span>
      {c.custom && <span className="rounded-full bg-sky-100 px-1.5 text-[0.6rem] text-sky-700">{customLabel}</span>}
    </button>
  );
}
