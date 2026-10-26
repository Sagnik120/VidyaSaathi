"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Compass, Flag, GraduationCap, Loader2, RotateCcw, Target, Trophy } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { Skeleton } from "@/components/ui/primitives";
import { COURSE_GOAL, useSkillGoal } from "@/components/lesson/skill-map";
import { stepHref } from "@/components/lesson/path-progress";
import { EASE } from "@/lib/utils";

// "Just explore" is a per-browser preference, not learning state.
const EXPLORE_KEY = "shikshak.exploreFreely";
const readExplore = () => { try { return localStorage.getItem(EXPLORE_KEY) === "1"; } catch { return false; } };
const writeExplore = (v: boolean) => { try { if (v) localStorage.setItem(EXPLORE_KEY, "1"); else localStorage.removeItem(EXPLORE_KEY); } catch { /* storage blocked */ } };

const TXT = {
  en: {
    ask: "How do you want to learn?", askSub: "You can change this any time.",
    zero: "Learn AI from zero", zeroSub: "A complete course, foundations to frontier, skipping what you know.",
    topic: "Reach a specific topic", topicSub: "Pick a goal like Transformers or Mamba. We route you there.",
    explore: "Just explore", exploreSub: "Learn any topic freely. Your map still tracks progress.",
    exploring: "Exploring freely.", setGoal: "Set a learning goal",
    goal: "Your goal", next: "Next step", cont: "Continue", change: "Change goal", reached: "Goal reached!", pick: "Pick a new goal",
    of: "{d} of {t} concepts mastered",
  },
  hi: {
    ask: "आप कैसे सीखना चाहते हैं?", askSub: "इसे कभी भी बदल सकते हैं।",
    zero: "शुरू से AI सीखें", zeroSub: "बुनियाद से नवीनतम तक पूरा कोर्स, जो आप जानते हैं उसे छोड़कर।",
    topic: "किसी खास विषय तक पहुँचें", topicSub: "Transformers या Mamba जैसा लक्ष्य चुनें, हम रास्ता बनाएँगे।",
    explore: "बस खोजें", exploreSub: "कोई भी विषय खुलकर सीखें। आपका मैप प्रगति दर्ज करता रहेगा।",
    exploring: "आप खुलकर सीख रहे हैं।", setGoal: "सीखने का लक्ष्य चुनें",
    goal: "आपका लक्ष्य", next: "अगला कदम", cont: "जारी रखें", change: "लक्ष्य बदलें", reached: "लक्ष्य पूरा!", pick: "नया लक्ष्य चुनें",
    of: "{t} में से {d} अवधारणाओं में महारत",
  },
};

export function GoalCard() {
  const { lang, n } = useI18n();
  const tx = TXT[lang === "hi" ? "hi" : "en"];
  const { q, data, setGoal, saving } = useSkillGoal();
  const [explore, setExplore] = useState(false);
  useEffect(() => { setExplore(readExplore()); }, []);

  if (q.isLoading) return <Skeleton className="h-40 rounded-[28px]" />;
  if (!data) return null; // map unavailable: the rest of the home page still works

  const card = "@container rounded-[28px] border border-line bg-surface p-5 sm:p-6 shadow-[var(--shadow-soft)]";

  /* goal set: progress + next step */
  if (data.goal) {
    const next = data.route.find((s) => s.next) ?? data.route[0];
    const pct = data.scope_total ? (data.scope_done / data.scope_total) * 100 : 0;
    return (
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-700"><Flag className="h-3.5 w-3.5" />{tx.goal}</p>
            <h2 className="mt-1 line-clamp-2 break-words font-display text-2xl leading-tight text-ink [overflow-wrap:anywhere] @xl:text-3xl">{data.goal_title}</h2>
          </div>
          <Link href="/path#skill-map" className="text-sm text-ink-3 hover:text-ink">{tx.change}</Link>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-3">
          <motion.div className="h-full rounded-full bg-sky-500" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: EASE }} />
        </div>
        <p className="mt-1.5 text-xs text-ink-3">{tx.of.replace("{d}", n(data.scope_done)).replace("{t}", n(data.scope_total))}</p>

        {next ? (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-3">{tx.next}</p>
              <p className="line-clamp-2 break-words text-lg font-semibold leading-snug text-ink [overflow-wrap:anywhere]" title={next.title}>{next.title}</p>
              <p className="mt-1 line-clamp-3 break-words text-sm text-ink-2 [overflow-wrap:anywhere]" title={next.reason}>{next.reason}</p>
            </div>
            <Link href={stepHref(next, data.goal)} className="inline-flex w-full shrink-0 items-center justify-center gap-2 @md:w-auto rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
              {next.state === "practice" || next.state === "recap" ? <RotateCcw className="h-4 w-4" /> : null}{tx.cont}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sage-100 p-4">
            <p className="flex items-center gap-2 font-semibold text-ink"><Trophy className="h-5 w-5 text-marigold-600" />{tx.reached}</p>
            <Link href="/path#skill-map" className="text-sm font-medium text-sky-700 hover:underline">{tx.pick}</Link>
          </div>
        )}
      </motion.section>
    );
  }

  /* exploring freely: stay out of the way */
  if (explore) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <Compass className="h-4 w-4" />{tx.exploring}
        <button onClick={() => { writeExplore(false); setExplore(false); }} className="font-medium text-sky-700 hover:underline">{tx.setGoal}</button>
      </div>
    );
  }

  /* no goal yet: three ways to learn */
  const options = [
    { icon: <GraduationCap className="h-5 w-5" />, title: tx.zero, sub: tx.zeroSub, onClick: () => void setGoal(COURSE_GOAL) },
    { icon: <Target className="h-5 w-5" />, title: tx.topic, sub: tx.topicSub, href: "/path#skill-map" },
    { icon: <Compass className="h-5 w-5" />, title: tx.explore, sub: tx.exploreSub, onClick: () => { writeExplore(true); setExplore(true); } },
  ];
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className={card}>
      <h2 className="font-display text-3xl text-ink">{tx.ask}</h2>
      <p className="mt-1 text-sm text-ink-3">{tx.askSub}</p>
      <div className="mt-5 grid gap-3 @xl:grid-cols-3">
        {options.map((o, i) => {
          const inner = (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600">{saving && i === 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : o.icon}</span>
              <p className="mt-3 font-semibold text-ink">{o.title}</p>
              <p className="mt-1 text-sm text-ink-2">{o.sub}</p>
            </>
          );
          const cls = "block rounded-2xl border border-line p-4 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/40";
          return o.href
            ? <Link key={o.title} href={o.href} className={cls}>{inner}</Link>
            : <button key={o.title} onClick={o.onClick} disabled={saving} className={cls}>{inner}</button>;
        })}
      </div>
    </motion.section>
  );
}
