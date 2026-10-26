"use client";

import { useI18n } from "@/providers/i18n";
import { DoubtInbox } from "@/components/school/doubt-inbox";

export default function DoubtsPage() {
  const { lang } = useI18n();
  const hi = lang === "hi";
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="pb-2">
        <h1 className="font-display text-5xl text-ink sm:text-6xl">{hi ? "डाउट और चैट" : "Doubts & chat"}</h1>
        <p className="mt-2 text-ink-2">{hi ? "साथी के जवाब, आपके शिक्षकों के नोट्स, वीडियो और लाइव क्लास — सब एक जगह।" : "Saathi's answers, and your teachers' notes, videos and live classes — all in one place."}</p>
      </header>
      <DoubtInbox />
    </div>
  );
}
