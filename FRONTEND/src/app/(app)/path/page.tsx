"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, BookOpen, Check, ChevronDown, Circle, FlaskConical, GraduationCap, Loader2, MessageCircle, Play, RotateCcw, Sparkles, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { SyllabusChapter, SyllabusPath, SyllabusSubject, SyllabusTopic } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { LoadError } from "@/components/ui/load-error";
import { Avatar } from "@/components/brand/avatar";
import { Card, Ring, Skeleton } from "@/components/ui/primitives";
import { findTopic, lessonHref } from "@/lib/syllabus";
import { cn, EASE } from "@/lib/utils";

const TXT = {
  en: {
    title: "Learning path", sub: "Your board's syllabus, subject by subject, chapter by chapter. Start anywhere — or follow it in order.",
    overall: "Syllabus covered", continue: "Continue", next: "Up next", start: "Start", resume: "Resume", report: "Report",
    markDone: "Mark as done", markUndo: "Not done yet", chapters: "chapters", topics: "topics", allSubjects: "All subjects",
    done: "Done", inProgress: "In progress", setup: "Tell us your board and class", setupSub: "Your learning path is built from your board's syllabus for your class.",
    setupCta: "Set board & class", teachers: "Your teachers", classTeacher: "Class teacher", chat: "Chat", lab: "Practice Lab",
    labSub: "Simulations + games for your class", finished: "Subject complete!", chapter: "Chapter", noTeacher: "Not assigned yet",
    revise: "Revise first — adapted to you", openDoubt: "open doubt", level: { beginner: "Taught gently", intermediate: "Normal pace", advanced: "Faster, deeper" },
  },
  hi: {
    title: "सीखने का रास्ता", sub: "आपके बोर्ड का सिलेबस, विषय दर विषय, अध्याय दर अध्याय। कहीं से भी शुरू करें — या क्रम से चलें।",
    overall: "सिलेबस पूरा", continue: "जारी रखें", next: "अगला", start: "शुरू करें", resume: "जारी रखें", report: "रिपोर्ट",
    markDone: "पूरा चिह्नित करें", markUndo: "अभी पूरा नहीं", chapters: "अध्याय", topics: "टॉपिक", allSubjects: "सभी विषय",
    done: "पूरा", inProgress: "जारी", setup: "अपना बोर्ड और कक्षा बताइए", setupSub: "आपका रास्ता आपकी कक्षा के बोर्ड सिलेबस से बनता है।",
    setupCta: "बोर्ड और कक्षा चुनें", teachers: "आपके शिक्षक", classTeacher: "कक्षा शिक्षक", chat: "चैट", lab: "प्रैक्टिस लैब",
    labSub: "आपकी कक्षा के सिमुलेशन + गेम", finished: "विषय पूरा!", chapter: "अध्याय", noTeacher: "अभी तय नहीं",
    revise: "पहले दोहराइए — आपके हिसाब से", openDoubt: "खुला डाउट", level: { beginner: "आराम से", intermediate: "सामान्य गति", advanced: "तेज़, गहराई से" },
  },
};
type Tx = (typeof TXT)["en"];

