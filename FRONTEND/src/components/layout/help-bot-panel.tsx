"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eraser, Send, X } from "lucide-react";
import { api } from "@/core/api";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { RichText } from "@/components/ui/rich-text";
import { Peacock } from "@/components/brand/peacock";
import { cn, EASE } from "@/lib/utils";

type Msg = { from: "bot" | "me"; text: string; link?: string | null; label?: string | null; at: number };
const STORE = "vidyasaathi.mor";

/** Quick-action cards by role: [emoji, label en, label hi, message to send]. */
const CARDS: Record<string, Array<[string, string, string, string]>> = {
  guest: [["🎓", "What is this?", "यह क्या है?", "What is VidyaSaathi?"], ["✍️", "Sign up", "साइन अप", "How do I sign up?"], ["👩‍🏫", "I'm a teacher", "मैं शिक्षक हूँ", "teacher login"], ["😄", "A joke!", "चुटकुला!", "tell me a joke"]],
  student: [["❓", "Ask a doubt", "डाउट पूछें", "How do I ask a doubt?"], ["🗺️", "My path", "मेरा रास्ता", "Where is my learning path?"], ["🎮", "Games", "गेम", "Where are my games?"], ["🏆", "Tests", "टेस्ट", "How do tests work?"]],
  teacher: [["📝", "Make a test", "टेस्ट बनाएँ", "How do I create a test?"], ["💬", "Doubts", "डाउट", "Reply to a doubt"], ["📈", "Who needs help", "किसे मदद चाहिए", "See my students' progress"], ["⚙️", "My classes", "मेरी कक्षाएँ", "Set what I teach"]],
  admin: [["🏫", "Teachers", "शिक्षक", "Assign a class teacher"], ["📊", "Stats", "आँकड़े", "Where are system stats?"], ["🔔", "Alerts", "सूचनाएँ", "notifications"], ["😄", "A joke!", "चुटकुला!", "tell me a joke"]],
};

