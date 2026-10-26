"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, ChevronDown, Inbox, Loader2, MessageCircle, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { DoubtThread } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { Avatar } from "@/components/brand/avatar";
import { Card, Skeleton } from "@/components/ui/primitives";
import { DoubtConversation, SaathiBadge, STATUS_TONE, statusLabel, useThread } from "./doubt-chat";
import { relativeDays } from "@/lib/lesson";
import { cn } from "@/lib/utils";

type Filter = "active" | "open" | "escalated" | "answered" | "resolved" | "chats";
const PAGE = 20;

const L = {
  en: { active: "Active", open: "With Saathi", escalated: "With teacher", answered: "Teacher replied", resolved: "Solved", chats: "Chats",
    pick: "Pick a conversation", teachers: "Message a teacher", more: "Load more",
    empty: "Nothing here. Ask a doubt during any video lesson — Saathi answers, and your teacher steps in if you're still stuck." },
  hi: { active: "चालू", open: "साथी के पास", escalated: "शिक्षक के पास", answered: "शिक्षक ने जवाब दिया", resolved: "हल हुए", chats: "चैट",
    pick: "कोई बातचीत चुनें", teachers: "शिक्षक को संदेश भेजें", more: "और दिखाएँ",
    empty: "यहाँ कुछ नहीं। किसी भी वीडियो पाठ में डाउट पूछें — साथी जवाब देगा, और ज़रूरत हो तो शिक्षक मदद करेंगे।" },
};

const STATUS: Record<Filter, string | undefined> = {
  active: "open,escalated,answered", open: "open", escalated: "escalated", answered: "answered", resolved: "resolved", chats: undefined,
};

