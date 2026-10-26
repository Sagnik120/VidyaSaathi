"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, CalendarClock, CheckCircle2, ChevronDown, Clock, Filter, Hourglass, Inbox, Layers, Loader2, MessageCircleQuestion, Search, Send, Sparkles, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { DoubtQuery, DoubtThread, Facet } from "@/core/types";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { Avatar } from "@/components/brand/avatar";
import { Card, Input, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { DoubtConversation, useThread } from "./doubt-chat";
import { useHideFabs } from "@/lib/fab";
import { cn, EASE } from "@/lib/utils";

type Stage = "escalated" | "answered" | "resolved" | "all";
type Group = "none" | "student" | "topic" | "class";
const PAGE = 30;

const L = {
  en: {
    open: "Open", openSub: "need your reply", progress: "In progress", progressSub: "you replied", done: "Completed", doneSub: "solved",
    ai: "With Saathi", aiSub: "AI still helping", oldest: "Oldest waiting", all: "All", search: "Search question, topic or student…",
    klass: "All classes", subject: "All subjects", chapter: "All chapters", topic: "All topics", student: "All students",
    sortOld: "Longest waiting first", sortNew: "Newest activity first", group: "Group", none: "List", byStudent: "Student", byTopic: "Topic", byClass: "Class",
    empty: "No doubts match these filters.", emptyAll: "No doubts yet — when the AI can't clear one, it lands here.", more: "Load more", of: "of",
    selected: "{n} selected", replyAll: "Reply to all", liveAll: "One live class for all", clear: "Clear", send: "Send to {n}",
    schedule: "Schedule for {n}", sent: "Sent to {n} students", pick: "Pick a doubt to answer it", question: "The question", reset: "Reset filters",
    selectGroup: "Select all", waiting: "waiting {t}", aiTries: "AI tried {n}×", nothingWaiting: "Nothing waiting for you right now 🎉",
  },
  hi: {
    open: "खुले", openSub: "आपके जवाब का इंतज़ार", progress: "जारी", progressSub: "आपने जवाब दिया", done: "पूरे", doneSub: "हल हुए",
    ai: "साथी के पास", aiSub: "AI मदद कर रहा है", oldest: "सबसे पुराना", all: "सभी", search: "प्रश्न, टॉपिक या छात्र खोजें…",
    klass: "सभी कक्षाएँ", subject: "सभी विषय", chapter: "सभी अध्याय", topic: "सभी टॉपिक", student: "सभी छात्र",
    sortOld: "सबसे ज़्यादा इंतज़ार पहले", sortNew: "नया पहले", group: "समूह", none: "सूची", byStudent: "छात्र", byTopic: "टॉपिक", byClass: "कक्षा",
    empty: "इन फ़िल्टर से कोई डाउट नहीं मिला।", emptyAll: "अभी कोई डाउट नहीं — AI जिसे हल न कर पाए, वह यहाँ आएगा।", more: "और दिखाएँ", of: "में से",
    selected: "{n} चुने", replyAll: "सबको जवाब", liveAll: "सबके लिए एक लाइव क्लास", clear: "हटाएँ", send: "{n} को भेजें",
    schedule: "{n} के लिए तय करें", sent: "{n} छात्रों को भेजा", pick: "जवाब देने के लिए कोई डाउट चुनें", question: "प्रश्न", reset: "फ़िल्टर हटाएँ",
    selectGroup: "सभी चुनें", waiting: "{t} से इंतज़ार", aiTries: "AI ने {n}× कोशिश की", nothingWaiting: "अभी आपके लिए कुछ बाकी नहीं 🎉",
  },
};
type Lx = (typeof L)["en"];

/** A clock that ticks once a minute, so "waiting 3h" stays honest without re-rendering every frame. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  return now;
}

function since(iso: string | null, hi: boolean, now: number) {
  if (!iso) return "";
  const h = (now - new Date(iso).getTime()) / 3.6e6;
  if (h < 1) return hi ? `${Math.max(1, Math.round(h * 60))} मिनट` : `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return hi ? `${Math.round(h)} घंटे` : `${Math.round(h)}h`;
  return hi ? `${Math.round(h / 24)} दिन` : `${Math.round(h / 24)}d`;
}

/**
 * The teacher's doubt manager — built for a full inbox: counts by stage, filters
 * by class / subject / chapter / topic / student, grouping, paging, and one reply
 * (or one live class) for everyone stuck on the same thing.
 */
export function DoubtManager() {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const lx = L[hi ? "hi" : "en"];
  const { user } = useAuth();
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>("escalated");
  const [f, setF] = useState<DoubtQuery>({ sort: "oldest" });
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<Group>("none");
  const [selected, setSelected] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { const id = new URLSearchParams(window.location.search).get("thread"); if (id) setSelected(id); }, []);
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q: search.trim() || undefined })), 300); return () => clearTimeout(t); }, [search]);

  const stats = useQuery({ queryKey: ["doubt-stats"], queryFn: api.doubtStats, refetchInterval: 15000 });
  const query: DoubtQuery = { ...f, kind: "doubt", status: stage === "all" ? undefined : stage, limit: PAGE };
  const list = useInfiniteQuery({
    queryKey: ["doubt-list", query],
    queryFn: ({ pageParam }) => api.doubts({ ...query, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.offset + last.limit < last.total ? last.offset + last.limit : undefined),
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.threads) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;
  const thread = useThread(selected);
  const s = stats.data;
  const filtered = !!(f.grade || f.subject || f.chapter || f.topic || f.student_id || f.q);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["doubt-list"] });
    qc.invalidateQueries({ queryKey: ["doubt-stats"] });
  };

  const tiles: Array<{ k: Stage; label: string; sub: string; n: number; tone: string; icon: React.ReactNode }> = [
    { k: "escalated", label: lx.open, sub: lx.openSub, n: s?.open ?? 0, tone: "bg-marigold-50 text-marigold-600", icon: <Inbox className="h-4 w-4" /> },
    { k: "answered", label: lx.progress, sub: lx.progressSub, n: s?.in_progress ?? 0, tone: "bg-sky-50 text-sky-700", icon: <Hourglass className="h-4 w-4" /> },
    { k: "resolved", label: lx.done, sub: lx.doneSub, n: s?.completed ?? 0, tone: "bg-sage-100 text-sage", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];
  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const groups = useMemo(() => {
    if (group === "none") return [{ key: "all", label: "", items: rows }];
    const m = new Map<string, { key: string; label: string; items: DoubtThread[] }>();
    for (const t of rows) {
      const key = group === "student" ? t.student?.id ?? "?" : group === "class" ? `${t.board ?? ""} ${t.grade ?? ""}` : `${t.subject ?? ""} · ${t.topic ?? "—"}`;
      const label = group === "student" ? `${t.student?.full_name ?? "?"} · ${t.board ?? ""} ${t.grade ?? ""}` : group === "class" ? `${t.board ?? "?"} · ${hi ? "कक्षा" : "Class"} ${t.grade ?? "?"}` : key;
      if (!m.has(key)) m.set(key, { key, label, items: [] });
      m.get(key)!.items.push(t);
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length);
  }, [rows, group, hi]);

  return (
    <div className="space-y-4">
      {/* stage tiles double as the status filter */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((x) => (
          <button key={x.k} onClick={() => setStage(stage === x.k ? "all" : x.k)}
            className={cn("flex items-center gap-3 rounded-[var(--radius)] border bg-surface px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-all", stage === x.k ? "border-sky-400 ring-2 ring-sky-100" : "border-line hover:border-sky-300")}>
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", x.tone)}>{x.icon}</span>
            <span className="min-w-0">
              <span className="block font-display text-2xl leading-none text-ink">{x.n}</span>
              <span className="block truncate text-xs text-ink-2">{x.label} · <span className="text-ink-3">{x.sub}</span></span>
            </span>
          </button>
        ))}
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose"><Clock className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="block font-display text-2xl leading-none text-ink">{s ? (s.oldest_wait_hours >= 48 ? `${Math.round(s.oldest_wait_hours / 24)}d` : `${Math.round(s.oldest_wait_hours)}h`) : "–"}</span>
            <span className="block truncate text-xs text-ink-2">{lx.oldest} · <span className="text-ink-3">{lx.ai}: {s?.with_ai ?? 0}</span></span>
          </span>
        </div>
      </div>

      {/* sticky filter bar */}
      <div className="sticky top-0 z-20 -mx-1 space-y-2 bg-paper/95 px-1 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lx.search} className="h-10 pl-9 text-sm" />
          </div>
          <button onClick={() => setFiltersOpen((v) => !v)} className={cn("inline-flex h-10 items-center gap-1.5 rounded-2xl border px-3 text-sm", filtered ? "border-sky-400 bg-sky-50 text-sky-700" : "border-line bg-surface text-ink-2")}>
            <Filter className="h-4 w-4" />{hi ? "फ़िल्टर" : "Filters"}{filtered && <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />}
          </button>
          <div className="inline-flex rounded-2xl border border-line bg-surface p-0.5">
            {([["none", lx.none, <Layers key="l" className="h-3.5 w-3.5" />], ["student", lx.byStudent, <Users key="u" className="h-3.5 w-3.5" />], ["topic", lx.byTopic, null], ["class", lx.byClass, null]] as Array<[Group, string, React.ReactNode]>).map(([g, label, icon]) => (
              <button key={g} onClick={() => setGroup(g)} className={cn("inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium", group === g ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>{icon}{label}</button>
            ))}
          </div>
          <Select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as "oldest" | "recent" })} className="h-10 w-auto text-sm">
            <option value="oldest">{lx.sortOld}</option>
            <option value="recent">{lx.sortNew}</option>
          </Select>
        </div>
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-5">
                <FacetSelect value={f.grade && f.board ? `${f.board}-${f.grade}` : ""} all={lx.klass} facets={s?.classes} label={(v) => v.replace("-", " · ")}
                  onChange={(v) => { const [b, g] = v ? v.split("-") : [undefined, undefined]; setF({ ...f, board: b, grade: g }); }} />
                {(s?.subjects.length ?? 0) > 1 && <FacetSelect value={f.subject ?? ""} all={lx.subject} facets={s?.subjects} onChange={(v) => setF({ ...f, subject: v || undefined })} />}
                <FacetSelect value={f.chapter ?? ""} all={lx.chapter} facets={s?.chapters} onChange={(v) => setF({ ...f, chapter: v || undefined, topic: undefined })} />
                <FacetSelect value={f.topic ?? ""} all={lx.topic} facets={s?.topics} onChange={(v) => setF({ ...f, topic: v || undefined })} />
                <FacetSelect value={f.student_id ?? ""} all={lx.student} facets={s?.students} onChange={(v) => setF({ ...f, student_id: v || undefined })} />
              </div>
              {filtered && <button onClick={() => { setF({ sort: f.sort }); setSearch(""); }} className="mt-2 text-xs font-medium text-sky-700 hover:underline">{lx.reset}</button>}
            </motion.div>
          )}
        </AnimatePresence>
        {/* most-asked topics: one tap filters to them */}
        {s && s.topics.length > 0 && !filtersOpen && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {s.topics.slice(0, 8).map((t) => (
              <button key={t.value} onClick={() => setF({ ...f, topic: f.topic === t.value ? undefined : t.value })}
                className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs", f.topic === t.value ? "border-sky-400 bg-sky-50 text-sky-700" : "border-line bg-surface text-ink-2 hover:border-sky-300")}>
                {t.value} <span className="text-ink-3">· {t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* list */}
        <div className={cn("space-y-2", selected && "max-lg:hidden")}>
          <p className="px-1 text-xs text-ink-3">{rows.length} {lx.of} {total}</p>
          {list.isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          {!list.isLoading && rows.length === 0 && (
            <Card className="p-8 text-center text-sm text-ink-3">
              <MessageCircleQuestion className="mx-auto mb-2 h-7 w-7" />
              {filtered ? lx.empty : stage === "escalated" && (s?.total ?? 0) > 0 ? lx.nothingWaiting : lx.emptyAll}
              {!filtered && stage !== "all" && (s?.total ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {tiles.filter((x) => x.k !== stage && x.n > 0).map((x) => (
                    <button key={x.k} onClick={() => setStage(x.k)} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-sky-300">{x.label} · {x.n}</button>
                  ))}
                </div>
              )}
            </Card>
          )}
          <div className="space-y-3 lg:max-h-[70vh] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            {groups.map((g) => <DoubtGroup key={g.key} g={g} grouped={group !== "none"} lx={lx} selected={selected} picked={picked}
              onOpen={setSelected} onPick={togglePick}
              onPickAll={(ids) => setPicked((p) => { const n = new Set(p); const all = ids.every((i) => n.has(i)); ids.forEach((i) => (all ? n.delete(i) : n.add(i))); return n; })} />)}
            {list.hasNextPage && (
              <button onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-2.5 text-sm font-medium text-sky-700 hover:border-sky-300">
                {list.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}{lx.more}
              </button>
            )}
          </div>
        </div>

        {/* detail */}
        <Card className={cn("flex min-h-[60vh] flex-col p-4 sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-12rem)] lg:self-start lg:overflow-hidden", !selected && "max-lg:hidden")}>
          {thread.data ? <DoubtDetail t={thread.data} lx={lx} onBack={() => setSelected(null)} onChanged={refresh} viewerIsAdmin={user?.role === "admin"} />
            : <div className="grid flex-1 place-items-center text-center text-ink-3"><div><MessageCircleQuestion className="mx-auto h-10 w-10" /><p className="mt-2 text-sm">{lx.pick}</p></div></div>}
        </Card>
      </div>

      <AnimatePresence>{picked.size > 0 && <BulkBar ids={[...picked]} lx={lx} onClear={() => setPicked(new Set())} onDone={() => { setPicked(new Set()); refresh(); }} />}</AnimatePresence>
    </div>
  );
}

function FacetSelect({ value, all, facets, onChange, label }: { value: string; all: string; facets?: Facet[]; onChange: (v: string) => void; label?: (v: string) => string }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 text-sm">
      <option value="">{all}</option>
      {(facets ?? []).map((x) => <option key={x.value} value={x.value}>{x.label ?? (label ? label(x.value) : x.value)} ({x.count})</option>)}
    </Select>
  );
}

