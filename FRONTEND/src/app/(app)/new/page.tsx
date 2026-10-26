"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, CheckCircle2, FileText, PauseCircle, Pencil, Sparkles, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/core/api";
import type { DocumentInfo } from "@/core/types";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import type { MessageKey } from "@/core/i18n";
import { Button, type ButtonStatus } from "@/components/ui/button";
import { Badge, Card, Input, Label, Tabs } from "@/components/ui/primitives";
import { GlassSlider } from "@/components/ui/glass-slider";
import { PlanBuilding, UploadProgress } from "@/components/lesson/processing";
import { errText } from "@/components/auth/auth-kit";
import { cn, EASE } from "@/lib/utils";

type Source = "topic" | "doc";
type PlanNode = { concept: string; depth?: string; est_minutes?: number; checkpoint_question?: boolean; visual_type?: string };
const STOPS = [5, 10, 15, 25, 40];
const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STYLES: Array<[string, MessageKey]> = [["visual", "new.styleVisual"], ["analogy", "new.styleAnalogy"], ["exam", "new.styleExam"], ["step", "new.styleStep"]];

export default function NewLessonPage() {
  const { t, n, lang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [source, setSource] = useState<Source>("topic");
  const [topic, setTopic] = useState("");
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [level, setLevel] = useState<string>(user?.preferred_level || "beginner");
  const [language, setLanguage] = useState<string>(user?.preferred_language === "hi" ? "hi" : lang);
  const [budget, setBudget] = useState<number>(STOPS.includes(user?.default_time_budget_min ?? 0) ? user!.default_time_budget_min : 15);
  const [style, setStyle] = useState<string | null>(null);
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const [plan, setPlan] = useState<{ id: string; nodes: PlanNode[] } | null>(null);
  // Prefill from the skill map (/new?topic=…&level=…&concept=…&goal=…).
  const [path, setPath] = useState<{ concept: string; goal: string } | null>(null);
  // Prefill from the syllabus path (/new?topic=…&syllabus=<topic id>&where=…).
  const [syllabus, setSyllabus] = useState<{ id: string; where: string } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tp = p.get("topic"), lv = p.get("level");
    const concept = p.get("concept"), goal = p.get("goal");
    if (concept && goal) setPath({ concept, goal });
    const sid = p.get("syllabus");
    if (sid) setSyllabus({ id: sid, where: p.get("where") || "" });
    if (tp) { setSource("topic"); setTopic(tp); }
    if (lv && (LEVELS as readonly string[]).includes(lv)) setLevel(lv);
  }, []);

  const ready = source === "topic" ? topic.trim().length >= 2 : !!doc;

  const build = async () => {
    if (!ready) return toast.error(t("new.needTopic"));
    setStatus("loading");
    let id: string | null = null;
    try {
      const created = await api.createLesson({
        topic: source === "topic" ? topic.trim() : null,
        document_id: source === "doc" ? doc!.document_id : null,
        level, language, time_budget_min: budget, style,
        // Only while the topic is still the one the map filled in.
        ...(path && source === "topic" ? { skill_concept_id: path.concept, skill_goal_id: path.goal } : {}),
        ...(syllabus && source === "topic" ? { syllabus_topic_id: syllabus.id } : {}),
      });
      id = created.lesson_id;
      const r = await api.generatePlan(id);
      setPlan({ id, nodes: (r.plan?.nodes ?? []) as PlanNode[] });
      setStatus("idle");
      qc.invalidateQueries({ queryKey: ["lessons"] });
    } catch (e) {
      setStatus("idle");
      toast.error(errText(e, t("common.error")));
      // Don't leave an empty lesson in the learner's history.
      if (id) api.deleteLesson(id).catch(() => {});
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-10">
      <AnimatePresence mode="wait">
        {!plan ? (
          <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: EASE }}>
            <h1 className="font-display text-5xl text-ink sm:text-6xl">{t("new.title")}</h1>
            <p className="mt-2 max-w-xl text-ink-2">{t("new.sub")}</p>
            {syllabus && source === "topic" && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-700">
                <BookOpen className="h-3.5 w-3.5" />{lang === "hi" ? "आपके सिलेबस से" : "From your syllabus"}{syllabus.where ? ` · ${syllabus.where}` : ""}
              </p>
            )}
            {path && source === "topic" && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />{lang === "hi" ? "आपके रास्ते का एक कदम: यह पाठ आपकी प्रगति के अनुसार बनेगा" : "A step on your route: this lesson is tailored to what you already know"}
              </p>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <Card className="p-6">
                <Tabs<Source> value={source} onChange={setSource} items={[
                  { value: "topic", label: <><Sparkles className="h-4 w-4" />{t("new.fromTopic")}</> },
                  { value: "doc", label: <><FileText className="h-4 w-4" />{t("new.fromDoc")}</> },
                ]} />
                <div className="mt-6 min-h-[260px]">
                  <AnimatePresence mode="wait" initial={false}>
                    {source === "topic" ? (
                      <motion.div key="t" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }}>
                        <Label htmlFor="topic">{t("new.topicLabel")}</Label>
                        <Input id="topic" value={topic} onChange={(e) => { setTopic(e.target.value); setPath(null); setSyllabus(null); }} placeholder={t("new.topicPlaceholder")} maxLength={500} className="h-14 text-lg" autoFocus
                          onKeyDown={(e) => e.key === "Enter" && void build()} />
                        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-ink-3">{t("new.suggestions")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(["new.sug1", "new.sug2", "new.sug3", "new.sug4"] as MessageKey[]).map((k) => (
                            <button key={k} type="button" onClick={() => setTopic(t(k))}
                              className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-2 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:text-ink">{t(k)}</button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="d" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                        <DocPicker doc={doc} onDoc={setDoc} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>

              <Card className="space-y-6 p-6">
                <div>
                  <Label>{t("new.level")}</Label>
                  <Tabs value={level} onChange={setLevel} items={LEVELS.map((l) => ({ value: l, label: t(`auth.level${l[0].toUpperCase()}${l.slice(1)}` as MessageKey) }))} />
                </div>
                <div>
                  <Label>{t("new.language")}</Label>
                  <Tabs value={language} onChange={setLanguage} items={[{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }]} />
                </div>
                <div>
                  <Label hint={budget <= 5 ? t("new.timeQuick") : budget >= 40 ? t("new.timeDeep") : undefined}>{t("new.time")}</Label>
                  <GlassSlider stops={STOPS} value={budget} onChange={setBudget} ariaLabel={t("new.time")} format={(v) => t("common.minutes", { n: n(v) })} />
                </div>
                <div>
                  <Label hint={t("common.optional")}>{t("new.style")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLES.map(([v, k]) => (
                      <button key={v} type="button" aria-pressed={style === v} onClick={() => setStyle(style === v ? null : v)}
                        className={cn("rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors", style === v ? "border-sky-500 bg-sky-50 text-ink" : "border-line text-ink-2 hover:border-sky-200")}>{t(k)}</button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 flex flex-col items-end gap-4">
              {status === "loading" && (
                <PlanBuilding source={source} label={source === "doc" ? doc?.filename ?? "" : topic.trim()} terms={source === "doc" ? doc?.key_terms : []}
                  level={t(`auth.level${level[0].toUpperCase()}${level.slice(1)}` as MessageKey).toLowerCase()} minutes={budget} />
              )}
              <Button size="lg" onClick={build} status={status} loadingLabel={t("new.planning")} disabled={!ready} icon={<ArrowRight className="h-4 w-4" />}>{t("new.plan")}</Button>
            </div>
          </motion.div>
        ) : (
          <PlanView key="plan" plan={plan} onEdit={() => { api.deleteLesson(plan.id).catch(() => {}); setPlan(null); }} onStart={() => router.push(`/learn/${plan.id}`)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DocPicker({ doc, onDoc }: { doc: DocumentInfo | null; onDoc: (d: DocumentInfo | null) => void }) {
  const { t, n } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const docs = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });

  const upload = async (file?: File) => {
    if (!file) return;
    setFile(file);
    setPct(0);
    try {
      const d = await api.uploadDocument(file, setPct);
      onDoc(d);
      docs.refetch();
    } catch (e) {
      toast.error(errText(e, t("common.error")));
    } finally {
      setPct(null);
    }
  };

  if (doc) {
    return (
      <div className="rounded-2xl border border-sage/40 bg-sage-100/50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{doc.filename}</p>
            <p className="text-sm text-ink-2">{t("new.indexed", { n: n(doc.chunk_count) })}</p>
          </div>
          <button onClick={() => onDoc(null)} className="text-ink-3 hover:text-ink" aria-label={t("new.removeDoc")}><X className="h-4 w-4" /></button>
        </div>
        {doc.key_terms?.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-3">{t("new.keyTerms")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{doc.key_terms.slice(0, 10).map((k) => <Badge key={k}>{k}</Badge>)}</div>
          </>
        )}
      </div>
    );
  }

  if (pct !== null && file) return <UploadProgress file={file} pct={pct} />;

  return (
    <div>
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void upload(e.dataTransfer.files[0]); }}
        disabled={pct !== null}
        className={cn("relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-sky-500 bg-sky-50" : "border-line-2 bg-paper hover:border-sky-300")}>
        {pct !== null && <motion.div className="absolute inset-y-0 left-0 bg-sky-50" animate={{ width: `${pct}%` }} />}
        <motion.span className="relative" animate={over ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}><UploadCloud className="h-9 w-9 text-sky-600" /></motion.span>
        <p className="relative mt-3 font-medium">{pct !== null ? (pct < 100 ? t("new.uploading", { n: n(pct) }) : t("new.reading")) : t("new.drop")}</p>
        <p className="relative text-sm text-ink-3">{t("new.dropSub")}</p>
      </button>
      <input ref={input} type="file" hidden accept=".pdf,.docx,.pptx,.txt,.md" onChange={(e) => void upload(e.target.files?.[0])} />
      {(docs.data?.length ?? 0) > 0 && (
        <>
          <p className="mt-5 text-xs font-medium uppercase tracking-wider text-ink-3">{t("new.recent")}</p>
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {docs.data!.slice(0, 8).map((d) => (
              <button key={d.document_id} onClick={() => onDoc(d)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-paper-2">
                <FileText className="h-4 w-4 text-ink-3" /><span className="flex-1 truncate">{d.filename}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlanView({ plan, onEdit, onStart }: { plan: { id: string; nodes: PlanNode[] }; onEdit: () => void; onStart: () => void }) {
  const { t, n } = useI18n();
  const minutes = plan.nodes.reduce((s, x) => s + (x.est_minutes || 0), 0);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
      <p className="font-hand text-xl text-sky-700">{t("new.planReady")}</p>
      <h1 className="font-display text-5xl text-ink">{t("new.planSub", { n: n(plan.nodes.length), m: n(Math.round(minutes)) })}</h1>
      <div className="ruled relative mt-8 rounded-[28px] border border-line bg-surface py-6 pl-20 pr-6 shadow-[var(--shadow-lift)]">
        <ol className="relative space-y-1">
          {plan.nodes.map((node, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07, ease: EASE }} className="flex min-h-16 items-center gap-4">
              <span className="font-display text-3xl text-sky-600">{n(i + 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{node.concept}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                  {node.depth && <Badge>{node.depth}</Badge>}
                  {node.est_minutes != null && <span>{t("common.minutes", { n: n(node.est_minutes) })}</span>}
                  {node.checkpoint_question && <Badge tone="marigold"><PauseCircle className="h-3 w-3" />{t("new.checkpoint")}</Badge>}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={onEdit} icon={<Pencil className="h-4 w-4" />}>{t("new.edit")}</Button>
        <Button size="lg" onClick={onStart} icon={<BookOpen className="h-4 w-4" />}>{t("new.start")}</Button>
      </div>
    </motion.div>
  );
}
