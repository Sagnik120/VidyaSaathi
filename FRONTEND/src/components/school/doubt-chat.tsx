"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock, CheckCircle2, Eye, FileText, Hand, HelpCircle, Loader2, Paperclip, Send, Sparkles, ThumbsUp, Video, X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { DoubtMessage, DoubtThread } from "@/core/types";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { Avatar } from "@/components/brand/avatar";
import { PlaneMark } from "@/components/brand/logo";
import { Input, Textarea } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { cn, EASE } from "@/lib/utils";

const L = {
  en: {
    understood: "Got it!", confused: "Still confused", askTeacher: "Ask my teacher", typing: "Saathi is thinking…",
    placeholder: "Type a follow-up…", reply: "Reply to the student…", tryN: "Try {a} of {b}", check: "Quick check",
    reveal: "Show answer", escalated: "With your teacher", answered: "Teacher replied", resolved: "Solved", open: "Saathi is helping",
    notes: "Notes", video: "Video", live: "Live class", text: "Text", sendNotes: "Send notes", sendVideo: "Send video", schedule: "Schedule",
    attach: "Attach a file (PDF, image, doc)", chooseVideo: "Choose a recorded video", when: "When", join: "Join live class",
    expires: "Available until {d}", expired: "This recording expired and was removed to save space.", download: "Open file",
    agents: "How Saathi answered", note: "Message (optional)",
    earlier: "Show {n} earlier answer(s)", hideHistory: "Hide earlier messages", aiTried: "Saathi tried {n}× — show its answers", solved: "Mark solved",
  },
  hi: {
    understood: "समझ गया!", confused: "अभी भी उलझन", askTeacher: "शिक्षक से पूछें", typing: "साथी सोच रहा है…",
    placeholder: "आगे पूछें…", reply: "छात्र को जवाब दें…", tryN: "प्रयास {a} / {b}", check: "छोटी जाँच",
    reveal: "उत्तर देखें", escalated: "शिक्षक के पास", answered: "शिक्षक ने जवाब दिया", resolved: "हल हुआ", open: "साथी मदद कर रहा है",
    notes: "नोट्स", video: "वीडियो", live: "लाइव क्लास", text: "टेक्स्ट", sendNotes: "नोट्स भेजें", sendVideo: "वीडियो भेजें", schedule: "तय करें",
    attach: "फ़ाइल जोड़ें (PDF, चित्र, डॉक)", chooseVideo: "रिकॉर्ड किया वीडियो चुनें", when: "कब", join: "लाइव क्लास में जुड़ें",
    expires: "{d} तक उपलब्ध", expired: "यह रिकॉर्डिंग जगह बचाने के लिए हटा दी गई।", download: "फ़ाइल खोलें",
    agents: "साथी ने कैसे जवाब दिया", note: "संदेश (वैकल्पिक)",
    earlier: "{n} पिछले जवाब देखें", hideHistory: "पिछले संदेश छिपाएँ", aiTried: "साथी ने {n} बार कोशिश की — जवाब देखें", solved: "हल हुआ",
  },
};
type Lx = (typeof L)["en"];

export const STATUS_TONE: Record<string, string> = {
  open: "bg-sky-50 text-sky-700", escalated: "bg-marigold-50 text-marigold-600", answered: "bg-sage-100 text-sage", resolved: "bg-paper-2 text-ink-3",
};

/** The doubt bot's face: the VidyaSaathi mark in a soft glowing bubble. */
export function SaathiBadge({ size = 32, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-50 to-marigold-50 ring-1 ring-sky-200" style={{ width: size, height: size }}>
      {thinking && <span className="absolute inset-0 animate-ping rounded-full bg-sky-300/40" />}
      <PlaneMark size={size * 0.8} />
    </span>
  );
}