function DoubtGroup({ g, grouped, lx, selected, picked, onOpen, onPick, onPickAll }: {
  g: { key: string; label: string; items: DoubtThread[] }; grouped: boolean; lx: Lx; selected: string | null; picked: Set<string>;
  onOpen: (id: string) => void; onPick: (id: string) => void; onPickAll: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  const items = grouped && !all ? g.items.slice(0, 4) : g.items;
  return (
    <div className={cn(grouped && "rounded-2xl border border-line bg-paper-2/50 p-2")}>
      {grouped && (
        <div className="flex items-center gap-2 px-1 pb-1.5">
          <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", !open && "-rotate-90")} />
            <span className="truncate text-sm font-semibold text-ink">{g.label}</span>
            <span className="shrink-0 rounded-full bg-surface px-1.5 text-xs text-ink-3">{g.items.length}</span>
          </button>
          <button onClick={() => onPickAll(g.items.map((t) => t.id))} className="shrink-0 text-xs font-medium text-sky-700 hover:underline">{lx.selectGroup}</button>
        </div>
      )}
      {open && (
        <div className="space-y-1.5">
          {items.map((t) => <Row key={t.id} t={t} lx={lx} active={selected === t.id} picked={picked.has(t.id)} onOpen={() => onOpen(t.id)} onPick={() => onPick(t.id)} />)}
          {grouped && g.items.length > 4 && !all && <button onClick={() => setAll(true)} className="w-full py-1 text-xs font-medium text-sky-700">+{g.items.length - 4}</button>}
        </div>
      )}
    </div>
  );
}

function Row({ t, lx, active, picked, onOpen, onPick }: { t: DoubtThread; lx: Lx; active: boolean; picked: boolean; onOpen: () => void; onPick: () => void }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const now = useNow();
  const wait = t.status === "escalated" ? lx.waiting.replace("{t}", since(t.escalated_at, hi, now)) : "";
  const overdue = !!t.escalated_at && now - new Date(t.escalated_at).getTime() > 864e5;
  return (
    <motion.div layout className={cn("flex items-start gap-2.5 rounded-2xl border bg-surface p-3 transition-colors", active ? "border-sky-400 shadow-[var(--shadow-soft)]" : "border-line hover:border-sky-300")}>
      <input type="checkbox" checked={picked} onChange={onPick} aria-label="select" className="mt-1 h-4 w-4 shrink-0 accent-[var(--sky-600)]" />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <Avatar user={t.student} size={22} />
          <span className="truncate text-sm font-medium text-ink">{t.student?.full_name}</span>
          <span className="shrink-0 text-xs text-ink-3">{t.board} {t.grade}</span>
          {wait && <span className={cn("ml-auto shrink-0 text-[0.68rem] font-medium", overdue ? "text-rose" : "text-marigold-600")}>{wait}</span>}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm text-ink-2">“{t.question || t.topic || "—"}”</span>
        <span className="mt-1.5 flex flex-wrap gap-1">
          {t.subject && <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[0.68rem] font-medium text-sky-700">{t.subject}</span>}
          {t.chapter && <span className="max-w-[12rem] truncate rounded-md bg-paper-2 px-1.5 py-0.5 text-[0.68rem] text-ink-2">{t.chapter}</span>}
          {t.topic && t.topic !== t.chapter && <span className="max-w-[12rem] truncate rounded-md bg-paper-2 px-1.5 py-0.5 text-[0.68rem] text-ink-2">{t.topic}</span>}
        </span>
      </button>
    </motion.div>
  );
}

function DoubtDetail({ t, lx, onBack, onChanged, viewerIsAdmin }: { t: DoubtThread; lx: Lx; onBack: () => void; onChanged: () => void; viewerIsAdmin: boolean }) {
  const { lang } = useI18n();
  return (
    <>
      <div className="flex items-start gap-3 border-b border-line pb-3">
        <button onClick={onBack} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-line lg:hidden" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
        <Avatar user={t.student} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{t.student?.full_name}</p>
          <p className="truncate text-xs text-ink-3">{[t.board && t.grade ? `${t.board} · ${lang === "hi" ? "कक्षा" : "Class"} ${t.grade}` : null, t.subject, t.chapter, t.topic].filter(Boolean).join(" · ")}</p>
          {viewerIsAdmin && t.teacher && <p className="text-xs text-ink-3">→ {t.teacher.full_name}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-[0.68rem] text-ink-3">{lx.aiTries.replace("{n}", String(t.ai_attempts))}</span>
      </div>
      <div className="my-3 rounded-2xl border border-marigold-200 bg-marigold-50/60 p-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-marigold-600">{lx.question}</p>
        <p className="mt-1 text-base font-medium leading-relaxed text-ink">{t.question || t.topic}</p>
      </div>
      <DoubtConversation thread={t} onUpdate={onChanged} teacherView />
    </>
  );
}

function BulkBar({ ids, lx, onClear, onDone }: { ids: string[]; lx: Lx; onClear: () => void; onDone: () => void }) {
  useHideFabs(true); // this bar owns the bottom of the screen while it's open
  const [mode, setMode] = useState<"text" | "live" | null>(null);
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 864e5); d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  });
  const [busy, setBusy] = useState(false);
  const n = String(ids.length);
  const go = async () => {
    setBusy(true);
    try {
      const r = await api.bulkReply(mode === "live" ? { thread_ids: ids, kind: "live", body, scheduled_at: new Date(when).toISOString() } : { thread_ids: ids, kind: "text", body });
      toast.success(lx.sent.replace("{n}", String(r.updated)));
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
      className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-2xl rounded-3xl border border-line bg-surface p-3 shadow-[var(--shadow-lift)] lg:bottom-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white">{lx.selected.replace("{n}", n)}</span>
        <button onClick={() => setMode("text")} className={cn("inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm", mode === "text" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700")}><Send className="h-3.5 w-3.5" />{lx.replyAll}</button>
        <button onClick={() => setMode("live")} className={cn("inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm", mode === "live" ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-700")}><CalendarClock className="h-3.5 w-3.5" />{lx.liveAll}</button>
        <button onClick={onClear} className="ml-auto inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><X className="h-4 w-4" />{lx.clear}</button>
      </div>
      {mode && (
        <div className="mt-3 space-y-2">
          {mode === "live" && <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-10" />}
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-20" placeholder={mode === "live" ? "Agenda (optional)" : "Your answer for everyone…"} />
          <button disabled={busy || (mode === "text" && !body.trim())} onClick={() => void go()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{(mode === "live" ? lx.schedule : lx.send).replace("{n}", n)}
          </button>
        </div>
      )}
    </motion.div>
  );
}
