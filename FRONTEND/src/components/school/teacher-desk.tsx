"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle, ArrowLeft, Check, ChevronRight, ClipboardList, GraduationCap, Hand, MessageCircle, Plus, Save, Settings2, Trash2, Trophy, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { Board, Teaching, TeacherStudent, TeacherTestReport } from "@/core/types";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { Avatar } from "@/components/brand/avatar";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Ring, Select, Skeleton, Tabs, Textarea } from "@/components/ui/primitives";
import { TeachingPicker } from "./teaching-picker";
import { TestLeaderboard } from "./leaderboard";
import { cn, EASE } from "@/lib/utils";

const pctTone = (p: number | null | undefined) => (p == null ? "text-ink-3" : p >= 75 ? "text-sage" : p >= 40 ? "text-marigold-600" : "text-rose");
const barTone = (p: number) => (p >= 75 ? "bg-sage" : p >= 40 ? "bg-marigold-400" : "bg-rose");

function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-paper-3", className)}>
      <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }} className={cn("block h-full rounded-full", barTone(pct))} />
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* My students                                                              */
/* ------------------------------------------------------------------------ */

type Scope = "all" | "subject" | "mentor";
type Sort = "focus" | "name" | "progress" | "tests";
const PER_PAGE = 24;

export function StudentsDesk() {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("all");
  const [subject, setSubject] = useState("");
  const [klass, setKlass] = useState("");
  const [sort, setSort] = useState<Sort>("focus");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"cards" | "table">("table");
  const [open, setOpen] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [board, grade] = klass ? klass.split("-") : [undefined, undefined];
  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [scope, subject, klass, sort]);
  const res = useQuery({
    queryKey: ["teacher-students", scope, subject, klass, sort, q, page],
    queryFn: () => api.teacher.students({ scope, subject: subject || undefined, board, grade, sort, q: q || undefined, limit: PER_PAGE, offset: page * PER_PAGE }),
    placeholderData: (p) => p,
  });
  const data = res.data;
  const noProfile = user?.role === "teacher" && data && data.teaching.length === 0 && data.class_teacher_of.length === 0;
  useEffect(() => { if (noProfile) setSetup(true); }, [noProfile]);
  const pages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;
  const sm = data?.summary;

  return (
    <div className="space-y-5">
      {user?.role === "teacher" && <TeachingProfile open={setup} onToggle={() => setSetup((v) => !v)} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini icon={<Users />} label={hi ? "छात्र" : "Students"} value={n(sm?.total ?? 0)} />
        <Mini icon={<AlertTriangle />} label={hi ? "ज़्यादा ध्यान चाहिए" : "Need focus now"} value={n(sm?.high ?? 0)} tone="rose" />
        <Mini icon={<GraduationCap />} label={hi ? "औसत सिलेबस" : "Avg. syllabus done"} value={`${n(sm?.avg_progress ?? 0)}%`} tone="sage" />
        <Mini icon={<Hand />} label={hi ? "खुले डाउट" : "Open doubts"} value={n(sm?.open_doubts ?? 0)} tone="marigold" />
      </div>

      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 bg-paper/95 px-1 py-2 backdrop-blur">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={hi ? "नाम से खोजें…" : "Search by name…"} className="h-10 w-full text-sm sm:w-56" />
        <Tabs value={scope} onChange={setScope} className="w-full sm:w-auto" items={[
          { value: "all", label: hi ? "सभी" : "All" },
          { value: "subject", label: hi ? "मेरे विषय के" : "My subject" },
          { value: "mentor", label: hi ? "मेरी कक्षा" : "My class" },
        ]} />
        <Select value={klass} onChange={(e) => setKlass(e.target.value)} className="h-10 w-auto min-w-32 text-sm">
          <option value="">{hi ? "सभी कक्षाएँ" : "All classes"}</option>
          {(data?.classes ?? []).map((c) => <option key={c} value={c}>{c.replace("-", " · ")}</option>)}
        </Select>
        {(data?.subjects.length ?? 0) > 1 && (
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 w-auto min-w-32 text-sm">
            <option value="">{hi ? "सभी विषय" : "All subjects"}</option>
            {(data?.subjects ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        )}
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 w-auto text-sm">
          <option value="focus">{hi ? "ध्यान ज़रूरी पहले" : "Needs focus first"}</option>
          <option value="progress">{hi ? "कम प्रगति पहले" : "Lowest progress first"}</option>
          <option value="tests">{hi ? "कम टेस्ट अंक पहले" : "Lowest test score first"}</option>
          <option value="name">{hi ? "नाम" : "Name"}</option>
        </Select>
        <div className="ml-auto inline-flex rounded-2xl border border-line bg-surface p-0.5">
          {(["table", "cards"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-xl px-2.5 py-1.5 text-xs font-medium", view === v ? "bg-ink text-white" : "text-ink-3")}>{v === "table" ? (hi ? "तालिका" : "Table") : (hi ? "कार्ड" : "Cards")}</button>
          ))}
        </div>
      </div>

      {!data ? <Skeleton className="h-64 w-full rounded-[var(--radius)]" /> : data.students.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-3">{q ? (hi ? "कोई छात्र नहीं मिला।" : "No student matches.") : hi ? "अभी कोई छात्र नहीं। अपनी पढ़ाने की प्रोफ़ाइल सेट करें — छात्र अपने-आप जुड़ जाएँगे।" : "No students yet. Set your teaching profile — students are matched to you automatically."}</Card>
      ) : view === "table" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-paper-2 text-left text-xs text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{hi ? "छात्र" : "Student"}</th>
                  <th className="px-3 py-2.5 font-medium">{hi ? "ध्यान" : "Focus"}</th>
                  <th className="px-3 py-2.5 font-medium">{hi ? "सिलेबस" : "Syllabus"}</th>
                  <th className="px-3 py-2.5 font-medium">{hi ? "टेस्ट" : "Tests"}</th>
                  <th className="px-3 py-2.5 font-medium">{hi ? "डाउट" : "Doubts"}</th>
                  <th className="px-3 py-2.5 font-medium">{hi ? "क्यों" : "Why"}</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} onClick={() => setOpen(s.id)} className="cursor-pointer border-t border-line hover:bg-sky-50/40">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar user={s} size={30} />
                        <span className="min-w-0"><span className="block truncate font-medium text-ink">{s.full_name}</span><span className="text-xs text-ink-3">{s.board} {s.grade}{s.is_mentor ? ` · ${hi ? "मेंटी" : "mentee"}` : ""}</span></span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><FocusPill level={s.focus_level} score={s.focus_score} /></td>
                    <td className="px-3 py-2.5"><span className="flex items-center gap-2"><Bar pct={s.overall_pct} className="w-20" /><span className="text-xs tabular-nums text-ink-3">{n(s.overall_pct)}%</span></span></td>
                    <td className={cn("px-3 py-2.5 font-semibold", pctTone(s.test_avg))}>{s.test_avg != null ? `${n(s.test_avg)}%` : "—"}</td>
                    <td className="px-3 py-2.5">{s.open_doubts > 0 ? <Badge tone="amber" dot>{n(s.open_doubts)}</Badge> : <span className="text-ink-3">{n(s.doubts_total)}</span>}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5 text-xs text-ink-3" title={s.focus_reasons.join(" · ")}>{s.focus_reasons.join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.students.map((s, i) => <StudentCard key={s.id} s={s} i={i} subject={subject} onOpen={() => setOpen(s.id)} />)}
        </div>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-xl border border-line px-3 py-1.5 disabled:opacity-40">←</button>
          <span className="text-ink-3">{n(page + 1)} / {n(pages)}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-xl border border-line px-3 py-1.5 disabled:opacity-40">→</button>
        </div>
      )}
      <StudentDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function FocusPill({ level, score }: { level: "high" | "medium" | "low"; score: number }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const tone = level === "high" ? "bg-rose-100 text-rose" : level === "medium" ? "bg-marigold-50 text-marigold-600" : "bg-sage-100 text-sage";
  const label = level === "high" ? (hi ? "ज़्यादा" : "High") : level === "medium" ? (hi ? "मध्यम" : "Watch") : (hi ? "ठीक" : "On track");
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>{label}{level !== "low" && <span className="opacity-70">{n(score)}</span>}</span>;
}

function Mini({ icon, label, value, tone = "sky" }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "sky" | "sage" | "rose" | "marigold" }) {
  const tones = { sky: "bg-sky-50 text-sky-700", sage: "bg-sage-100 text-sage", rose: "bg-rose-100 text-rose", marigold: "bg-marigold-50 text-marigold-600" };
  return (
    <Card className="p-4">
      <span className={cn("grid h-8 w-8 place-items-center rounded-xl [&>svg]:h-4 [&>svg]:w-4", tones[tone])}>{icon}</span>
      <p className="mt-3 font-display text-3xl text-ink">{value}</p>
      <p className="text-xs text-ink-3">{label}</p>
    </Card>
  );
}

