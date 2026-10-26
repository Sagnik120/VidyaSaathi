"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Flame, GraduationCap, Hourglass, Inbox, Users } from "lucide-react";
import { api } from "@/core/api";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { LoadError } from "@/components/ui/load-error";
import { Avatar } from "@/components/brand/avatar";
import { Card, Ring, Skeleton } from "@/components/ui/primitives";
import dynamic from "next/dynamic";

// Each desk tab is its own chunk: the home view stays light.
const tabLoading = () => <Skeleton className="h-96 w-full rounded-[var(--radius)]" />;
const DoubtManager = dynamic(() => import("@/components/school/doubt-manager").then((m) => m.DoubtManager), { loading: tabLoading });
const StudentsDesk = dynamic(() => import("@/components/school/teacher-desk").then((m) => m.StudentsDesk), { loading: tabLoading });
const TestsDesk = dynamic(() => import("@/components/school/teacher-desk").then((m) => m.TestsDesk), { loading: tabLoading });
import { TEACHER_TABS, type TeacherTab } from "@/lib/staff";
import { cn, EASE } from "@/lib/utils";

export default function TeacherPage() {
  const { t, lang } = useI18n();
  const hi = lang === "hi";
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("tab") as TeacherTab | null;
  const tab: TeacherTab = TEACHER_TABS.some((x) => x.v === asked) ? asked! : "home";
  const setTab = (v: TeacherTab) => router.replace(`/teacher?tab=${v}`, { scroll: false });
  const ov = useQuery({ queryKey: ["teacher-overview"], queryFn: api.teacher.overview, refetchInterval: 20000 });
  const first = user?.full_name.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      {/* Full greeting only on the home tab; elsewhere a slim header keeps the work above the fold. */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {tab === "home" && <p className="font-hand text-xl text-sky-700">{hi ? "नमस्ते" : "Namaste"}, {first}</p>}
          {tab === "home" && <h1 className="font-display text-5xl text-ink sm:text-6xl">{t("staff.teacherTitle")}</h1>}
          <div className={cn("flex flex-wrap items-center gap-1.5", tab === "home" && "mt-2")}>
            {ov.data?.subject && <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{ov.data.subject}</span>}
            {ov.data?.classes.map((c) => <span key={c} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-2">{c.replace("-", " · ")}</span>)}
            {ov.data?.class_teacher_of.length ? <span className="rounded-full bg-marigold-50 px-2.5 py-0.5 text-xs text-marigold-600">{hi ? "कक्षा शिक्षक" : "Class teacher"} · {ov.data.class_teacher_of.length}</span> : null}
          </div>
        </div>
      </header>

      <div className="no-scrollbar sticky top-0 z-30 -mx-4 mt-6 overflow-x-auto bg-paper/90 px-4 py-2 backdrop-blur lg:hidden">
        <div className="flex w-max gap-1 rounded-2xl border border-line bg-surface p-1">
          {TEACHER_TABS.map((x) => (
            <button key={x.v} onClick={() => setTab(x.v)} className={cn("relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium", tab === x.v ? "text-white" : "text-ink-2")}>
              {tab === x.v && <motion.span layoutId="teacher-tab" className="absolute inset-0 rounded-xl bg-ink" />}
              <span className="relative">{x.icon}</span><span className="relative">{t(x.k)}</span>
              {x.v === "doubts" && (ov.data?.doubts.open ?? 0) > 0 && <span className="relative rounded-full bg-marigold px-1.5 text-[0.65rem] font-bold text-ink">{ov.data!.doubts.open}</span>}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }} className="mt-4 lg:mt-5">
          {tab !== "home" && (
            <>
              <h1 className="flex items-center gap-2 font-display text-4xl text-ink">{TEACHER_TABS.find((x) => x.v === tab)?.icon}{t(TEACHER_TABS.find((x) => x.v === tab)!.k)}</h1>
              <p className="mb-4 mt-1 max-w-3xl text-sm text-ink-3">{t(`admin.desc.${tab}` as "admin.desc.doubts")}</p>
            </>
          )}
          {tab === "home" && <Home go={setTab} />}
          {tab === "doubts" && <DoubtManager />}
          {tab === "students" && <StudentsDesk />}
          {tab === "tests" && <TestsDesk />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** What needs the teacher now: waiting doubts, who to look at, what the class is stuck on. */
function Home({ go }: { go: (t: TeacherTab) => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["teacher-overview"], queryFn: api.teacher.overview, refetchInterval: 20000 });
  const d = q.data;
  if (q.isError) return <LoadError error={q.error} onRetry={() => void q.refetch()} />;
  if (!d) return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-[var(--radius)]" />)}</div>;
  const tiles = [
    { label: hi ? "खुले डाउट" : "Doubts waiting", v: d.doubts.open, icon: <Inbox />, tone: "bg-marigold-50 text-marigold-600", to: "doubts" as const },
    { label: hi ? "जारी" : "In progress", v: d.doubts.in_progress, icon: <Hourglass />, tone: "bg-sky-50 text-sky-700", to: "doubts" as const },
    { label: hi ? "हल हुए" : "Solved", v: d.doubts.completed, icon: <CheckCircle2 />, tone: "bg-sage-100 text-sage", to: "doubts" as const },
    { label: hi ? "मेरे छात्र" : "My students", v: d.students, icon: <Users />, tone: "bg-paper-2 text-ink-2", to: "students" as const },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((x) => (
          <button key={x.label} onClick={() => go(x.to)} className="rounded-[var(--radius)] border border-line bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-sky-300">
            <span className={cn("grid h-8 w-8 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4", x.tone)}>{x.icon}</span>
            <p className="mt-2 font-display text-3xl text-ink">{n(x.v)}</p>
            <p className="text-sm text-ink-2">{x.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-2xl"><AlertTriangle className="h-5 w-5 text-rose" />{hi ? "किस पर ध्यान दें" : "Who needs you most"}</p>
            <button onClick={() => go("students")} className="text-sm font-medium text-sky-700 hover:underline">{hi ? "सभी" : "All students"} →</button>
          </div>
          {d.focus.length === 0 ? <p className="mt-4 text-sm text-ink-3">{hi ? "सब ठीक चल रहा है 🎉" : "Everyone is on track 🎉"}</p> : (
            <ul className="mt-3 divide-y divide-line">
              {d.focus.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Avatar user={s} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.full_name} <span className="text-xs font-normal text-ink-3">· {s.board} {s.grade}</span></p>
                    <p className="truncate text-xs text-ink-3">{s.focus_reasons.join(" · ")}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", s.focus_level === "high" ? "bg-rose-100 text-rose" : "bg-marigold-50 text-marigold-600")}>{n(s.focus_score)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="flex items-center gap-2 font-display text-2xl"><Flame className="h-5 w-5 text-marigold-600" />{hi ? "कक्षा कहाँ अटकी है" : "Where the class is stuck"}</p>
            {d.hot_topics.length === 0 ? <p className="mt-3 text-sm text-ink-3">{hi ? "अभी कोई खुला डाउट नहीं।" : "No open doubts right now."}</p> : (
              <ul className="mt-3 space-y-2">
                {d.hot_topics.map((h) => (
                  <li key={`${h.subject}-${h.topic}`} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{h.topic}</span>
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-marigold-400" style={{ width: `${Math.min(100, h.count * 20)}%` }} /></span>
                    <span className="w-6 text-right text-xs font-semibold text-ink-2">{n(h.count)}</span>
                  </li>
                ))}
              </ul>
            )}
            {d.hot_topics.length > 0 && <button onClick={() => go("doubts")} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline">{hi ? "एक साथ जवाब दें" : "Answer them together"}<ArrowRight className="h-3.5 w-3.5" /></button>}
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <Ring value={d.avg_progress} size={70} stroke={7} label={<span className="text-sm font-semibold">{n(d.avg_progress)}%</span>} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium"><GraduationCap className="h-4 w-4 text-sky-600" />{hi ? "औसत सिलेबस प्रगति" : "Average syllabus progress"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><ClipboardList className="h-3.5 w-3.5" />{n(d.tests.count)} {hi ? "टेस्ट" : "tests"} · {n(d.tests.attempts)} {hi ? "प्रयास" : "attempts"}{d.tests.avg_pct != null ? ` · ${hi ? "औसत" : "avg"} ${n(d.tests.avg_pct)}%` : ""}</p>
              <Link href="/teacher?tab=tests" className="mt-1 inline-block text-xs font-medium text-sky-700 hover:underline">{hi ? "नया टेस्ट बनाएँ" : "Create a test"} →</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