/** Mor's chat panel — its own chunk, loaded the first time someone opens Mor. */
export function HelpPanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { lang } = useI18n();
  const hi = lang === "hi";
  const role = user?.role ?? "guest";
  const open = true;
  const setOpen = (v: boolean) => { if (!v) onClose(); };
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [openedAt] = useState(() => Date.now());

  // Keep the conversation for this browser session.
  useEffect(() => { try { const s = sessionStorage.getItem(STORE); if (s) setMsgs(JSON.parse(s)); } catch { /* storage blocked */ } }, []);
  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-40))); } catch { /* storage blocked */ } }, [msgs]);
  useEffect(() => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => { const t = setTimeout(() => input.current?.focus(), 250); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const name = user?.full_name?.split(" ")[0];
  const greet: Msg = { from: "bot", at: openedAt, text: hi
    ? `नमस्ते${name ? ` ${name}` : ""}! 🙏 मैं **मोर** हूँ, विद्यासाथी का गाइड। नीचे कोई कार्ड चुनिए या कुछ भी पूछिए! 🦚`
    : `Namaste${name ? ` ${name}` : ""}! 🙏 I'm **Mor**, VidyaSaathi's guide. Tap a card below or ask me anything! 🦚` };
  const shown = msgs.length ? msgs : [greet];

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...(m.length ? m : [greet]), { from: "me", text, at: Date.now() }]);
    setV("");
    setBusy(true);
    try {
      const r = await api.helpChat(text, lang, pathname ?? undefined);
      await new Promise((ok) => setTimeout(ok, 350)); // a beat of "typing" feels more natural
      setMsgs((m) => [...m, { from: "bot", text: r.reply, link: r.link, label: r.label, at: Date.now() }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", at: Date.now(), text: hi ? "उफ़! मेरे पंख उलझ गए — सर्वर तक नहीं पहुँच पाया। 🦚" : "Oops, my feathers got tangled — I couldn't reach the server. 🦚" }]);
    } finally { setBusy(false); }
  };
  const cards = CARDS[role] ?? CARDS.guest;
  const time = (at: number) => new Date(at).toLocaleTimeString(hi ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" });

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="scrim" className="fixed inset-0 z-50 bg-ink/20 sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.section key="panel" role="dialog" aria-label="Mor"
              initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }} transition={{ duration: 0.28, ease: EASE }}
              className={cn("fixed z-50 flex flex-col overflow-hidden border border-line bg-surface shadow-[var(--shadow-lift)]",
                "inset-x-0 bottom-0 h-[85dvh] rounded-t-[28px]",
                "sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(600px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-[26px] sm:origin-bottom-right")}>
              <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-sky-600 to-[#2a8a7a] px-4 py-3 text-white">
                <span className="mx-auto mb-1 block h-1 w-10 rounded-full bg-white/40 sm:hidden absolute left-1/2 top-1.5 -translate-x-1/2" />
                <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}><Peacock size={38} /></motion.span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-tight">{hi ? "मोर · आपका गाइड" : "Mor · your guide"}</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-[#9be7a0]" />{hi ? "ऑनलाइन · थोड़ा नखरीला" : "Online · slightly dramatic"}</p>
                </div>
                {msgs.length > 0 && <button onClick={() => setMsgs([])} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white/15" aria-label="clear" title={hi ? "चैट साफ़ करें" : "Clear chat"}><Eraser className="h-4 w-4" /></button>}
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white/15" aria-label="close"><X className="h-4 w-4" /></button>
                <svg className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 opacity-15" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#fff" /></svg>
              </div>

              <div ref={box} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-paper/60 p-4">
                {shown.map((m, i) => (
                  <motion.div key={`${m.at}-${i}`} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22 }}
                    className={cn("flex items-end gap-2", m.from === "me" && "flex-row-reverse")}>
                    {m.from === "bot" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-600 to-[#2a8a7a]"><Peacock size={20} /></span>}
                    <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)]", m.from === "me" ? "rounded-br-md bg-sky-600 text-white" : "rounded-bl-md bg-surface text-ink")}>
                      <RichText text={m.text} />
                      {m.link && (
                        <Link href={m.link} onClick={() => setOpen(false)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                          {m.label || (hi ? "वहाँ चलें" : "Take me there")}<ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                      <p className={cn("mt-1 text-[0.62rem]", m.from === "me" ? "text-white/70" : "text-ink-3")}>{time(m.at)}</p>
                    </div>
                  </motion.div>
                ))}
                {busy && (
                  <div className="flex items-end gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-sky-600 to-[#2a8a7a]"><Peacock size={20} /></span>
                    <span className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 shadow-[var(--shadow-soft)]">
                      {[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
                    </span>
                  </div>
                )}
                {msgs.length === 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {cards.map(([emoji, en, h, send], i) => (
                      <motion.button key={en} onClick={() => void ask(send)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-3 text-left text-sm font-medium text-ink shadow-[var(--shadow-soft)] hover:border-sky-300">
                        <span className="text-xl leading-none">{emoji}</span>{hi ? h : en}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {msgs.length > 0 && (
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line bg-surface px-3 pt-2">
                  {cards.map(([emoji, en, h, send]) => (
                    <button key={en} onClick={() => void ask(send)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-sky-300 hover:text-ink">{emoji} {hi ? h : en}</button>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); void ask(v); }} className="flex gap-2 bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <input ref={input} value={v} onChange={(e) => setV(e.target.value)} maxLength={600} placeholder={hi ? "मोर से पूछिए…" : "Ask Mor anything…"}
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-line-2 bg-paper px-3.5 text-sm outline-none transition-colors focus:border-sky-500 focus:bg-surface" />
                <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={busy || !v.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white disabled:opacity-50" aria-label="send"><Send className="h-4 w-4" /></motion.button>
              </form>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

