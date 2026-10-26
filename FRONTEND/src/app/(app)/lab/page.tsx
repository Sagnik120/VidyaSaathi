"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { FlaskConical, Gamepad2, Trophy } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { Skeleton } from "@/components/ui/primitives";
import { cn, EASE } from "@/lib/utils";

// Each tab is its own chunk, loaded only when shown.
const SimsTab = dynamic(() => import("@/components/lab/sims-tab").then((m) => m.SimsTab), { loading: () => <Skeleton className="h-96 w-full rounded-[var(--radius)]" /> });
const Games = dynamic(() => import("@/components/lab/games").then((m) => m.Games), { loading: () => <Skeleton className="h-96 w-full rounded-[var(--radius)]" /> });

type Tab = "sim" | "games";

export default function LabPage() {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [tab, setTab] = useState<Tab>("sim");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("tab") === "games") setTab("games"); }, []);
  const go = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "games" ? "/lab?tab=games" : "/lab");
  };
  const tabs: Array<{ id: Tab; icon: React.ReactNode; label: string }> = [
    { id: "sim", icon: <FlaskConical className="h-4 w-4" />, label: hi ? "सिमुलेशन" : "Simulations" },
    { id: "games", icon: <Gamepad2 className="h-4 w-4" />, label: hi ? "गेम" : "Games" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="flex items-center gap-3 font-display text-5xl text-ink sm:text-6xl"><FlaskConical className="h-9 w-9 text-sky-600" />{hi ? "प्रैक्टिस लैब" : "Practice Lab"}</h1>
          <p className="mt-2 text-ink-2">{hi ? "करके सीखें: अनुमान लगाइए, खेलिए, फिर देखिए क्यों — आपकी कक्षा और विषय के लिए।" : "Learn by doing: predict, play, then see why — for your class and subjects."}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-2">
          <Trophy className="h-4 w-4 text-marigold-600" />
          {hi ? "सिमुलेशन · ज्ञान यात्रा · आर्केड" : "Simulations · Gyaan Yatra · Arcade"}
        </span>
      </header>

      <div className="inline-flex rounded-2xl border border-line bg-paper-2 p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => go(t.id)} className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
            {tab === t.id && <motion.span layoutId="lab-tab" className="absolute inset-0 rounded-xl bg-surface shadow-[var(--shadow-soft)]" transition={{ ease: EASE, duration: 0.3 }} />}
            <span className={cn("relative flex items-center gap-2", tab === t.id ? "text-ink" : "text-ink-3")}>{t.icon}{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "games" ? <Games /> : <SimsTab />}
    </div>
  );
}
