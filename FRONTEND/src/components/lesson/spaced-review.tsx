"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { ReviewResult, ReviewSet } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { Skeleton, Textarea } from "@/components/ui/primitives";
import { cn, EASE } from "@/lib/utils";

const TXT = {
  en: {
    card: "Time to refresh", cardSub: "{n} concepts are fading. A quick review keeps them.", start: "Review now",
    ago: "learned {d} days ago", title: "Refresh", sub: "Concepts come back just before you'd forget them. Two quick questions each.",
    none: "Nothing to refresh right now. Concepts you master come back here after a few days.",
    begin: "Start", check: "Check", passed: "Refreshed! Next review in {d} days.", failed: "That one has faded. It's back on your learning path to practise; next check in {d} days.",
    model: "Answer:", next: "Back to the list",
  },
  hi: {
    card: "दोहराने का समय", cardSub: "{n} अवधारणाएँ धुंधली हो रही हैं। एक छोटी दोहराई उन्हें ताज़ा रखेगी।", start: "अभी दोहराएँ",
    ago: "{d} दिन पहले सीखा", title: "दोहराई", sub: "अवधारणाएँ भूलने से ठीक पहले लौटती हैं। हर एक पर दो छोटे प्रश्न।",
    none: "अभी दोहराने को कुछ नहीं। जिनमें महारत होगी, वे कुछ दिनों बाद यहाँ लौटेंगी।",
    begin: "शुरू करें", check: "जाँचें", passed: "ताज़ा हो गया! अगली दोहराई {d} दिनों में।", failed: "यह धुंधला गया है। इसे आपके रास्ते पर अभ्यास के लिए वापस रखा गया; अगली जाँच {d} दिनों में।",
    model: "उत्तर:", next: "सूची पर वापस",
  },
};
const useTx = () => { const { lang } = useI18n(); return TXT[lang === "hi" ? "hi" : "en"]; };

/* Home-page nudge; renders nothing when nothing is due. */
export function ReviewDueCard() {
  const tx = useTx();
  const { n } = useI18n();
  const q = useQuery({ queryKey: ["spaced-review"], queryFn: api.reviewDue, refetchOnMount: "always" });
  const due = q.data?.due ?? [];
  if (!due.length) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}
      className="flex flex-wrap items-center gap-4 rounded-[24px] border border-marigold-200 bg-marigold-50 p-5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-marigold-600"><RotateCcw className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{tx.card}</p>
        <p className="text-sm text-ink-2">{tx.cardSub.replace("{n}", n(due.length))} <span className="text-ink-3">· {due.slice(0, 3).map((d) => d.title).join(", ")}</span></p>
      </div>
      <Link href="/refresh" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{tx.start}<ArrowRight className="h-4 w-4" /></Link>
    </motion.section>
  );
}

/* The /refresh page body. */
export function SpacedReview() {
  const tx = useTx();
  const { n } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["spaced-review"], queryFn: api.reviewDue, refetchOnMount: "always" });
  const [set, setSet] = useState<ReviewSet | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (cid: string) => {
    setOpening(cid);
    try { setSet(await api.reviewStart(cid)); } catch (e) { toast.error((e as Error).message); } finally { setOpening(null); }
  };
  const done = () => { setSet(null); qc.invalidateQueries({ queryKey: ["spaced-review"] }); qc.invalidateQueries({ queryKey: ["skill-map"] }); };

  if (set) return <ReviewRun set={set} onDone={done} />;
  if (q.isLoading) return <Skeleton className="mt-6 h-40 rounded-[24px]" />;
  const due = q.data?.due ?? [];
  if (!due.length) return <p className="mt-10 text-center text-ink-3">{tx.none}</p>;
  return (
    <ul className="mt-6 space-y-2">
      {due.map((d) => (
        <li key={d.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3">
          <RotateCcw className="h-4 w-4 shrink-0 text-marigold-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{d.title}</p>
            <p className="text-xs text-ink-3">{tx.ago.replace("{d}", n(d.days_since))}</p>
          </div>
          <button onClick={() => void open(d.id)} disabled={!!opening} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            {opening === d.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{tx.begin}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReviewRun({ set, onDone }: { set: ReviewSet; onDone: () => void }) {
  const tx = useTx();
  const { n } = useI18n();
  const [final, setFinal] = useState<ReviewResult | null>(null);
  return (
    <div className="mt-6 space-y-4">
      <h2 className="font-display text-3xl text-ink">{set.title}</h2>
      {set.questions.map((q, i) => <ReviewQuestion key={q.id} cid={set.id} q={q} i={i} onResult={(r) => r.finished && setFinal(r)} />)}
      {final && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-4", final.passed ? "bg-sage-100" : "bg-marigold-100")}>
          {final.passed ? <Check className="h-5 w-5 text-sage" /> : <RotateCcw className="h-5 w-5 text-marigold-600" />}
          <p className="min-w-0 flex-1 text-sm text-ink">{(final.passed ? tx.passed : tx.failed).replace("{d}", n(final.next_in_days ?? 0))}</p>
          <button onClick={onDone} className="text-sm font-medium text-sky-700 hover:underline">{tx.next}</button>
        </motion.div>
      )}
    </div>
  );
}

function ReviewQuestion({ cid, q, i, onResult }: { cid: string; q: ReviewSet["questions"][number]; i: number; onResult: (r: ReviewResult) => void }) {
  const tx = useTx();
  const { n } = useI18n();
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ReviewResult | null>(null);
  const mcq = q.options.length > 0;
  const submit = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    try { const r = await api.reviewAnswer(cid, q.id, value); setRes(r); onResult(r); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-lg font-medium text-ink"><span className="mr-2 font-display text-sky-600">{n(i + 1)}</span>{q.question_text}</p>
      {mcq ? (
        <div className="mt-3 grid gap-2">
          {q.options.map((o) => (
            <button key={o} disabled={!!res || busy} onClick={() => { setAns(o); void submit(o); }}
              className={cn("rounded-xl border px-4 py-2.5 text-left text-sm", ans === o ? "border-sky-500 bg-sky-50" : "border-line hover:border-sky-300")}>{o}</button>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea value={ans} onChange={(e) => setAns(e.target.value)} disabled={!!res} rows={3} />
          {!res && <button onClick={() => void submit(ans)} disabled={busy || !ans.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{tx.check}</button>}
        </div>
      )}
      {res && (
        <div className={cn("mt-3 flex gap-2 rounded-xl p-3 text-sm", res.correct ? "bg-sage-100" : "bg-marigold-100")}>
          {res.correct ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-marigold-600" />}
          <p className="text-ink">{res.feedback_text}{!res.correct && <> <span className="text-ink-3">{tx.model}</span> {res.model_answer}</>}</p>
        </div>
      )}
    </div>
  );
}
