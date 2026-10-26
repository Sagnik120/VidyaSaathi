"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, ClipboardList, Clock, Trophy } from "lucide-react";
import { api } from "@/core/api";
import { useI18n } from "@/providers/i18n";
import { LoadError } from "@/components/ui/load-error";
import { Card, Skeleton } from "@/components/ui/primitives";
import { ClassTestLeaderboard } from "@/components/school/leaderboard";
import { cn, EASE } from "@/lib/utils";

export default function TestsPage() {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const tests = useQuery({ queryKey: ["tests"], queryFn: api.tests });
  const [subject, setSubject] = useState<string | undefined>(undefined);
  const board = useQuery({ queryKey: ["class-test-board", subject], queryFn: () => api.testsClassLeaderboard(subject) });
  const list = tests.data?.tests ?? [];
  const subjects = [...new Set(list.map((t) => t.subject))];
  const pending = list.filter((t) => !t.attempt);
  const done = list.filter((t) => t.attempt);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="pb-2">
        <h1 className="font-display text-5xl text-ink sm:text-6xl">{hi ? "टेस्ट" : "Tests"}</h1>
        <p className="mt-2 text-ink-2">{hi ? "आपके शिक्षकों के टेस्ट, आपकी कक्षा की लीडरबोर्ड, और हर टेस्ट की पूरी रिपोर्ट।" : "Tests from your teachers, your class leaderboard, and a full report after every test."}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          {tests.isError && <LoadError error={tests.error} onRetry={() => void tests.refetch()} />}
          {tests.isLoading && <Skeleton className="h-40 w-full rounded-[var(--radius)]" />}
          {!tests.isLoading && !tests.isError && list.length === 0 && (
            <Card className="flex flex-col items-center gap-2 p-10 text-center text-ink-3">
              <ClipboardList className="h-8 w-8" />{hi ? "अभी कोई टेस्ट नहीं। जब आपके शिक्षक टेस्ट बनाएँगे, आपको सूचना मिलेगी।" : "No tests yet. You'll get a notification when your teacher posts one."}
            </Card>
          )}
          {pending.length > 0 && <h2 className="font-display text-3xl">{hi ? "देने बाकी" : "To take"}</h2>}
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
                <Link href={`/tests/${t.id}`}>
                  <Card lift className="flex h-full flex-col p-5">
                    <span className="w-fit rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">{t.subject}</span>
                    <p className="mt-2 font-display text-2xl text-ink">{t.title}</p>
                    <p className="mt-1 flex items-center gap-3 text-xs text-ink-3"><span>{n(t.question_count)} {hi ? "प्रश्न" : "questions"}</span><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{n(t.duration_min)} min</span></p>
                    {t.teacher && <p className="mt-1 text-xs text-ink-3">{hi ? "द्वारा" : "by"} {t.teacher.full_name}</p>}
                    <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white">{hi ? "शुरू करें" : "Start test"}<ArrowRight className="h-3.5 w-3.5" /></span>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
          {done.length > 0 && <h2 className="font-display text-3xl">{hi ? "दिए गए" : "Completed"}</h2>}
          <div className="space-y-2">
            {done.map((t) => (
              <Link key={t.id} href={`/tests/${t.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-sky-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-sage" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.title}</span><span className="text-xs text-ink-3">{t.subject}</span></span>
                <span className={cn("rounded-full px-2.5 py-1 text-sm font-semibold", (t.attempt?.pct ?? 0) >= 75 ? "bg-sage-100 text-sage" : (t.attempt?.pct ?? 0) >= 40 ? "bg-marigold-50 text-marigold-600" : "bg-rose-100 text-rose")}>{n(t.attempt?.pct ?? 0)}%</span>
                <ArrowRight className="h-4 w-4 text-ink-3" />
              </Link>
            ))}
          </div>
        </section>

        <Card className="p-5 lg:sticky lg:top-6">
          <p className="flex items-center gap-2 font-display text-2xl"><Trophy className="h-5 w-5 text-marigold-600" />{hi ? "टेस्ट लीडरबोर्ड" : "Test leaderboard"}</p>
          <p className="text-xs text-ink-3">{hi ? "सिर्फ़ आपकी कक्षा · टेस्ट का औसत · गेम की लीग अलग है" : "Only your class · average test score · games have their own league"}</p>
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
            {[undefined, ...subjects].map((s) => (
              <button key={s ?? "all"} onClick={() => setSubject(s)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs", subject === s ? "border-sky-400 bg-sky-50 text-sky-700" : "border-line text-ink-3")}>{s ?? (hi ? "सभी" : "All")}</button>
            ))}
          </div>
          {board.isError ? <LoadError className="mt-4" error={board.error} onRetry={() => void board.refetch()} /> : board.data ? <ClassTestLeaderboard rows={board.data.rows} /> : <Skeleton className="mt-4 h-48 w-full" />}
        </Card>
      </div>
    </div>
  );
}