export default function PathPage() {
  const { lang, n } = useI18n();
  const tx = TXT[lang === "hi" ? "hi" : "en"];
  const q = useQuery({ queryKey: ["syllabus"], queryFn: api.syllabus, refetchOnMount: "always" });
  const [active, setActive] = useState<string>("all");
  const data = q.data;

  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("subject");
    if (want) setActive(want);
  }, []);

  if (q.isError) return <Shell tx={tx}><LoadError error={q.error} onRetry={() => void q.refetch()} /></Shell>;
  if (q.isLoading) return <Shell tx={tx}><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-[var(--radius)]" />)}</div></Shell>;
  if (!data?.configured) {
    return (
      <Shell tx={tx}>
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <GraduationCap className="h-10 w-10 text-sky-600" />
          <h2 className="font-display text-3xl">{tx.setup}</h2>
          <p className="text-ink-2">{tx.setupSub}</p>
          <Link href="/profile#details" className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">{tx.setupCta}<ArrowRight className="h-4 w-4" /></Link>
        </Card>
      </Shell>
    );
  }

  const subject = data.subjects.find((s) => s.id === active || s.name === active);
  return (
    <Shell tx={tx} badge={`${data.board} · ${lang === "hi" ? "कक्षा" : "Class"} ${n(data.grade ?? "")}`}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-5">
          {/* subject switcher */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <SubjectChip label={tx.allSubjects} active={!subject} onClick={() => setActive("all")} pct={data.pct ?? 0} />
            {data.subjects.map((s) => <SubjectChip key={s.id} label={s.name} pct={s.pct} active={subject?.id === s.id} onClick={() => setActive(s.id)} />)}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={subject?.id ?? "all"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
              {subject ? <SubjectView p={data} s={subject} tx={tx} /> : <Overview p={data} tx={tx} onOpen={setActive} />}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card className="flex items-center gap-4 p-5">
            <Ring value={data.pct ?? 0} size={76} stroke={7} label={<span className="font-display text-xl">{n(data.pct ?? 0)}%</span>} />
            <div>
              <p className="text-sm font-medium text-ink">{tx.overall}</p>
              <p className="text-xs text-ink-3">{n(data.done ?? 0)} / {n(data.total ?? 0)} {tx.topics}</p>
            </div>
          </Card>
          <MyTeachers tx={tx} />
          <Link href="/lab" className="flex items-center gap-3 rounded-[24px] border border-sky-200 bg-sky-50/60 p-4 transition-colors hover:border-sky-400">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-sky-600"><FlaskConical className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{tx.lab}</span>
              <span className="block text-xs text-ink-2">{tx.labSub}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-sky-700" />
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ tx, badge, children }: { tx: Tx; badge?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-5xl text-ink sm:text-6xl">{tx.title}</h1>
          {badge && <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{badge}</span>}
        </div>
        <p className="mt-2 text-ink-2">{tx.sub}</p>
      </header>
      {children}
    </div>
  );
}

function SubjectChip({ label, pct, active, onClick }: { label: string; pct: number; active: boolean; onClick: () => void }) {
  const { n } = useI18n();
  return (
    <button onClick={onClick} className={cn("relative flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-medium transition-colors",
      active ? "border-sky-400 bg-sky-50 text-sky-700 shadow-[var(--shadow-soft)]" : "border-line bg-surface text-ink-2 hover:border-sky-300")}>
      {label}
      <span className={cn("rounded-full px-1.5 text-[0.68rem] font-semibold", pct === 100 ? "bg-sage-100 text-sage" : "bg-paper-2 text-ink-3")}>{n(pct)}%</span>
    </button>
  );
}

/** All subjects at a glance, each with its deterministic next topic. */
function Overview({ p, tx, onOpen }: { p: SyllabusPath; tx: Tx; onOpen: (id: string) => void }) {
  const { n } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p.subjects.map((s, i) => {
        const found = findTopic(s, s.next?.id);
        return (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
            <Card lift className="flex h-full flex-col p-5">
              <button onClick={() => onOpen(s.id)} className="flex items-start gap-3 text-left">
                <Ring value={s.pct} size={56} stroke={6} label={<span className="text-xs font-semibold">{n(s.pct)}%</span>} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl text-ink">{s.name}</span>
                  <span className="block text-xs text-ink-3">{n(s.chapters.length)} {tx.chapters} · {n(s.done)}/{n(s.total)} {tx.topics}</span>
                </span>
                <ChevronDown className="mt-2 h-4 w-4 -rotate-90 text-ink-3" />
              </button>
              <div className="mt-4 flex-1 rounded-2xl bg-paper-2 p-3">
                {s.next && found ? (
                  <>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-3">{tx.next}</p>
                    <p className="truncate font-medium text-ink">{s.next.title}</p>
                    <p className="truncate text-xs text-ink-3">{tx.chapter} {n(found.c.number)} · {s.next.chapter}</p>
                  </>
                ) : <p className="flex items-center gap-2 font-medium text-sage"><Trophy className="h-4 w-4" />{tx.finished}</p>}
              </div>
              {s.next && found && <TopicAction p={p} s={s} c={found.c} t={found.t} tx={tx} primary label={s.started ? tx.continue : tx.start} />}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function SubjectView({ p, s, tx }: { p: SyllabusPath; s: SyllabusSubject; tx: Tx }) {
  const { n } = useI18n();
  const found = findTopic(s, s.next?.id);
  const firstOpen = found?.c.id ?? s.chapters[0]?.id;
  const [open, setOpen] = useState<Set<string>>(() => new Set(firstOpen ? [firstOpen] : []));
  const toggle = (id: string) => setOpen((o) => { const x = new Set(o); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  return (
    <div className="space-y-4">
      {found ? (
        <div className="flex flex-wrap items-center gap-4 rounded-[24px] border border-sky-200 bg-sky-50/60 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white"><Sparkles className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{tx.next} · {tx.chapter} {n(found.c.number)}</p>
            <p className="truncate font-display text-2xl text-ink">{found.t.title}</p>
            <p className="truncate text-xs text-ink-2">{found.c.title}{s.suggested_level ? ` · ${tx.level[s.suggested_level]}` : ""}</p>
          </div>
          <TopicAction p={p} s={s} c={found.c} t={found.t} tx={tx} primary label={s.started ? tx.continue : tx.start} />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-[24px] border border-sage/30 bg-sage-100 p-5 font-display text-2xl text-sage"><Trophy className="h-6 w-6" />{tx.finished}</div>
      )}

      {(s.revise?.length ?? 0) > 0 && (
        <div className="rounded-[20px] border border-marigold-200 bg-marigold-50/60 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-marigold-600"><RotateCcw className="h-3.5 w-3.5" />{tx.revise}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.revise!.map((r) => {
              const f = findTopic(s, r.id);
              return f ? (
                <Link key={r.id} href={lessonHref(p, { ...s, suggested_level: "beginner" }, f.c, f.t)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-marigold-200 bg-surface px-3 py-1.5 text-sm text-ink hover:border-marigold-400">
                  {r.title}<span className="text-xs text-ink-3">· {r.reason === "doubt" ? tx.openDoubt : `${Math.round((r.score ?? 0) * 100)}%`}</span>
                </Link>
              ) : null;
            })}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {s.chapters.map((c) => {
          const isOpen = open.has(c.id);
          return (
            <Card key={c.id} className="overflow-hidden">
              <button onClick={() => toggle(c.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-paper/60 sm:px-5">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold",
                  c.state === "completed" ? "bg-sage-100 text-sage" : c.state === "started" ? "bg-sky-100 text-sky-700" : "bg-paper-2 text-ink-3")}>
                  {c.state === "completed" ? <Check className="h-4 w-4" /> : n(c.number)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{c.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-sage transition-[width] duration-700" style={{ width: `${(c.done / c.total) * 100}%` }} /></span>
                    <span className="text-xs text-ink-3">{n(c.done)}/{n(c.total)}</span>
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", isOpen && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
                    className="overflow-hidden border-t border-line">
                    {c.topics.map((t) => <TopicRow key={t.id} p={p} s={s} c={c} t={t} tx={tx} isNext={t.id === s.next?.id} />)}
                  </motion.ol>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TopicRow({ p, s, c, t, tx, isNext }: { p: SyllabusPath; s: SyllabusSubject; c: SyllabusChapter; t: SyllabusTopic; tx: Tx; isNext: boolean }) {
  const { n } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const done = t.state === "completed";
  const mark = async () => {
    setBusy(true);
    try { await api.topicComplete(t.id, !done); await qc.invalidateQueries({ queryKey: ["syllabus"] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <li className={cn("flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:px-5", isNext && "bg-sky-50/50")}>
      <button onClick={mark} disabled={busy} title={done ? tx.markUndo : tx.markDone} aria-label={done ? tx.markUndo : tx.markDone}
        className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
          done ? "border-sage bg-sage text-white" : t.state === "started" ? "border-sky-400 text-sky-600" : "border-line-2 text-transparent hover:border-sage hover:text-sage")}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" /> : done ? <Check className="h-3.5 w-3.5" /> : t.state === "started" ? <Circle className="h-2.5 w-2.5 fill-current" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", done ? "text-ink-2" : "font-medium text-ink")}><span className="mr-1.5 text-ink-3">{n(t.number)}</span>{t.title}</p>
        <p className="text-xs text-ink-3">
          {done ? `${tx.done}${t.score != null ? ` · ${n(Math.round(t.score * 100))}%` : ""}` : t.state === "started" ? tx.inProgress : isNext ? tx.next : ""}
        </p>
      </div>
      <TopicAction p={p} s={s} c={c} t={t} tx={tx} primary={isNext} />
    </li>
  );
}

function TopicAction({ p, s, c, t, tx, primary, label }: { p: SyllabusPath; s: SyllabusSubject; c: SyllabusChapter; t: SyllabusTopic; tx: Tx; primary?: boolean; label?: string }) {
  const live = t.lesson_id && t.lesson_status && !["completed", "abandoned"].includes(t.lesson_status);
  const action = live ? { href: `/learn/${t.lesson_id}`, label: tx.resume, icon: <Play className="h-3.5 w-3.5" /> }
    : t.state === "completed" && t.lesson_id ? { href: `/report/${t.lesson_id}`, label: tx.report, icon: <BookOpen className="h-3.5 w-3.5" /> }
    : { href: lessonHref(p, s, c, t), label: label ?? (t.state === "completed" ? tx.start : tx.start), icon: t.state === "completed" ? <RotateCcw className="h-3.5 w-3.5" /> : null };
  return (
    <Link href={action.href} className={cn("mt-3 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-medium transition-colors sm:mt-0",
      primary ? "bg-sky-600 text-white hover:bg-sky-700" : "border border-line text-sky-700 hover:border-sky-300 hover:bg-sky-50")}>
      {action.icon}{action.label}<ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function MyTeachers({ tx }: { tx: Tx }) {
  const q = useQuery({ queryKey: ["my-teachers"], queryFn: api.myTeachers });
  const people = useMemo(() => {
    const m = new Map<string, { id: string; full_name: string; initials: string; avatar_color: string; roles: string[] }>();
    if (q.data?.mentor) m.set(q.data.mentor.id, { ...q.data.mentor, roles: [tx.classTeacher] });
    for (const s of q.data?.subjects ?? []) {
      if (!s.teacher) continue;
      const cur = m.get(s.teacher.id) ?? { ...s.teacher, roles: [] };
      cur.roles.push(s.subject);
      m.set(s.teacher.id, cur);
    }
    return [...m.values()];
  }, [q.data, tx.classTeacher]);
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink"><GraduationCap className="h-4 w-4 text-sky-600" />{tx.teachers}</p>
      <div className="mt-3 space-y-2.5">
        {q.isLoading && <Skeleton className="h-10 w-full" />}
        {!q.isLoading && people.length === 0 && <p className="text-sm text-ink-3">{tx.noTeacher}</p>}
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <Avatar user={p} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.full_name}</p>
              <p className="truncate text-xs text-ink-3">{p.roles.join(" · ")}</p>
            </div>
            <Link href={`/doubts?with=${p.id}`} className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-3 hover:border-sky-300 hover:text-sky-700" title={tx.chat} aria-label={tx.chat}>
              <MessageCircle className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