export function useThread(id: string | null, initial?: DoubtThread | null) {
  return useQuery({
    queryKey: ["doubt", id],
    queryFn: () => api.doubt(id!),
    enabled: !!id,
    initialData: initial?.id === id && initial ? initial : undefined,
    refetchInterval: 4000, // live chat
  });
}

export function DoubtConversation({ thread, onUpdate, compact = false, teacherView = false }: { thread: DoubtThread; onUpdate: (t: DoubtThread) => void; compact?: boolean; teacherView?: boolean }) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const lx = L[lang === "hi" ? "hi" : "en"];
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const isStudent = user?.id === thread.student?.id;
  const all = thread.messages ?? [];
  const [history, setHistory] = useState(false);
  // Long doubts stay short: earlier Saathi attempts (and the "still confused" taps between
  // them) fold away behind one toggle. A teacher sees the question and the human exchange first.
  const lastAi = all.map((m) => m.role).lastIndexOf("ai");
  const foldable = (m: DoubtMessage, i: number) => (m.role === "ai" && (teacherView || i !== lastAi)) || !!m.meta.confused;
  const folded = all.filter((m, i) => foldable(m, i));
  const msgs = history ? all : all.filter((m, i) => !foldable(m, i));
  const aiTries = all.filter((m) => m.role === "ai").length;
  // Scroll only the conversation box — scrollIntoView would also scroll the page and make it jump.
  useEffect(() => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [msgs.length, busy]);

  const run = async (fn: () => Promise<DoubtThread>) => {
    setBusy(true);
    try {
      const t = await fn();
      onUpdate(t);
      qc.setQueryData(["doubt", t.id], t);
      qc.invalidateQueries({ queryKey: ["doubts"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const latestAi = [...all].reverse().find((m) => m.role === "ai");
  const studentActions = isStudent && thread.kind === "doubt" && thread.status !== "resolved";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={box} className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-3", compact ? "max-h-[46vh]" : "max-h-[58vh]")}>
        {folded.length > 0 && (
          <button onClick={() => setHistory((v) => !v)}
            className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:border-sky-400">
            <Sparkles className="h-3 w-3" />
            {history ? lx.hideHistory : teacherView ? lx.aiTried.replace("{n}", String(aiTries)) : lx.earlier.replace("{n}", String(folded.filter((m) => m.role === "ai").length))}
          </button>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.sender_id === user?.id} thread={thread} lx={lx} />)}
        <AnimatePresence>
          {busy && thread.kind === "doubt" && !thread.teacher && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-ink-3">
              <SaathiBadge size={28} thinking /><span>{lx.typing}</span>
              <span className="inline-flex gap-0.5">{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {studentActions && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <button disabled={busy} onClick={() => run(() => api.doubtUnderstood(thread.id))}
            className="inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-sm font-medium text-sage hover:bg-sage hover:text-white"><ThumbsUp className="h-3.5 w-3.5" />{lx.understood}</button>
          {!thread.teacher && <button disabled={busy} onClick={() => run(() => api.doubtConfused(thread.id, lang))}
            className="inline-flex items-center gap-1.5 rounded-full bg-marigold-50 px-3 py-1.5 text-sm font-medium text-marigold-600 hover:bg-marigold-100"><HelpCircle className="h-3.5 w-3.5" />{lx.confused}</button>}
          {!thread.teacher && (
            <button disabled={busy} onClick={() => run(() => api.doubtEscalate(thread.id))}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink-2 hover:border-sky-300 hover:text-ink"><Hand className="h-3.5 w-3.5" />{lx.askTeacher}</button>
          )}
          {!thread.teacher && latestAi?.meta.attempt != null && (
            <span className="ml-auto self-center text-xs text-ink-3">{lx.tryN.replace("{a}", String(latestAi.meta.attempt)).replace("{b}", String(thread.max_ai_tries))}</span>
          )}
        </div>
      )}
      {isStudent ? <Composer lx={lx} busy={busy} placeholder={lx.placeholder} onSend={(b) => run(() => api.doubtMessage(thread.id, b, lang))} />
        : <TeacherTools thread={thread} busy={busy} run={run} />}
    </div>
  );
}

function Bubble({ m, mine, thread, lx }: { m: DoubtMessage; mine: boolean; thread: DoubtThread; lx: Lx }) {
  const { lang } = useI18n();
  const [showTrace, setShowTrace] = useState(false);
  const [reveal, setReveal] = useState(false);
  if (m.role === "system") {
    return <p className="mx-auto w-fit max-w-[90%] rounded-full bg-paper-2 px-3 py-1 text-center text-xs text-ink-2">{m.body}</p>;
  }
  const who = m.role === "ai" ? null : m.role === "student" ? thread.student : thread.teacher;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      {m.role === "ai" ? <SaathiBadge size={30} /> : <Avatar user={who} size={30} />}
      <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        mine ? "rounded-br-md bg-sky-600 text-white" : m.role === "ai" ? "rounded-bl-md border border-sky-100 bg-surface shadow-[var(--shadow-soft)]" : "rounded-bl-md bg-paper-2 text-ink")}>
        {m.kind !== "text" && (
          <p className={cn("mb-1 flex items-center gap-1.5 text-xs font-semibold", mine ? "text-white/80" : "text-sky-700")}>
            {m.kind === "notes" ? <FileText className="h-3.5 w-3.5" /> : m.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
            {m.kind === "notes" ? lx.notes : m.kind === "video" ? lx.video : lx.live}
          </p>
        )}
        {m.body && <RichText text={m.body} />}
        {m.kind === "video" && (m.expired || !m.has_attachment
          ? <p className="mt-1 text-xs italic opacity-80">{lx.expired}</p>
          : <>
            <video src={api.doubtMediaUrl(m.id)} controls className="mt-2 w-full max-w-sm rounded-xl bg-black" preload="metadata" />
            {m.expires_at && <p className="mt-1 text-[0.7rem] opacity-70">{lx.expires.replace("{d}", new Date(m.expires_at).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" }))}</p>}
          </>)}
        {m.kind === "notes" && m.has_attachment && (
          <a href={api.doubtMediaUrl(m.id)} target="_blank" rel="noreferrer" className={cn("mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium", mine ? "bg-white/15" : "bg-sky-50 text-sky-700")}>
            <Paperclip className="h-3.5 w-3.5" />{m.attachment_name || lx.download}
          </a>
        )}
        {m.kind === "live" && m.scheduled_at && (
          <div className="mt-1.5 rounded-xl bg-white/90 p-2.5 text-ink">
            <p className="text-sm font-semibold">{new Date(m.scheduled_at).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            <p className="text-xs text-ink-3">{m.meta.duration_min ?? 30} min</p>
            {m.meeting_url && <a href={m.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"><Video className="h-3.5 w-3.5" />{lx.join}</a>}
          </div>
        )}
        {m.role === "ai" && m.meta.check && (
          <div className="mt-2.5 rounded-xl bg-marigold-50 p-2.5 text-ink">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-marigold-600">{lx.check}</p>
            <p className="text-sm">{m.meta.check}</p>
            {m.meta.check_answer && (reveal ? <p className="mt-1 text-xs text-sage">✓ {m.meta.check_answer}</p>
              : <button onClick={() => setReveal(true)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-700"><Eye className="h-3 w-3" />{lx.reveal}</button>)}
          </div>
        )}
        {m.role === "ai" && m.meta.trace && (
          <div className="mt-2">
            <button onClick={() => setShowTrace((v) => !v)} className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-ink-3 hover:text-sky-700"><Sparkles className="h-3 w-3" />{lx.agents}</button>
            <AnimatePresence>
              {showTrace && (
                <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-1.5 space-y-1 overflow-hidden">
                  {m.meta.trace.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[0.72rem] text-ink-2">
                      <span className="rounded-md bg-sky-50 px-1.5 font-semibold text-sky-700">{s.agent}</span><span>{s.did}</span>
                    </li>
                  ))}
                </motion.ol>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { RichText };

function Composer({ lx, busy, placeholder, onSend }: { lx: Lx; busy: boolean; placeholder: string; onSend: (b: string) => void }) {
  const [v, setV] = useState("");
  const send = () => { if (v.trim() && !busy) { onSend(v.trim()); setV(""); } };
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-center gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-11" maxLength={4000} />
      <button type="submit" disabled={busy || !v.trim()} aria-label="send" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white transition-colors hover:bg-sky-700 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
      <span className="sr-only">{lx.placeholder}</span>
    </form>
  );
}

type Mode = "text" | "notes" | "video" | "live";

export function TeacherTools({ thread, busy, run }: { thread: DoubtThread; busy: boolean; run: (fn: () => Promise<DoubtThread>) => Promise<void> }) {
  const { lang } = useI18n();
  const lx = L[lang === "hi" ? "hi" : "en"];
  const [mode, setMode] = useState<Mode>("text");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const reset = () => { setNote(""); setFile(null); };
  const solved = thread.status === "resolved";
  const modes: Array<{ id: Mode; icon: React.ReactNode; label: string }> = [
    { id: "text", icon: <Send className="h-3.5 w-3.5" />, label: lx.text },
    { id: "notes", icon: <FileText className="h-3.5 w-3.5" />, label: lx.notes },
    { id: "video", icon: <Video className="h-3.5 w-3.5" />, label: lx.video },
    { id: "live", icon: <CalendarClock className="h-3.5 w-3.5" />, label: lx.live },
  ];
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-2 flex flex-wrap gap-1">
        {modes.map((m) => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)}
            className={cn("inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium", mode === m.id ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2")}>{m.icon}{m.label}</button>
        ))}
        {thread.kind === "doubt" && !solved && (
          <button type="button" disabled={busy} onClick={() => void run(() => api.doubtUnderstood(thread.id))}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage hover:bg-sage hover:text-white"><CheckCircle2 className="h-3.5 w-3.5" />{lx.solved}</button>
        )}
      </div>
      {mode === "text" && <Composer lx={lx} busy={busy} placeholder={lx.reply} onSend={(b) => run(() => api.doubtMessage(thread.id, b))} />}
      {mode !== "text" && (
        <form className="space-y-2" onSubmit={(e) => {
          e.preventDefault();
          if (mode === "notes") void run(() => api.doubtNotes(thread.id, note, file)).then(reset);
          if (mode === "video" && file) void run(() => api.doubtVideo(thread.id, note, file)).then(reset);
          if (mode === "live") void run(() => api.doubtLive(thread.id, new Date(when).toISOString(), note)).then(reset);
        }}>
          {mode === "live" && (
            <label className="block text-xs font-medium text-ink-2">{lx.when}
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 h-11" />
            </label>
          )}
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "notes" ? lx.reply : lx.note} className="min-h-20" />
          {mode !== "live" && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line-2 px-3 py-2.5 text-sm text-ink-2 hover:border-sky-300">
              <Paperclip className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{file ? file.name : mode === "video" ? lx.chooseVideo : lx.attach}</span>
              {file && <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }}><X className="h-4 w-4" /></button>}
              <input type="file" className="hidden" accept={mode === "video" ? "video/*" : ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx,.pptx"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
          <button type="submit" disabled={busy || (mode === "video" && !file) || (mode === "notes" && !note.trim() && !file)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {mode === "notes" ? lx.sendNotes : mode === "video" ? lx.sendVideo : lx.schedule}
          </button>
        </form>
      )}
    </div>
  );
}

export function statusLabel(s: string, lang: string) {
  const lx = L[lang === "hi" ? "hi" : "en"];
  return ({ open: lx.open, escalated: lx.escalated, answered: lx.answered, resolved: lx.resolved } as Record<string, string>)[s] ?? s;
}
