"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, FileText, Loader2, Sparkles, Type } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { cn, EASE } from "@/lib/utils";

/* Seconds since mount, ticking every 250 ms; drives the server-side stages,
   which report no progress of their own. */
function useElapsed(active = true) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => setS((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

function Steps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="mt-4 space-y-2">
      {steps.map((label, i) => {
        const done = i < active, now = i === active;
        return (
          <li key={label} className={cn("flex items-center gap-3 text-sm transition-colors", done ? "text-ink-2" : now ? "text-ink" : "text-ink-3")}>
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border",
              done ? "border-sage bg-sage-100 text-sage" : now ? "border-sky-400 text-sky-600" : "border-line")}>
              {done ? <Check className="h-3 w-3" /> : now ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            </span>
            <span className={cn(now && "font-medium")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/* ── document upload ───────────────────────────────────────────────────── */

export function UploadProgress({ file, pct }: { file: File; pct: number }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const uploaded = pct >= 100;
  const since = useElapsed(uploaded);
  // Upload fills the first 60%; server work then eases toward 96% until it answers.
  const overall = uploaded ? 60 + 36 * (1 - Math.exp(-since / 9)) : pct * 0.6;
  const stage = !uploaded ? 0 : since < 3 ? 1 : since < 7 ? 2 : 3;
  const steps = hi
    ? [`अपलोड हो रहा है · ${pct}%`, "पन्ने पढ़े जा रहे हैं", "अध्याय और विषय पहचाने जा रहे हैं", "खोज के लिए इंडेक्स बन रहा है"]
    : [`Uploading · ${pct}%`, "Reading the pages", "Finding chapters and key terms", "Building the search index"];

  return (
    <div className="rounded-3xl border border-line bg-surface p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        {/* a page being scanned */}
        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-paper">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className="absolute left-2 right-2 h-[3px] rounded bg-line-2" style={{ top: 10 + i * 9, right: i === 4 ? 18 : 8 }} />)}
          <motion.span className="absolute inset-x-0 h-4 bg-gradient-to-b from-transparent via-sky-300/60 to-transparent"
            animate={{ top: ["-20%", "100%"] }} transition={{ duration: uploaded ? 1.1 : 1.8, repeat: Infinity, ease: "linear" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{file.name}</p>
          <p className="text-xs text-ink-3">{kb(file.size)} · {Math.round(overall)}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-3">
            <motion.div className="relative h-full rounded-full bg-sky-500" animate={{ width: `${overall}%` }} transition={{ ease: "easeOut", duration: 0.4 }}>
              <span className="absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.5),transparent)] bg-[length:200%_100%]" />
            </motion.div>
          </div>
        </div>
      </div>
      <Steps steps={steps} active={stage} />
      {uploaded && since > 12 && (
        <p className="mt-3 text-xs text-ink-3">{hi ? "बड़ी फ़ाइलों में एक मिनट तक लग सकता है।" : "Large files can take up to a minute."}</p>
      )}
    </div>
  );
}

/* ── plan generation ───────────────────────────────────────────────────── */

export function PlanBuilding({ source, label, terms = [], level, minutes }: {
  source: "topic" | "doc"; label: string; terms?: string[]; level: string; minutes: number;
}) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const since = useElapsed();
  const steps = source === "doc"
    ? (hi ? ["आपका दस्तावेज़ पढ़ना", "मुख्य अवधारणाएँ चुनना", `${level} स्तर के लिए क्रम तय करना`, "चेकपॉइंट प्रश्न रखना"]
          : ["Reading your document", "Picking the key concepts", `Ordering them for a ${level} learner`, "Placing checkpoint questions"])
    : (hi ? ["विषय समझना", "पूर्व-ज्ञान का नक्शा बनाना", `${minutes} मिनट में फिट करना`, "चेकपॉइंट प्रश्न रखना"]
          : ["Understanding the topic", "Mapping what comes first", `Fitting it into ${minutes} minutes`, "Placing checkpoint questions"]);
  const active = Math.min(steps.length - 1, Math.floor(since / 3.2));
  const chips = (terms.length ? terms : []).slice(0, 6);
  const rows = Math.min(5, 1 + Math.floor(since / 1.6));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="w-full rounded-3xl border border-line bg-surface p-5" role="status" aria-live="polite">
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        {/* input */}
        <div className="min-w-0 rounded-2xl border border-line bg-paper p-3">
          <p className="flex items-center gap-2 text-xs text-ink-3">
            {source === "doc" ? <FileText className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
            {source === "doc" ? (hi ? "आपका दस्तावेज़" : "Your document") : (hi ? "आपका विषय" : "Your topic")}
          </p>
          <p className="mt-1 truncate font-medium text-ink">{label}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <AnimatePresence>
              {chips.slice(0, Math.floor(since / 0.8)).map((c) => (
                <motion.span key={c} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.7rem] text-sky-700">{c}</motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
        {/* thinking node with flowing dots */}
        <div className="relative flex items-center justify-center gap-2 py-2">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-400"
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
          <motion.span className="grid h-11 w-11 place-items-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-sky-200"
            animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <Sparkles className="h-5 w-5" />
          </motion.span>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-400"
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 + i * 0.2 }} />
          ))}
        </div>
        {/* plan taking shape */}
        <div className="rounded-2xl border border-line bg-paper p-3">
          <p className="text-xs text-ink-3">{hi ? "आपका पाठ-क्रम" : "Your lesson plan"}</p>
          <ol className="mt-2 space-y-1.5">
            {Array.from({ length: rows }).map((_, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-sky-600">{i + 1}</span>
                <span className="h-2 rounded-full bg-paper-3" style={{ width: `${55 + ((i * 37) % 40)}%` }} />
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
      <Steps steps={steps} active={active} />
    </motion.div>
  );
}
