"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flag, RotateCcw, Trophy } from "lucide-react";
import { api } from "@/core/api";
import type { SkillStep } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { cn } from "@/lib/utils";

/* Link that starts a lesson as a step on the learner's route. */
export const stepHref = (s: Pick<SkillStep, "id" | "title"> & { state: string }, goal: string) =>
  `/new?topic=${encodeURIComponent(s.title)}&concept=${s.id}&goal=${goal}${s.state === "practice" ? "&level=beginner" : ""}`;

function usePath(lessonId: string) {
  const lesson = useQuery({ queryKey: ["lesson", lessonId], queryFn: () => api.getLesson(lessonId), enabled: !!lessonId });
  const goal = lesson.data?.skill_goal_id ?? null;
  const map = useQuery({ queryKey: ["skill-map", goal], queryFn: () => api.skillMap(goal), enabled: !!goal, refetchOnMount: "always" });  // scores just changed
  const goalTitle = map.data?.concepts.find((c) => c.id === goal)?.title;
  return { goal, goalTitle, route: map.data?.route, concept: lesson.data?.skill_concept_id };
}

/* Small "→ Mamba · 12 steps left" marker for the classroom header. */
export function PathChip({ lessonId, className }: { lessonId: string; className?: string }) {
  const { lang, n } = useI18n();
  const { goal, goalTitle, route } = usePath(lessonId);
  if (!goal || !goalTitle || !route) return null;
  return (
    <span className={cn("hidden max-w-[16rem] items-center gap-1.5 truncate rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 lg:inline-flex", className)}
      title={goalTitle}>
      <Flag className="h-3 w-3 shrink-0" />
      <span className="truncate">{goalTitle} · {lang === "hi" ? `${n(route.length)} कदम बाकी` : `${n(route.length)} steps left`}</span>
    </span>
  );
}

/* End-of-lesson card: the next step on the route, re-planned from this result. */
export function PathNextCard({ lessonId }: { lessonId: string }) {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const { goal, goalTitle, route, concept } = usePath(lessonId);
  if (!goal || !goalTitle || !route) return null;
  const next = route.find((s) => s.next) ?? route[0];
  const retry = next && next.id === concept;

  return (
    <div className="rounded-3xl border border-sky-200 bg-sky-50/50 p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700">
        <Flag className="h-3.5 w-3.5" />{hi ? "आपका रास्ता" : "Your route"} · {goalTitle}
      </p>
      {!next ? (
        <p className="mt-3 flex items-center gap-2 font-display text-2xl text-ink"><Trophy className="h-5 w-5 text-marigold-600" />{hi ? "लक्ष्य पूरा!" : "Goal reached!"}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-3">{retry ? (hi ? "एक और कोशिश" : "One more try") : (hi ? "अगला कदम" : "Next step")} · {hi ? `${n(route.length)} कदम बाकी` : `${n(route.length)} steps left`}</p>
            <p className="truncate font-display text-2xl text-ink">{next.title}</p>
            <p className="mt-0.5 text-sm text-ink-2">{next.reason}</p>
          </div>
          <Link href={stepHref(next, goal)} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
            {retry || next.state === "recap" ? <RotateCcw className="h-4 w-4" /> : null}
            {hi ? "जारी रखें" : "Continue"}<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
