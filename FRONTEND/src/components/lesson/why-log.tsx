"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, BookOpen, Brain, Hand, Lightbulb, Map, RefreshCw, Search, SkipForward, Wand2 } from "lucide-react";
import { api } from "@/core/api";
import type { WhyEntry } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { cn, EASE } from "@/lib/utils";

type Lang = "en" | "hi";
const list = (xs: unknown) => (Array.isArray(xs) ? xs.filter(Boolean).join(", ") : "");
const tag = (t: unknown) => (typeof t === "string" ? t.replace(/_/g, " ") : "");

/* One sentence per decision, in the learner's language. */
function phrase(e: WhyEntry, lang: Lang): { text: string; icon: React.ReactNode; tone: string } | null {
  const p = e.params, c = e.concept ? `“${e.concept}”` : lang === "hi" ? "इस हिस्से" : "this part";
  const hi = lang === "hi";
  switch (e.kind) {
    case "memory":
      return { icon: <Brain />, tone: "text-sky-700 bg-sky-50", text: hi
        ? `पिछले पाठों से याद रखा: ${list(p.weak) || list(p.misconceptions)} पर आपको और मदद चाहिए थी, इसलिए योजना में इसे ध्यान में रखा।`
        : `Remembered from earlier lessons: you found ${list(p.weak) || list(p.misconceptions)} hard, so the plan accounts for it.` };
    case "plan":
      return { icon: <Map />, tone: "text-sky-700 bg-sky-50", text: hi
        ? `${p.parts ?? ""} हिस्सों की योजना बनाई${p.from_document ? ", आपके दस्तावेज़ से" : ""}${p.used_memory ? ", आपकी पिछली प्रगति के अनुसार" : ""}।`
        : `Planned ${p.parts ?? ""} parts${p.from_document ? " from your document" : ""}${p.used_memory ? ", shaped by your past progress" : ""}.` };
    case "path": {
      const bits = hi
        ? [`यह पाठ “${p.goal}” तक के आपके रास्ते का एक कदम है।`,
           list(p.skipped) && `${list(p.skipped)} आप जानते हैं, इसलिए दोबारा नहीं पढ़ाया।`,
           list(p.recap) && `${list(p.recap)} की छोटी दोहराई जोड़ी।`,
           p.retry_percent != null && `पिछली बार ${p.retry_percent}% आया था, इसलिए नए तरीके से समझाया।`,
           p.next && `अंत में “${p.next}” से जोड़ा।`]
        : [`This lesson is a step on your route to “${p.goal}”.`,
           list(p.skipped) && `Didn't re-teach ${list(p.skipped)}: you know it.`,
           list(p.recap) && `Added a quick recap of ${list(p.recap)}.`,
           p.retry_percent != null && `You scored ${p.retry_percent}% last time, so it's explained from a new angle.`,
           p.next && `Ends with a bridge to “${p.next}”.`];
      return { icon: <SkipForward />, tone: "text-sky-700 bg-sky-50", text: bits.filter(Boolean).join(" ") };
    }
    case "refined_search":
      return { icon: <Search />, tone: "text-ink-2 bg-paper-3", text: hi ? `${c} के लिए आपके दस्तावेज़ में बेहतर खोज की।` : `Searched your document again with a sharper query for ${c}.` };
    case "no_context":
      return { icon: <BookOpen />, tone: "text-amber bg-amber-100", text: hi ? `आपके नोट्स में ${c} नहीं था, इसलिए सामान्य ज्ञान से पढ़ाया।` : `Your notes didn't cover ${c}, so it was taught from general knowledge.` };
    case "adapt_modify":
      return { icon: <RefreshCw />, tone: "text-marigold-600 bg-marigold-100", text: hi
        ? `${c} को नए उदाहरण से फिर समझाया${p.misconception ? ` (आपके उत्तर में “${tag(p.misconception)}” वाली गलती दिखी)` : ""}।`
        : `Re-explained ${c} with a new example${p.misconception ? `: your answer showed “${tag(p.misconception)}”` : ""}.` };
    case "adapt_regenerate":
      return { icon: <Wand2 />, tone: "text-marigold-600 bg-marigold-100", text: hi
        ? `${c} को शुरू से सरल कदमों में दोबारा बनाया: यह ${p.attempt ?? 2}वाँ प्रयास था।`
        : `Rebuilt ${c} from scratch in simpler steps: attempt ${p.attempt ?? 2} on the same idea.` };
    case "adapt_human":
    case "mentor":
      return { icon: <Hand />, tone: "text-rose bg-rose-100", text: hi ? `${c} पर कई प्रयासों के बाद आपके मेंटर को आपके उत्तरों के साथ सूचित किया।` : `Told your mentor about ${c}, with your answers, after several tries.` };
    case "escalation_continued":
      return { icon: <Hand />, tone: "text-ink-2 bg-paper-3", text: hi ? `मेंटर की मदद के बाद ${c} से आगे बढ़े।` : `Continued past ${c} after help from your mentor.` };
    case "escalation_skipped":
      return { icon: <SkipForward />, tone: "text-ink-2 bg-paper-3", text: hi ? `${c} को बाद में दोहराने के लिए छोड़ा।` : `Set ${c} aside to review later.` };
    case "level": {
      const up = Number(p.to) > Number(p.frm);
      const why = p.reason === "streak" ? (hi ? "लगातार 2 सही" : "2 right in a row") : p.reason === "miss" ? (hi ? "एक उत्तर चूका" : "a missed answer") : "";
      return { icon: up ? <ArrowUp /> : <ArrowDown />, tone: up ? "text-sage bg-sage-100" : "text-sky-700 bg-sky-50", text: hi
        ? `स्तर ${p.frm} → ${p.to}${why ? ` (${why})` : ""}। अगला हिस्सा ${up ? "थोड़ा गहरा" : "आसान"} होगा।`
        : `Level ${p.frm} → ${p.to}${why ? ` (${why})` : ""}. The next part goes ${up ? "a little deeper" : "simpler"}.` };
    }
    default:
      return null;
  }
}

export function WhyLog({ lessonId, live = false, limit, className }: { lessonId: string; live?: boolean; limit?: number; className?: string }) {
  const { lang } = useI18n();
  const L: Lang = lang === "hi" ? "hi" : "en";
  // Live view refreshes while it is open; decisions arrive as the lesson runs.
  const q = useQuery({ queryKey: ["why", lessonId], queryFn: () => api.lessonWhy(lessonId), refetchInterval: live ? 6000 : false });
  const rows = (q.data?.entries ?? []).map((e) => ({ e, f: phrase(e, L) })).filter((r) => r.f);
  const shown = limit ? rows.slice(-limit) : rows;

  if (q.isLoading) return <p className={cn("text-sm text-ink-3", className)}>…</p>;
  if (!shown.length) {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-ink-3", className)}>
        <Lightbulb className="h-4 w-4" />{L === "hi" ? "जैसे ही शिक्षक आपके लिए कुछ बदलेगा, उसका कारण यहाँ दिखेगा।" : "Whenever the tutor changes something for you, the reason will show up here."}
      </p>
    );
  }
  return (
    <ol className={cn("space-y-2", className)}>
      {shown.map(({ e, f }, i) => (
        <motion.li key={`${e.kind}-${e.at}-${i}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03, ease: EASE }}
          className="flex gap-3">
          <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full [&>svg]:h-3.5 [&>svg]:w-3.5", f!.tone)}>{f!.icon}</span>
          <p className="min-w-0 break-words text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{f!.text}</p>
        </motion.li>
      ))}
    </ol>
  );
}
