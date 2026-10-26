"use client";

/** The Simulations tab of the Practice Lab — its own chunk, loaded only when shown. */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Atom, Calculator, Coins, Globe2, Leaf, TestTube2 } from "lucide-react";
import { api } from "@/core/api";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { Card } from "@/components/ui/primitives";
import { SIMS, SchoolLab, simsFor, type Area } from "./school-labs";
import { cn } from "@/lib/utils";

const AREA_ICON: Record<Area, React.ReactNode> = {
  math: <Calculator className="h-4 w-4" />, physics: <Atom className="h-4 w-4" />, chemistry: <TestTube2 className="h-4 w-4" />,
  biology: <Leaf className="h-4 w-4" />, geography: <Globe2 className="h-4 w-4" />, economics: <Coins className="h-4 w-4" />,
};

export function SimsTab() {
  const { lang, n } = useI18n();
  const hi = lang === "hi";
  const { user } = useAuth();
  const myGrade = Number(String(user?.grade ?? "").replace(/\D/g, "")) || null;
  const staff = user?.role === "teacher" || user?.role === "admin";
  const [grade, setGrade] = useState<number | null>(myGrade);
  const [subject, setSubject] = useState<string>("");
  const [sim, setSim] = useState<string>("");
  const boards = useQuery({ queryKey: ["boards"], queryFn: api.boards, staleTime: Infinity });
  const subjects = boards.data && grade ? [...new Set((staff ? ["CBSE", "ICSE"] : [user?.board ?? "CBSE"]).flatMap((b) => boards.data!.subjects[b]?.[String(grade)] ?? []))] : [];

  useEffect(() => { setGrade(staff ? myGrade ?? 9 : myGrade); }, [myGrade, staff]);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("sim");
    if (want && SIMS.some((s) => s.id === want)) setSim(want);
  }, []);

  const list = useMemo(() => simsFor(grade, subject || null), [grade, subject]);
  const current = list.find((s) => s.id === sim) ?? list[0];
  const go = (_t: "sim", id?: string) => {
    if (id) setSim(id);
    window.history.replaceState(null, "", `/lab${id ? `?sim=${id}` : ""}`);
  };

  return (
    <>
          <div className="flex flex-wrap items-center gap-2">
            {/* Students see only their own class; staff can browse every class. */}
            {!staff ? (
              <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">{user?.board} · {hi ? "कक्षा" : "Class"} {n(myGrade ?? "")}</span>
            ) : (
            <div className="inline-flex rounded-2xl border border-line bg-surface p-1">
              {[6, 7, 8, 9, 10].map((g) => (
                <button key={g} onClick={() => setGrade(grade === g ? null : g)}
                  className={cn("rounded-xl px-3 py-1.5 text-xs font-semibold", grade === g ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>
                  {hi ? "कक्षा" : "Class"} {n(g)}
                </button>
              ))}
            </div>
            )}
            {subjects.length > 0 && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {["", ...subjects].map((s) => (
                  <button key={s || "all"} onClick={() => setSubject(s)}
                    className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs", subject === s ? "border-sky-400 bg-sky-50 text-sky-700" : "border-line text-ink-3 hover:text-ink")}>{s || (hi ? "सभी विषय" : "All subjects")}</button>
                ))}
              </div>
            )}
          </div>

          {!current ? (
            <Card className="p-8 text-center text-ink-3">{hi ? "इस विषय के लिए इस कक्षा में अभी सिमुलेशन नहीं — दूसरा विषय या कक्षा चुनें।" : "No simulations for this subject in this class yet — try another subject or class."}</Card>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <nav className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto lg:pb-0">
                {list.map((l) => (
                  <button key={l.id} onClick={() => go("sim", l.id)}
                    className={cn("flex shrink-0 items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors lg:w-full",
                      current.id === l.id ? "border-sky-400 bg-sky-50 shadow-[var(--shadow-soft)]" : "border-line bg-surface hover:border-sky-300")}>
                    <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg", current.id === l.id ? "bg-sky-600 text-white" : "bg-paper-3 text-ink-3")}>{AREA_ICON[l.area]}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{hi ? l.hi : l.en}</span>
                      <span className="hidden text-[0.7rem] text-ink-3 lg:block">{hi ? l.aboutHi : l.about}</span>
                    </span>
                  </button>
                ))}
              </nav>
              <Card className="min-w-0 p-5 sm:p-6">
                <h2 className="font-display text-3xl text-ink">{hi ? current.hi : current.en}</h2>
                <p className="mb-5 mt-1 text-sm text-ink-2">{hi ? current.aboutHi : current.about}</p>
                <SchoolLab key={current.id} sim={current} />
              </Card>
            </div>
          )}
    </>
  );
}
