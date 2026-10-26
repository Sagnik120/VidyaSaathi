"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, GraduationCap } from "lucide-react";
import { api } from "@/core/api";
import type { Board, Teaching } from "@/core/types";
import { useI18n } from "@/providers/i18n";
import { Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const BOARDS: Board[] = ["CBSE", "ICSE"];

/** A teacher teaches ONE subject, in the classes (and boards) they choose; optionally class teacher of some classes. */
export function TeachingPicker({ teaching, classes, onChange }: {
  teaching: Teaching[];
  classes: string[];
  onChange: (teaching: Teaching[], classes: string[]) => void;
}) {
  const { lang } = useI18n();
  const hi = lang === "hi";
  const info = useQuery({ queryKey: ["boards"], queryFn: api.boards, staleTime: Infinity });
  const grades = info.data?.grades ?? ["6", "7", "8", "9", "10"];
  const subject = teaching[0]?.subject ?? "";
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const b of BOARDS) for (const g of grades) (info.data?.subjects[b]?.[g] ?? []).forEach((s) => set.add(s));
    return [...set];
  }, [info.data, grades]);
  const offers = (b: Board, g: string) => (info.data?.subjects[b]?.[g] ?? []).includes(subject);
  const has = (b: Board, g: string) => teaching.some((t) => t.board === b && t.grade === g);

  const pickSubject = (s: string) => {
    // Keep the same classes where the new subject exists there too.
    const keep = teaching.filter((t) => (info.data?.subjects[t.board]?.[t.grade] ?? []).includes(s)).map((t) => ({ ...t, subject: s }));
    // A subject with no class picked yet is still remembered via a placeholder-free empty list,
    // so default to every class that offers it — the teacher just un-ticks the ones they don't teach.
    const all = BOARDS.flatMap((b) => grades.filter((g) => (info.data?.subjects[b]?.[g] ?? []).includes(s)).map((g) => ({ board: b, grade: g, subject: s })));
    onChange(keep.length ? keep : all, classes.filter((c) => (keep.length ? keep : all).some((t) => `${t.board}-${t.grade}` === c)));
  };
  const toggle = (b: Board, g: string) =>
    onChange(has(b, g) ? teaching.filter((t) => !(t.board === b && t.grade === g)) : [...teaching, { board: b, grade: g, subject }], classes);
  const toggleClass = (key: string) => onChange(teaching, classes.includes(key) ? classes.filter((c) => c !== key) : [...classes, key]);

  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-line-2 p-4">
      <label className="block">
        <span className="font-hand text-lg text-sky-700">{hi ? "आपका विषय" : "Your subject"}</span>
        <Select value={subject} onChange={(e) => pickSubject(e.target.value)} className="mt-1">
          <option value="" disabled>{hi ? "एक विषय चुनें" : "Pick one subject"}</option>
          {allSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </label>

      {subject && (
        <div>
          <p className="mb-2 text-sm text-ink-2">{hi ? "किन कक्षाओं में पढ़ाते हैं?" : "Which classes do you teach it in?"}</p>
          <div className="space-y-2">
            {BOARDS.map((b) => (
              <div key={b} className="flex flex-wrap items-center gap-1.5">
                <span className="w-12 text-xs font-semibold text-ink-3">{b}</span>
                {grades.map((g) => offers(b, g) ? (
                  <button key={g} type="button" onClick={() => toggle(b, g)}
                    className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                      has(b, g) ? "border-sky-400 bg-sky-50 text-sky-700" : "border-line bg-surface text-ink-2 hover:border-sky-300")}>
                    {has(b, g) && <Check className="h-3.5 w-3.5" />}{g}
                  </button>
                ) : null)}
                {!grades.some((g) => offers(b, g)) && <span className="text-xs text-ink-3">{hi ? "इस बोर्ड में नहीं" : "not on this board"}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {teaching.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm text-ink-2"><GraduationCap className="h-4 w-4 text-marigold-600" />{hi ? "कक्षा शिक्षक भी? (वैकल्पिक)" : "Also class teacher of… (optional)"}</p>
          <div className="flex flex-wrap gap-1.5">
            {teaching.map((t) => `${t.board}-${t.grade}`).map((key) => (
              <button key={key} type="button" onClick={() => toggleClass(key)}
                className={cn("rounded-full border px-3 py-1 text-xs", classes.includes(key) ? "border-marigold-600 bg-marigold-50 text-marigold-600" : "border-dashed border-line-2 text-ink-3 hover:text-ink")}>
                {key.replace("-", " · ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
