"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Bell, CalendarClock, CheckCheck, ClipboardList, Hand, MessageCircle, Sparkles, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { AppNotification } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { relativeDays } from "@/lib/lesson";
import { cn, EASE } from "@/lib/utils";

const ICON: Record<string, React.ReactNode> = {
  doubt: <Hand className="h-4 w-4" />, reply: <MessageCircle className="h-4 w-4" />, chat: <MessageCircle className="h-4 w-4" />,
  live: <CalendarClock className="h-4 w-4" />, test: <ClipboardList className="h-4 w-4" />, assignment: <UserPlus className="h-4 w-4" />,
  resolved: <Sparkles className="h-4 w-4" />,
};
const TONE: Record<string, string> = {
  doubt: "bg-marigold-50 text-marigold-600", live: "bg-rose-100 text-rose", test: "bg-sky-50 text-sky-700", resolved: "bg-sage-100 text-sage",
};
const PANEL_W = 360;
const TOASTED = "vidyasaathi.toasted";

/**
 * The bell: every important event for students, teachers and admins, polled
 * every 20 s. The panel renders in a portal on <body>, positioned from the
 * bell, so no sidebar, sticky bar or card can ever clip or cover it.
 */
export function NotificationBell({ className }: { className?: string; align?: "left" | "right" }) {
  const { t, lang } = useI18n();
  const hi = lang === "hi";
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const q = useQuery({ queryKey: ["notifications"], queryFn: api.notifications, refetchInterval: 20000 });
  const items = q.data?.items ?? [];
  const unread = q.data?.unread ?? 0;

  // Only genuinely new events pop up as toasts, and each one only once per session —
  // never a backlog on page load, never the same toast on every navigation.
  useEffect(() => {
    if (!q.data) return;
    let shown: string[] = [];
    try { shown = JSON.parse(sessionStorage.getItem(TOASTED) || "[]"); } catch { /* storage blocked */ }
    const known = new Set([...shown, ...(seen.current ?? [])]);
    if (seen.current) {
      const fresh = Date.now() - 90_000;
      items.filter((n) => !n.read && !known.has(n.id) && new Date(n.created_at).getTime() > fresh)
        .slice(0, 3).forEach((n) => toast(n.title, { description: n.body }));
    }
    seen.current = new Set(items.map((n) => n.id));
    try { sessionStorage.setItem(TOASTED, JSON.stringify([...new Set([...shown, ...items.map((n) => n.id)])].slice(-200))); } catch { /* storage blocked */ }
  }, [items, q.data]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const vw = window.innerWidth;
      const width = Math.min(PANEL_W, vw - 16);
      const left = Math.max(8, Math.min(r.left, vw - width - 8));
      setPos({ top: r.bottom + 8, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (!panel.current?.contains(tgt) && !btn.current?.contains(tgt)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const go = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) { await api.markRead([n.id]).catch(() => {}); refresh(); }
    if (n.link) router.push(n.link);
  };
  // Optimistic remove, so the list reacts instantly.
  const remove = async (id: string) => {
    qc.setQueryData<{ unread: number; items: AppNotification[] }>(["notifications"], (d) => d && ({
      unread: d.unread - (d.items.find((x) => x.id === id && !x.read) ? 1 : 0), items: d.items.filter((x) => x.id !== id),
    }));
    await api.removeNotification(id).catch(() => {});
    refresh();
  };
  const readAll = async () => { await api.markRead().catch(() => {}); refresh(); };
  const clear = async (readOnly: boolean) => { await api.clearNotifications(readOnly).catch(() => {}); refresh(); };

  return (
    <div className={cn("relative", className)}>
      <button ref={btn} onClick={() => setOpen((v) => !v)} aria-label={t("notif.title")} title={t("notif.title")} aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink-2 hover:text-ink">
        <motion.span animate={unread ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.8, repeat: unread ? Infinity : 0, repeatDelay: 6 }}>
          <Bell className="h-4 w-4" />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[0.65rem] font-bold text-white ring-2 ring-paper">
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div ref={panel} role="dialog" aria-label={t("notif.title")}
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.2, ease: EASE }}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              className="fixed z-[90] flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lift)]">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <p className="flex-1 font-semibold text-ink">{t("notif.title")}</p>
                {unread > 0 && <button onClick={readAll} title={t("notif.markAll")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"><CheckCheck className="h-3.5 w-3.5" />{t("notif.markAll")}</button>}
                {items.length > 0 && (
                  <button onClick={() => void clear(unread > 0)} title={unread > 0 ? (hi ? "पढ़े हुए हटाएँ" : "Clear read") : (hi ? "सब हटाएँ" : "Clear all")}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-3 hover:bg-rose-100 hover:text-rose">
                    <Trash2 className="h-3.5 w-3.5" />{unread > 0 ? (hi ? "पढ़े हटाएँ" : "Clear read") : (hi ? "सब हटाएँ" : "Clear all")}
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {items.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-3">{t("notif.empty")}</p>}
                <AnimatePresence initial={false}>
                  {items.map((n) => (
                    <motion.div key={n.id} layout exit={{ opacity: 0, x: 40, height: 0 }} transition={{ duration: 0.2 }}
                      className={cn("group flex items-start gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-paper", !n.read && "bg-sky-50/50")}>
                      <button onClick={() => void go(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                        <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", TONE[n.kind] ?? "bg-paper-2 text-ink-2")}>{ICON[n.kind] ?? <Bell className="h-4 w-4" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">{!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />}<span className="truncate">{n.title}</span></span>
                          {n.body && <span className="line-clamp-2 block text-xs text-ink-2">{n.body}</span>}
                          <span className="block text-[0.68rem] text-ink-3">{relativeDays(n.created_at, lang)}</span>
                        </span>
                      </button>
                      <button onClick={() => void remove(n.id)} aria-label={hi ? "हटाएँ" : "Remove"} title={hi ? "हटाएँ" : "Remove"}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 opacity-60 hover:bg-rose-100 hover:text-rose hover:opacity-100 group-hover:opacity-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
