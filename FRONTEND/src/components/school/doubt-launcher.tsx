"use client";

import { useEffect, useRef, useState } from "react";
import { useFabLift } from "@/lib/fab";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, MessageCircleQuestion, Send, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { DoubtThread } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { Input } from "@/components/ui/primitives";
import { DoubtConversation, SaathiBadge, STATUS_TONE, statusLabel, useThread } from "./doubt-chat";
import { cn, EASE } from "@/lib/utils";

const L = {
  en: { button: "Ask a doubt", title: "Ask Saathi", sub: "Doubt agents answer in seconds. Still stuck after 3 tries? Your teacher steps in.",
    placeholder: "What didn't make sense?", chips: ["Explain this again, simpler", "Give me a real-life example", "Why does this happen?", "Can you solve one step by step?"], newQ: "New doubt" },
  hi: { button: "डाउट पूछें", title: "साथी से पूछें", sub: "डाउट एजेंट सेकंडों में जवाब देते हैं। 3 कोशिशों के बाद भी उलझन? आपके शिक्षक मदद करेंगे।",
    placeholder: "क्या समझ नहीं आया?", chips: ["इसे और आसान तरीके से समझाइए", "असल ज़िंदगी का उदाहरण दीजिए", "ऐसा क्यों होता है?", "एक सवाल कदम-दर-कदम हल कीजिए"], newQ: "नया डाउट" },
};

/** Floating "Ask a doubt" for the classroom: pauses the video and opens the doubt agents. */
export function DoubtLauncher({ lessonId, nodeId, concept, video, hidden = false }: { lessonId: string; nodeId: string | null; concept?: string; video: HTMLVideoElement | null; hidden?: boolean }) {
  const { lang } = useI18n();
  const lx = L[lang === "hi" ? "hi" : "en"];
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [first, setFirst] = useState<DoubtThread | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const thread = useThread(threadId, first);
  const btn = useRef<HTMLButtonElement>(null);
  const lift = useFabLift(btn, !hidden && !open);

  const show = () => { video?.pause(); setOpen(true); };
  // "D" opens the doubt box (when not typing somewhere).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey && tag !== "INPUT" && tag !== "TEXTAREA") { video?.pause(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [video]);
  const ask = async (question: string) => {
    if (question.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      const t = await api.askDoubt({ question: question.trim(), concept, lesson_id: lessonId, node_id: nodeId ?? undefined, lang });
      setFirst(t);
      setThreadId(t.id);
      setQ("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <>
      {/* Floating bottom-right. It steps aside whenever a checkpoint question,
          overlay or bottom sheet needs that corner, and the study panel keeps room under it. */}
      <AnimatePresence>
        {!hidden && !open && (
          <motion.button ref={btn} key="ask" onClick={show} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: -lift }} exit={{ scale: 0.8, opacity: 0 }} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
            className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-ink py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-[var(--shadow-lift)] ring-4 ring-paper sm:bottom-6 sm:right-6"
            data-testid="ask-doubt" title={`${lx.button} (D)`}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><SaathiBadge size={30} /></span>
            <MessageCircleQuestion className="h-4 w-4" />{lx.button}
            {threadId && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-marigold ring-2 ring-ink" />}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/25 p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
              className="flex max-h-[88dvh] w-full flex-col rounded-t-[28px] border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lift)] sm:max-h-[calc(100dvh-3rem)] sm:w-[440px] sm:rounded-[28px]">
              <div className="flex items-start gap-3 border-b border-line pb-3">
                <SaathiBadge size={42} thinking={busy} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl leading-tight text-ink">{lx.title}</p>
                  <p className="text-xs text-ink-3">{lx.sub}</p>
                </div>
                {thread.data && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold", STATUS_TONE[thread.data.status])}>{statusLabel(thread.data.status, lang)}</span>}
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-ink-3 hover:bg-paper-2" aria-label="close"><X className="h-4 w-4" /></button>
              </div>

              {thread.data ? (
                <>
                  <DoubtConversation thread={thread.data} onUpdate={setFirst} compact />
                  <button onClick={() => { setThreadId(null); setFirst(null); }} className="mt-2 self-start text-xs font-medium text-sky-700 hover:underline">+ {lx.newQ}</button>
                </>
              ) : (
                <div className="py-4">
                  <div className="flex flex-wrap gap-2">
                    {lx.chips.map((c) => (
                      <button key={c} disabled={busy} onClick={() => void ask(c)} className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink-2 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:text-ink">{c}</button>
                    ))}
                  </div>
                  <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
                    <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={lx.placeholder} className="h-11" maxLength={2000} />
                    <button type="submit" disabled={busy || q.trim().length < 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50" aria-label="send">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
