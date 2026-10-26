"use client";

import { RotateCcw } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { SpacedReview } from "@/components/lesson/spaced-review";

export default function RefreshPage() {
  const { lang } = useI18n();
  const hi = lang === "hi";
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-10 lg:py-10">
      <h1 className="flex items-center gap-3 font-display text-5xl text-ink sm:text-6xl"><RotateCcw className="h-9 w-9 text-marigold-600" />{hi ? "दोहराई" : "Refresh"}</h1>
      <p className="mt-2 text-ink-2">{hi ? "अवधारणाएँ भूलने से ठीक पहले लौटती हैं। हर एक पर दो छोटे प्रश्न।" : "Concepts come back just before you'd forget them. Two quick questions each."}</p>
      <SpacedReview />
    </div>
  );
}
