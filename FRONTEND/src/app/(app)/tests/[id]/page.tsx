"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clock, Loader2, Target, Timer, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { StudentTestReport } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { LoadError } from "@/components/ui/load-error";
import { Button } from "@/components/ui/button";
import { Card, Ring, Skeleton, Tabs } from "@/components/ui/primitives";
import { TestLeaderboard } from "@/components/school/leaderboard";
import { cn, EASE } from "@/lib/utils";

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const test = useQuery({ queryKey: ["test", id], queryFn: () => api.test(id) });
  if (test.isError) return <div className="mx-auto max-w-3xl px-4 py-10"><LoadError error={test.error} onRetry={() => void test.refetch()} /></div>;
  if (!test.data) return <div className="mx-auto max-w-3xl px-4 py-10"><Skeleton className="h-64 w-full rounded-[var(--radius)]" /></div>;
  return test.data.attempt ? <Report id={id} /> : <Take id={id} />;
}

function Take({ id }: { id: string }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const qc = useQueryClient();
  const t = useQuery({ queryKey: ["test", id], queryFn: () => api.test(id) }).data!;
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [left, setLeft] = useState(t.duration_min * 60);
  const [busy, setBusy] = useState(false);
  const startAt = useRef(0);
  const qs = t.questions ?? [];
  const q = qs[i];

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.submitTest(id, answers, Math.round((Date.now() - startAt.current) / 1000));
      qc.setQueryData(["test-report", id], r);
      await qc.invalidateQueries({ queryKey: ["test", id] });
      qc.invalidateQueries({ queryKey: ["tests"] });
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  };
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; });

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => setLeft((s) => {
      if (s <= 1) { clearInterval(timer); void submitRef.current(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [started]);

  const pick = (opt: number) => setAnswers((a) => {
    const cur = a[q.id] ?? [];
    return { ...a, [q.id]: q.type === "mcq" ? [opt] : cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
  });

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/tests" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="h-4 w-4" />{hi ? "टेस्ट" : "Tests"}</Link>
        <Card className="mt-4 p-8 text-center">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{t.subject} · {t.board} {t.grade}</span>
          <h1 className="mt-3 font-display text-5xl text-ink">{t.title}</h1>
          <div className="mt-5 flex justify-center gap-6 text-sm text-ink-2">
            <span className="flex items-center gap-1.5"><Target className="h-4 w-4" />{n(qs.length)} {hi ? "प्रश्न" : "questions"}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{n(t.duration_min)} min</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4" />{n(t.max_score)} {hi ? "अंक" : "marks"}</span>
          </div>
          <p className="mt-4 text-sm text-ink-3">{hi ? "MCQ = एक सही उत्तर · MSQ = एक से ज़्यादा सही उत्तर। समय खत्म होते ही टेस्ट अपने आप जमा हो जाएगा।" : "MCQ = one right answer · MSQ = one or more right answers. The test submits itself when time runs out."}</p>
          <Button className="mt-6" size="lg" onClick={() => { startAt.current = Date.now(); setStarted(true); }} icon={<ArrowRight className="h-4 w-4" />}>{hi ? "शुरू करें" : "Begin"}</Button>
        </Card>
      </div>
    );
  }

  const answered = qs.filter((x) => (answers[x.id] ?? []).length).length;
  const mm = Math.floor(left / 60), ss = left % 60;
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <div className="sticky top-0 z-20 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur">
        <p className="min-w-0 flex-1 truncate font-medium">{t.title}</p>
        <span className="text-xs text-ink-3">{n(answered)}/{n(qs.length)}</span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums", left < 60 ? "animate-pulse bg-rose-100 text-rose" : "bg-paper-2 text-ink")}>
          <Timer className="h-4 w-4" />{n(mm)}:{n(String(ss).padStart(2, "0"))}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {qs.map((x, k) => (
          <button key={x.id} onClick={() => setI(k)} className={cn("h-8 w-8 rounded-lg text-xs font-semibold",
            k === i ? "bg-ink text-white" : (answers[x.id] ?? []).length ? "bg-sky-100 text-sky-700" : "bg-paper-2 text-ink-3")}>{n(k + 1)}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: EASE }}>
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{hi ? "प्रश्न" : "Question"} {n(i + 1)} · {q.type === "mcq" ? "MCQ" : (hi ? "MSQ — सभी सही चुनें" : "MSQ — pick all that apply")} · {n(q.marks)} {hi ? "अंक" : "marks"}</p>
            <p className="mt-2 text-lg font-medium text-ink">{q.text}</p>
            <div className="mt-5 space-y-2">
              {q.options.map((o, k) => {
                const on = (answers[q.id] ?? []).includes(k);
                return (
                  <motion.button key={k} whileTap={{ scale: 0.98 }} onClick={() => pick(k)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", on ? "border-sky-500 bg-sky-50" : "border-line hover:border-sky-300")}>
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center border-2 text-xs font-bold", q.type === "mcq" ? "rounded-full" : "rounded-md", on ? "border-sky-600 bg-sky-600 text-white" : "border-line-2 text-ink-3")}>
                      {on ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + k)}
                    </span>{o}
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between">
        <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>{hi ? "पिछला" : "Previous"}</Button>
        {i < qs.length - 1
          ? <Button onClick={() => setI(i + 1)} icon={<ArrowRight className="h-4 w-4" />}>{hi ? "अगला" : "Next"}</Button>
          : <Button variant="ink" onClick={() => void submit()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{hi ? "जमा करें" : "Submit test"}</Button>}
      </div>
    </div>
  );
}

function Report({ id }: { id: string }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const [tab, setTab] = useState<"report" | "board">("report");
  const r = useQuery({ queryKey: ["test-report", id], queryFn: () => api.testReport<StudentTestReport>(id) });
  const lb = useQuery({ queryKey: ["test-board", id], queryFn: () => api.testLeaderboard(id), enabled: tab === "board", refetchInterval: 15000 });
  const d = r.data;
  if (!d) return <div className="mx-auto max-w-3xl px-4 py-10"><Skeleton className="h-64 w-full rounded-[var(--radius)]" /></div>;
  const pct = d.test.attempt?.pct ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/tests" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"><ArrowLeft className="h-4 w-4" />{hi ? "टेस्ट" : "Tests"}</Link>
      <Card className="relative overflow-hidden p-6">
        <div className="flex flex-wrap items-center gap-6">
          <Ring value={pct} size={120} stroke={10} label={<span><span className="block font-display text-4xl">{n(pct)}%</span><span className="text-xs text-ink-3">{n(d.test.attempt?.score ?? 0)}/{n(d.test.max_score)}</span></span>} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{d.test.subject}</p>
            <h1 className="font-display text-4xl text-ink">{d.test.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: "spring" }}
                className="inline-flex items-center gap-1.5 rounded-full bg-marigold-50 px-3 py-1 font-semibold text-marigold-600"><Trophy className="h-4 w-4" />{hi ? "रैंक" : "Rank"} #{n(d.rank)} / {n(d.of)}</motion.span>
              <span className="rounded-full bg-paper-2 px-3 py-1">{hi ? "पर्सेंटाइल" : "Percentile"} {n(d.percentile)}</span>
              <span className="rounded-full bg-paper-2 px-3 py-1">{hi ? "कक्षा औसत" : "Class avg"} {n(d.class.avg_pct)}%</span>
              <span className="rounded-full bg-paper-2 px-3 py-1">{n(Math.round(d.time_taken_sec / 60))} min</span>
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab} className="max-w-sm" items={[{ value: "report", label: hi ? "रिपोर्ट" : "My report" }, { value: "board", label: hi ? "लीडरबोर्ड" : "Leaderboard" }]} />

      {tab === "board" ? (
        <Card className="p-5">{lb.isError ? <LoadError error={lb.error} onRetry={() => void lb.refetch()} /> : lb.data ? <TestLeaderboard data={lb.data} /> : <Skeleton className="h-48 w-full" />}</Card>
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <p className="font-display text-2xl">{hi ? "टॉपिक के अनुसार" : "By topic"}</p>
            <div className="mt-3 space-y-2.5">
              {d.topics.map((tp) => (
                <div key={tp.topic}>
                  <div className="flex justify-between text-sm"><span>{tp.topic}</span><span className="font-semibold">{n(tp.pct)}%</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-3">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${tp.pct}%` }} transition={{ duration: 0.8, ease: EASE }}
                      className={cn("h-full rounded-full", tp.pct >= 80 ? "bg-sage" : tp.pct >= 50 ? "bg-marigold-400" : "bg-rose")} />
                  </div>
                </div>
              ))}
            </div>
            {d.weak_topics.length > 0 && (
              <p className="mt-4 rounded-2xl bg-rose-100 p-3 text-sm text-ink">{hi ? "दोहराइए:" : "Revise next:"} <strong>{d.weak_topics.join(", ")}</strong>
                <Link href="/path" className="ml-2 font-medium text-sky-700 hover:underline">{hi ? "रास्ते पर जाएँ →" : "Open learning path →"}</Link></p>
            )}
          </Card>
          <div className="space-y-3">
            {d.questions.map((q, k) => (
              <Card key={q.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", q.correct ? "bg-sage text-white" : q.got > 0 ? "bg-marigold-400 text-ink" : "bg-rose text-white")}>
                    {q.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n(k + 1)}. {q.text}</p>
                    <p className="text-xs text-ink-3">{q.topic} · {n(q.got)}/{n(q.marks)}</p>
                    <ul className="mt-2 space-y-1">
                      {q.options.map((o, j) => {
                        const right = q.answer.includes(j), picked = q.picked.includes(j);
                        return (
                          <li key={j} className={cn("rounded-xl px-3 py-1.5 text-sm", right ? "bg-sage-100 text-sage" : picked ? "bg-rose-100 text-rose" : "text-ink-2")}>
                            {String.fromCharCode(65 + j)}. {o}{right && " ✓"}{picked && !right && (hi ? " (आपका उत्तर)" : " (your answer)")}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