/** The student's doubts and teacher chats: counts by stage, filters, paging. */
export function DoubtInbox() {
  const { lang } = useI18n();
  const lx = L[lang === "hi" ? "hi" : "en"];
  const [filter, setFilter] = useState<Filter>("active");
  const [selected, setSelected] = useState<string | null>(null);
  const stats = useQuery({ queryKey: ["doubt-stats"], queryFn: api.doubtStats, refetchInterval: 15000 });
  const params = { kind: filter === "chats" ? "chat" : "doubt", status: STATUS[filter], limit: PAGE };
  const list = useInfiniteQuery({
    queryKey: ["doubts", params],
    queryFn: ({ pageParam }) => api.doubts({ ...params, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.limit < last.total ? last.offset + last.limit : undefined),
    refetchInterval: 10000,
  });
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.threads) ?? [], [list.data]);
  const thread = useThread(selected);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("thread");
    if (id) setSelected(id);
    const withId = p.get("with");
    if (withId) api.openChat(withId).then((t) => { setSelected(t.id); setFilter("chats"); }).catch((e) => toast.error(e.message));
  }, []);

  const s = stats.data;
  const count: Partial<Record<Filter, number>> = s ? {
    active: s.with_ai + s.open + s.in_progress, open: s.with_ai, escalated: s.open, answered: s.in_progress, resolved: s.completed,
  } : {};

  return (
    <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className={cn("space-y-3", selected && "max-lg:hidden")}>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {(Object.keys(STATUS) as Filter[]).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", filter === k ? "border-sky-400 bg-sky-50 text-sky-700" : "border-line bg-surface text-ink-2")}>
              {lx[k]}{count[k] != null && <span className="rounded-full bg-surface px-1.5 text-[0.65rem] text-ink-3">{count[k]}</span>}
            </button>
          ))}
        </div>
        <TeacherQuickChat onOpen={(t) => { setSelected(t.id); setFilter("chats"); }} label={lx.teachers} />
        <div className="space-y-2 lg:max-h-[64vh] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          {list.isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          {!list.isLoading && rows.length === 0 && <Card className="flex flex-col items-center gap-2 p-6 text-center text-sm text-ink-3"><Inbox className="h-6 w-6" />{lx.empty}</Card>}
          {rows.map((t) => <Row key={t.id} t={t} active={t.id === selected} onClick={() => setSelected(t.id)} />)}
          {list.hasNextPage && (
            <button onClick={() => void list.fetchNextPage()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-2 text-sm font-medium text-sky-700">
              {list.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}{lx.more}
            </button>
          )}
        </div>
      </div>

      <Card className={cn("flex min-h-[60vh] flex-col p-4 sm:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-hidden", !selected && "max-lg:hidden")}>
        {thread.data ? (
          <>
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-xl border border-line lg:hidden" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
              {thread.data.kind === "doubt" && !thread.data.teacher ? <SaathiBadge size={36} /> : <Avatar user={thread.data.teacher} size={36} />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{thread.data.kind === "chat" ? thread.data.teacher?.full_name : thread.data.question || thread.data.topic || "Doubt"}</p>
                <p className="truncate text-xs text-ink-3">{[thread.data.subject, thread.data.chapter, thread.data.kind === "doubt" && thread.data.teacher ? thread.data.teacher.full_name : null].filter(Boolean).join(" · ")}</p>
              </div>
              {thread.data.kind === "doubt" && <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-semibold", STATUS_TONE[thread.data.status])}>{statusLabel(thread.data.status, lang)}</span>}
            </div>
            <DoubtConversation thread={thread.data} onUpdate={() => { void list.refetch(); void stats.refetch(); }} />
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center text-ink-3"><div><MessageCircleQuestion className="mx-auto h-10 w-10" /><p className="mt-2 text-sm">{lx.pick}</p></div></div>
        )}
      </Card>
    </div>
  );
}

function Row({ t, active, onClick }: { t: DoubtThread; active: boolean; onClick: () => void }) {
  const { lang } = useI18n();
  return (
    <motion.button layout onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors", active ? "border-sky-400 bg-sky-50" : "border-line bg-surface hover:border-sky-300")}>
      {t.kind === "doubt" && !t.teacher ? <SaathiBadge size={34} /> : <Avatar user={t.teacher} size={34} />}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{t.kind === "chat" ? t.teacher?.full_name : t.question || t.topic || "Doubt"}</span>
          {t.kind === "doubt" && <span className={cn("ml-auto shrink-0 rounded-full px-1.5 text-[0.62rem] font-semibold", STATUS_TONE[t.status])}>{statusLabel(t.status, lang)}</span>}
        </span>
        <span className="block truncate text-xs text-ink-3">{t.kind === "doubt" ? [t.subject, t.chapter].filter(Boolean).join(" · ") : t.last?.body}</span>
        <span className="block text-[0.68rem] text-ink-3">{relativeDays(t.updated_at, lang)}</span>
      </span>
    </motion.button>
  );
}

function TeacherQuickChat({ onOpen, label }: { onOpen: (t: DoubtThread) => void; label: string }) {
  const q = useQuery({ queryKey: ["my-teachers"], queryFn: api.myTeachers });
  const people = new Map<string, { id: string; full_name: string; initials: string; avatar_color: string; role: string }>();
  if (q.data?.mentor) people.set(q.data.mentor.id, { ...q.data.mentor, role: "Class teacher" });
  q.data?.subjects.forEach((s) => s.teacher && !people.has(s.teacher.id) && people.set(s.teacher.id, { ...s.teacher, role: s.subject }));
  if (!people.size) return null;
  return (
    <details className="rounded-2xl border border-line bg-surface p-3">
      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink-2"><MessageCircle className="h-3.5 w-3.5" />{label} ({people.size})</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {[...people.values()].map((p) => (
          <button key={p.id} onClick={() => api.openChat(p.id).then(onOpen).catch((e) => toast.error(e.message))}
            className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-3 text-xs hover:border-sky-300" title={p.role}>
            <Avatar user={p} size={22} />{p.full_name}
          </button>
        ))}
      </div>
    </details>
  );
}