function TeachingProfile({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const qc = useQueryClient();
  const { refreshUser } = useAuth();
  const q = useQuery({ queryKey: ["teacher-profile"], queryFn: api.teacher.profile });
  const [teaching, setTeaching] = useState<Teaching[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) { setTeaching(q.data.teaching); setClasses(q.data.class_teacher_of); } }, [q.data]);
  const save = async () => {
    setSaving(true);
    try {
      await api.teacher.setProfile(teaching, classes);
      toast.success(hi ? "सहेजा गया" : "Teaching profile saved");
      ["teacher-students", "teacher-profile", "teacher-overview"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      void refreshUser();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  const subj = q.data?.teaching[0]?.subject;
  return (
    <Card className="p-4">
      <button onClick={onToggle} className="flex w-full items-center gap-3 text-left">
        <Settings2 className="h-5 w-5 text-sky-600" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{hi ? "पढ़ाने की प्रोफ़ाइल" : "Teaching profile"}</span>
          <span className="block truncate text-xs text-ink-3">
            {subj ? `${subj} · ${(q.data?.teaching ?? []).map((t) => `${t.board} ${t.grade}`).join(", ")}` : (hi ? "अपना विषय और कक्षाएँ चुनें" : "Choose your subject and classes")}
          </span>
        </span>
        <ChevronRight className={cn("h-4 w-4 text-ink-3 transition-transform", open && "rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 pt-4">
              <TeachingPicker teaching={teaching} classes={classes} onChange={(a, b) => { setTeaching(a); setClasses(b); }} />
              <Button onClick={() => void save()} disabled={saving} icon={<Save className="h-4 w-4" />}>{hi ? "सहेजें" : "Save"}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function StudentCard({ s, i, subject, onOpen }: { s: TeacherStudent; i: number; subject: string; onOpen: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const subjects = Object.entries(s.progress).filter(([k]) => !subject || k === subject);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03, ease: EASE }}>
      <Card lift className="cursor-pointer p-4" onClick={onOpen}>
        <div className="flex items-center gap-3">
          <Avatar user={s} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{s.full_name}</p>
            <p className="truncate text-xs text-ink-3">{s.board} · {hi ? "कक्षा" : "Class"} {n(s.grade ?? "")}{s.is_mentor ? ` · ${hi ? "मेंटी" : "Mentee"}` : ""}</p>
          </div>
          <FocusPill level={s.focus_level} score={s.focus_score} />
        </div>
        <div className="mt-3 space-y-1.5">
          {subjects.slice(0, 3).map(([name, p]) => (
            <div key={name} className="grid grid-cols-[96px_1fr_36px] items-center gap-2 text-xs">
              <span className="truncate text-ink-2">{name}</span><Bar pct={p.pct} /><span className="text-right tabular-nums text-ink-3">{n(p.pct)}%</span>
            </div>
          ))}
        </div>
        {s.focus_reasons.length > 0 && <p className="mt-3 line-clamp-2 text-xs text-ink-3">{s.focus_reasons.join(" · ")}</p>}
      </Card>
    </motion.div>
  );
}

function StudentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const router = useRouter();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["teacher-student", id], queryFn: () => api.teacher.student(id!), enabled: !!id });
  const dir = useQuery({ queryKey: ["teacher-dir"], queryFn: api.teacher.directory, enabled: !!id && user?.role === "admin" });
  const d = q.data;
  const chat = async () => {
    if (!id) return;
    try { const t = await api.openChat(id); router.push(`${user?.role === "admin" ? "/admin" : "/teacher"}?tab=doubts&thread=${t.id}`); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <AnimatePresence>
      {id && (
        <motion.div className="fixed inset-0 z-50 flex justify-end bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside onClick={(e) => e.stopPropagation()} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
            className="h-full w-full max-w-xl overflow-y-auto bg-paper p-5 shadow-[var(--shadow-lift)] sm:p-6">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface" aria-label="close"><X className="h-4 w-4" /></button>
              {d && <><Avatar user={d.student} size={44} /><div className="min-w-0 flex-1"><p className="truncate font-display text-2xl">{d.student.full_name}</p><p className="text-xs text-ink-3">{d.student.board} · {hi ? "कक्षा" : "Class"} {d.student.grade}</p></div>
                <Button size="sm" variant="soft" onClick={() => void chat()} icon={<MessageCircle className="h-4 w-4" />}>{hi ? "चैट" : "Chat"}</Button></>}
            </div>
            {!d ? <Skeleton className="mt-6 h-64 w-full" /> : (
              <div className="mt-6 space-y-5">
                {user?.role === "admin" && dir.data && (
                  <Card className="flex items-center gap-3 p-4">
                    <GraduationCap className="h-4 w-4 text-sky-600" />
                    <span className="text-sm">{hi ? "कक्षा शिक्षक" : "Class teacher"}</span>
                    <Select className="h-10 flex-1 text-sm" defaultValue="" onChange={(e) => e.target.value && api.teacher.setMentor(d.student.id, e.target.value).then(() => toast.success(hi ? "बदला गया" : "Reassigned")).catch((er) => toast.error(er.message))}>
                      <option value="" disabled>{hi ? "चुनें…" : "Reassign to…"}</option>
                      {dir.data.teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </Select>
                  </Card>
                )}
                {d.path.subjects.map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-center justify-between"><p className="font-medium">{s.name}</p><span className={cn("text-sm font-semibold", pctTone(s.pct))}>{n(s.pct)}%</span></div>
                    <Bar pct={s.pct} className="mt-2 h-2" />
                    <p className="mt-2 text-xs text-ink-3">{hi ? "अगला" : "Next"}: {s.next ? `${s.next.title} · ${s.next.chapter}` : "✓"}</p>
                    <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-sky-700">{hi ? "अध्याय देखें" : "Chapters"}</summary>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      {s.chapters.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-[0.72rem]">
                          <span className="w-4 text-ink-3">{n(c.number)}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-2" title={c.title}>{c.title}</span>
                          <span className={cn("tabular-nums", c.done === c.total ? "text-sage" : "text-ink-3")}>{n(c.done)}/{n(c.total)}</span>
                        </div>
                      ))}
                    </div></details>
                  </Card>
                ))}
                <Card className="p-4">
                  <p className="font-medium">{hi ? "टेस्ट" : "Tests"}</p>
                  {d.tests.length === 0 ? <p className="mt-1 text-sm text-ink-3">—</p> : d.tests.map((t) => (
                    <div key={t.test_id} className="mt-2 flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{t.title} <span className="text-ink-3">· {t.subject}</span></span><span className={cn("font-semibold", pctTone(t.pct))}>{n(t.pct)}%</span></div>
                  ))}
                </Card>
                <Card className="p-4">
                  <p className="font-medium">{hi ? "गेम पॉइंट" : "Game points"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.games.length === 0 ? <span className="text-sm text-ink-3">—</span> : d.games.map((g) => <Badge key={g.subject} tone="sky">{g.subject}: {n(g.points)} pts{g.accuracy != null ? ` · ${n(g.accuracy)}%` : ""}</Badge>)}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="font-medium">{hi ? "डाउट" : "Doubts"}</p>
                  {d.doubts.length === 0 ? <p className="mt-1 text-sm text-ink-3">—</p> : d.doubts.map((x) => (
                    <button key={x.id} onClick={() => { router.push(`${user?.role === "admin" ? "/admin" : "/teacher"}?tab=doubts&thread=${x.id}`); onClose(); }} className="mt-2 flex w-full items-center gap-2 text-left text-sm hover:text-sky-700">
                      <span className="min-w-0 flex-1 truncate">{x.topic || x.subject}</span><Badge tone={x.status === "escalated" ? "amber" : x.status === "resolved" ? "neutral" : "sky"}>{x.status}</Badge>
                    </button>
                  ))}
                </Card>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------------ */
/* Tests                                                                    */
/* ------------------------------------------------------------------------ */

type Draft = { text: string; type: "mcq" | "msq"; options: string[]; answer: number[]; topic: string; marks: number };
const blank = (): Draft => ({ text: "", type: "mcq", options: ["", "", "", ""], answer: [], topic: "", marks: 1 });

export function TestsDesk() {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const [mode, setMode] = useState<"list" | "new" | string>("list");
  const q = useQuery({ queryKey: ["tests"], queryFn: api.tests });
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("test"); if (t) setMode(t); }, []);

  if (mode === "new") return <TestBuilder onDone={(id) => setMode(id ?? "list")} />;
  if (mode !== "list") return <TestReportView id={mode} onBack={() => setMode("list")} />;
  return (
    <div className="space-y-4">
      <Button onClick={() => setMode("new")} icon={<Plus className="h-4 w-4" />}>{hi ? "नया टेस्ट" : "New test"}</Button>
      {!q.data ? <Skeleton className="h-40 w-full" /> : q.data.tests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-3"><ClipboardList className="mx-auto mb-2 h-7 w-7" />{hi ? "अभी कोई टेस्ट नहीं।" : "No tests yet — create your first one."}</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {q.data.tests.map((t) => (
            <Card key={t.id} lift className="cursor-pointer p-5" onClick={() => setMode(t.id)}>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">{t.board} {t.grade} · {t.subject}</span>
              <p className="mt-2 font-display text-2xl text-ink">{t.title}</p>
              <p className="text-xs text-ink-3">{n(t.question_count)} Q · {n(t.duration_min)} min</p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span><strong>{n(t.attempts ?? 0)}</strong> {hi ? "ने दिया" : "attempted"}</span>
                {t.avg_pct != null && <span className={cn("font-semibold", pctTone(t.avg_pct))}>{hi ? "औसत" : "avg"} {n(t.avg_pct)}%</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TestBuilder({ onDone }: { onDone: (id?: string) => void }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const { user } = useAuth();
  const qc = useQueryClient();
  const teaching = user?.teaching ?? [];
  const combos = teaching.length ? teaching : [{ board: "CBSE" as Board, grade: "9", subject: "Mathematics" }];
  const [combo, setCombo] = useState<number | null>(null);
  // Default to the class where the teacher actually has the most students, and show counts.
  const roster = useQuery({ queryKey: ["teacher-roster"], queryFn: () => api.teacher.students({ scope: "subject", limit: 100 }) });
  const perClass = useMemo(() => {
    const m: Record<string, number> = {};
    for (const st of roster.data?.students ?? []) m[`${st.board}-${st.grade}`] = (m[`${st.board}-${st.grade}`] ?? 0) + 1;
    return m;
  }, [roster.data]);
  const busiest = combos.reduce((best, c, i) => ((perClass[`${c.board}-${c.grade}`] ?? 0) > (perClass[`${combos[best].board}-${combos[best].grade}`] ?? 0) ? i : best), 0);
  const active = combo ?? busiest;
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(20);
  const [due, setDue] = useState("");
  const [qs, setQs] = useState<Draft[]>([blank()]);
  const [saving, setSaving] = useState(false);
  const upd = (i: number, patch: Partial<Draft>) => setQs((a) => a.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const toggleAns = (i: number, o: number) => {
    const q = qs[i];
    upd(i, { answer: q.type === "mcq" ? [o] : q.answer.includes(o) ? q.answer.filter((x) => x !== o) : [...q.answer, o] });
  };
  const valid = title.trim().length >= 2 && qs.every((q) => q.text.trim().length >= 3 && q.options.filter((o) => o.trim()).length >= 2 && q.answer.length > 0);

  const save = async () => {
    const c = combos[active];
    setSaving(true);
    try {
      const questions = qs.map((q) => {
        const keep = q.options.map((o, k) => ({ o: o.trim(), k })).filter((x) => x.o);
        return { text: q.text.trim(), type: q.type, options: keep.map((x) => x.o), answer: q.answer.map((a) => keep.findIndex((x) => x.k === a)).filter((a) => a >= 0), topic: q.topic.trim(), marks: q.marks };
      });
      const t = await api.createTest({ board: c.board, grade: c.grade, subject: c.subject, title: title.trim(), duration_min: duration,
        due_at: due ? new Date(due).toISOString() : null, questions });
      toast.success(hi ? "टेस्ट प्रकाशित! छात्रों को सूचना भेजी गई।" : "Test published — students have been notified.");
      qc.invalidateQueries({ queryKey: ["tests"] });
      onDone(t.id);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => onDone()} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="h-4 w-4" />{hi ? "टेस्ट" : "Tests"}</button>
      <Card className="grid gap-3 p-5 md:grid-cols-[1fr_1.4fr_120px]">
        <Select value={active} onChange={(e) => setCombo(Number(e.target.value))}>
          {combos.map((c, i) => <option key={i} value={i}>{c.board} {c.grade} · {c.subject} — {perClass[`${c.board}-${c.grade}`] ?? 0} {hi ? "छात्र" : "students"}</option>)}
        </Select>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={hi ? "टेस्ट का नाम, जैसे अध्याय 3 क्विज़" : "Test title, e.g. Chapter 3 quiz"} />
        <Input type="number" min={2} max={180} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 20)} aria-label="minutes" title={hi ? "मिनट" : "Minutes"} />
        <label className="flex items-center gap-2 text-sm text-ink-2 md:col-span-3">
          <span className="shrink-0">{hi ? "लीडरबोर्ड बंद होने का समय (वैकल्पिक)" : "Closes at — leaderboard becomes final (optional)"}</span>
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 max-w-xs text-sm" />
        </label>
      </Card>
      {qs.map((q, i) => (
        <Card key={i} className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl">Q{i + 1}</span>
            <Tabs value={q.type} onChange={(v) => upd(i, { type: v, answer: v === "mcq" ? q.answer.slice(0, 1) : q.answer })} className="w-48" items={[{ value: "mcq", label: "MCQ" }, { value: "msq", label: "MSQ" }]} />
            <Input value={q.topic} onChange={(e) => upd(i, { topic: e.target.value })} placeholder={hi ? "टॉपिक" : "Topic"} className="h-10 flex-1 text-sm" />
            <Input type="number" min={0.5} max={10} step={0.5} value={q.marks} onChange={(e) => upd(i, { marks: Number(e.target.value) || 1 })} className="h-10 w-20 text-sm" aria-label="marks" />
            {qs.length > 1 && <button onClick={() => setQs((a) => a.filter((_, k) => k !== i))} className="grid h-10 w-10 place-items-center rounded-xl text-ink-3 hover:bg-rose-100 hover:text-rose" aria-label="delete"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <Textarea value={q.text} onChange={(e) => upd(i, { text: e.target.value })} placeholder={hi ? "प्रश्न लिखें" : "Write the question"} className="min-h-20" />
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <div key={k} className="flex items-center gap-2">
                <button type="button" onClick={() => toggleAns(i, k)} aria-label="correct"
                  className={cn("grid h-9 w-9 shrink-0 place-items-center border-2", q.type === "mcq" ? "rounded-full" : "rounded-lg", q.answer.includes(k) ? "border-sage bg-sage text-white" : "border-line-2 text-ink-3")}>
                  {q.answer.includes(k) ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + k)}
                </button>
                <Input value={o} onChange={(e) => upd(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} placeholder={`${hi ? "विकल्प" : "Option"} ${String.fromCharCode(65 + k)}`} className="h-10 text-sm" />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-3">{q.type === "mcq" ? (hi ? "एक सही उत्तर पर टैप करें" : "Tap the one correct answer") : (hi ? "सभी सही उत्तरों पर टैप करें (आंशिक अंक मिलते हैं)" : "Tap every correct answer (partial credit for a correct subset)")}</p>
        </Card>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setQs((a) => [...a, blank()])} icon={<Plus className="h-4 w-4" />}>{hi ? "प्रश्न जोड़ें" : "Add question"}</Button>
        <Button onClick={() => void save()} disabled={!valid || saving} icon={<Check className="h-4 w-4" />}>{hi ? "प्रकाशित करें" : "Publish test"}</Button>
      </div>
    </div>
  );
}

function TestReportView({ id, onBack }: { id: string; onBack: () => void }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"students" | "questions" | "board">("students");
  const q = useQuery({ queryKey: ["teacher-test-report", id], queryFn: () => api.testReport<TeacherTestReport>(id), refetchInterval: 15000 });
  const lb = useQuery({ queryKey: ["test-board", id], queryFn: () => api.testLeaderboard(id), enabled: tab === "board" });
  const r = q.data;
  const remove = async () => {
    if (!confirm(hi ? "यह टेस्ट हटाएँ?" : "Delete this test and all its results?")) return;
    await api.deleteTest(id).catch((e) => toast.error(e.message));
    qc.invalidateQueries({ queryKey: ["tests"] });
    onBack();
  };
  if (!r) return <Skeleton className="h-64 w-full" />;
  const bands = [hi ? "<40%" : "<40%", "40–59%", "60–79%", "80%+"];
  const maxBand = Math.max(1, ...r.class.distribution);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="h-4 w-4" />{hi ? "टेस्ट" : "Tests"}</button>
        <button onClick={() => void remove()} className="ml-auto inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-rose"><Trash2 className="h-4 w-4" />{hi ? "हटाएँ" : "Delete"}</button>
      </div>
      <Card className="flex flex-wrap items-center gap-6 p-5">
        <Ring value={r.class.avg_pct} size={96} stroke={9} label={<span className="font-display text-2xl">{n(r.class.avg_pct)}%</span>} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{r.test.board} {r.test.grade} · {r.test.subject}</p>
          <p className="font-display text-3xl">{r.test.title}</p>
          <p className="text-sm text-ink-2">{n(r.class.attempts)} {hi ? "ने दिया" : "attempted"} · {hi ? "सर्वोच्च" : "top"} {n(r.class.top_pct)}% · {n(r.not_attempted.length)} {hi ? "बाकी" : "pending"}</p>
        </div>
        <div className="flex h-24 items-end gap-2">
          {r.class.distribution.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-ink-3">{n(v)}</span>
              <motion.span initial={{ height: 0 }} animate={{ height: `${(v / maxBand) * 64 + 4}px` }} transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
                className={cn("w-8 rounded-t-lg", ["bg-rose", "bg-marigold-400", "bg-sky-500", "bg-sage"][i])} />
              <span className="text-[0.62rem] text-ink-3">{bands[i]}</span>
            </div>
          ))}
        </div>
      </Card>

      {(r.needs_help.length > 0 || r.topics.some((t) => t.pct < 50)) && (
        <Card className="border-rose/30 bg-rose-100/40 p-4">
          <p className="flex items-center gap-2 font-medium text-ink"><AlertTriangle className="h-4 w-4 text-rose" />{hi ? "ध्यान दें" : "Where to step in"}</p>
          {r.needs_help.length > 0 && <p className="mt-1 text-sm">{hi ? "40% से कम:" : "Below 40%:"} <strong>{r.needs_help.map((s) => s.full_name).join(", ")}</strong></p>}
          {r.topics.filter((t) => t.pct < 50).length > 0 && <p className="mt-1 text-sm">{hi ? "कक्षा के कमज़ोर टॉपिक:" : "Class-wide weak topics:"} <strong>{r.topics.filter((t) => t.pct < 50).map((t) => `${t.topic} (${t.pct}%)`).join(", ")}</strong></p>}
        </Card>
      )}

      <Tabs value={tab} onChange={setTab} className="max-w-md" items={[
        { value: "students", label: hi ? "छात्र" : "Students" }, { value: "questions", label: hi ? "प्रश्न" : "Questions" }, { value: "board", label: <><Trophy className="h-3.5 w-3.5" />{hi ? "लीडरबोर्ड" : "Leaderboard"}</> },
      ]} />
      {tab === "students" && (
        <div className="space-y-2">
          {r.students.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="w-7 text-center font-semibold text-ink-3">#{n(s.rank)}</span>
              <Avatar user={s} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.full_name}</span>
                <span className="block truncate text-xs text-ink-3">
                  {s.weak_topics.length ? `${hi ? "कमज़ोर" : "Weak"}: ${s.weak_topics.join(", ")}` : s.strong_topics.length ? `${hi ? "मज़बूत" : "Strong"}: ${s.strong_topics.join(", ")}` : ""}
                </span>
              </span>
              <span className="text-xs text-ink-3">{n(Math.round((s.time_taken_sec ?? 0) / 60))} min</span>
              <span className={cn("w-14 text-right font-semibold", pctTone(s.pct))}>{n(s.pct ?? 0)}%</span>
            </Card>
          ))}
          {r.not_attempted.length > 0 && <p className="pt-2 text-sm text-ink-3">{hi ? "अभी नहीं दिया" : "Not attempted yet"}: {r.not_attempted.join(", ")}</p>}
        </div>
      )}
      {tab === "questions" && (
        <div className="space-y-2">
          {r.questions.map((x, i) => (
            <Card key={x.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="font-display text-xl text-ink-3">Q{n(i + 1)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{x.text}</p>
                  <p className="text-xs text-ink-3">{x.topic}{x.common_wrong.length ? ` · ${hi ? "आम गलती" : "common wrong pick"}: “${x.common_wrong[0][0]}” (${n(x.common_wrong[0][1])})` : ""}</p>
                  <Bar pct={x.correct_pct} className="mt-2 h-2" />
                </div>
                <span className={cn("font-semibold", pctTone(x.correct_pct))}>{n(x.correct_pct)}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {tab === "board" && <Card className="p-5">{lb.data ? <TestLeaderboard data={lb.data} /> : <Skeleton className="h-48" />}</Card>}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Admin: teacher directory                                                 */
/* ------------------------------------------------------------------------ */

export function TeachersDirectory() {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["teacher-dir"], queryFn: api.teacher.directory });
  if (!q.data) return <Skeleton className="h-48 w-full" />;
  if (!q.data.teachers.length) return <Card className="p-8 text-center text-sm text-ink-3">{hi ? "अभी कोई शिक्षक नहीं।" : "No teachers yet. They sign up from the staff page with the access code."}</Card>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {q.data.teachers.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-center gap-3">
            <Avatar user={t} size={40} />
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{t.full_name}</p><p className="truncate text-xs text-ink-3">{t.email}</p></div>
            <div className="text-right text-xs text-ink-3"><p><strong className="text-ink">{n(t.students)}</strong> {hi ? "छात्र" : "students"}</p><p><strong className="text-ink">{n(t.mentees)}</strong> {hi ? "मेंटी" : "mentees"}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {t.teaching.map((x) => <Badge key={`${x.board}${x.grade}${x.subject}`} tone="sky">{x.board} {x.grade} · {x.subject}</Badge>)}
            {t.class_teacher_of.map((c) => <Badge key={c} tone="marigold">{hi ? "कक्षा शिक्षक" : "Class teacher"} {c}</Badge>)}
          </div>
        </Card>
      ))}
    </div>
  );
}
