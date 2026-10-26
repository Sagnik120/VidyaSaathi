"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, GraduationCap, Trophy } from "lucide-react";
import { api } from "@/core/api";
import { useI18n } from "@/providers/i18n";
import { Card, Ring } from "@/components/ui/primitives";
import { findTopic, lessonHref } from "@/lib/syllabus";
import { EASE } from "@/lib/utils";

/** Dashboard: where the student is in their board syllabus, with one-tap "continue" per subject. */
export function SyllabusCard() {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["syllabus"], queryFn: api.syllabus });
  const p = q.data;
  if (!p) return null;
  if (!p.configured) {
    return (
      <Link href="/profile#details" className="flex items-center gap-3 rounded-[24px] border border-sky-200 bg-sky-50/60 p-5 hover:border-sky-400">
        <GraduationCap className="h-6 w-6 text-sky-600" />
        <span className="flex-1 font-medium">{hi ? "अपना बोर्ड और कक्षा चुनें — आपका सिलेबस रास्ता तैयार हो जाएगा" : "Choose your board and class — your syllabus path appears instantly"}</span>
        <ArrowRight className="h-4 w-4 text-sky-700" />
      </Link>
    );
  }
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Ring value={p.pct ?? 0} size={64} stroke={6} label={<span className="text-sm font-semibold">{n(p.pct ?? 0)}%</span>} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{p.board} · {hi ? "कक्षा" : "Class"} {n(p.grade ?? "")}</p>
          <p className="font-display text-3xl text-ink">{hi ? "आपका सिलेबस" : "Your syllabus"}</p>
        </div>
        <Link href="/path" className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline">{hi ? "पूरा रास्ता" : "Full path"}<ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {p.subjects.map((s, i) => {
          const f = findTopic(s, s.next?.id);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-paper/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-sky-600"><BookOpen className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">{s.name}<span className="text-xs font-normal text-ink-3">{n(s.pct)}%</span></span>
                <span className="block truncate text-xs text-ink-3">{f ? f.t.title : (hi ? "विषय पूरा!" : "Subject complete!")}</span>
              </span>
              {f ? (
                <Link href={lessonHref(p, s, f.c, f.t)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-600 text-white hover:bg-sky-700" aria-label={hi ? "जारी रखें" : "Continue"}><ArrowRight className="h-4 w-4" /></Link>
              ) : <Trophy className="h-5 w-5 text-marigold-600" />}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

/** Lesson report: the next topic after this one in the same subject. */
export function SyllabusNextCard({ topicId }: { topicId?: string | null }) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["syllabus"], queryFn: api.syllabus, enabled: !!topicId, refetchOnMount: "always" });
  const p = q.data;
  if (!topicId || !p) return null;
  const s = p.subjects.find((x) => findTopic(x, topicId));
  const f = s ? findTopic(s, s.next?.id) : null;
  if (!s) return null;
  return (
    <div className="rounded-3xl border border-sky-200 bg-sky-50/50 p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700"><GraduationCap className="h-3.5 w-3.5" />{s.name} · {hi ? "अगला टॉपिक" : "Next in your syllabus"}</p>
      {f ? (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-2xl text-ink">{f.t.title}</p>
            <p className="text-sm text-ink-2">{hi ? "अध्याय" : "Chapter"} {f.c.number} · {f.c.title}</p>
          </div>
          <Link href={lessonHref(p, s, f.c, f.t)} className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">{hi ? "शुरू करें" : "Start"}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : <p className="mt-3 flex items-center gap-2 font-display text-2xl"><Trophy className="h-5 w-5 text-marigold-600" />{hi ? "विषय पूरा!" : "Subject complete!"}</p>}
    </div>
  );
}
