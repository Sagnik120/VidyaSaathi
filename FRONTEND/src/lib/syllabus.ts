import type { SyllabusChapter, SyllabusPath, SyllabusSubject, SyllabusTopic } from "@/core/types";

/** Start a lesson on a syllabus topic, phrased so the planner knows the board, class and chapter. */
export const lessonHref = (p: SyllabusPath, s: SyllabusSubject, c: SyllabusChapter, t: SyllabusTopic) => {
  const where = `${p.board} Class ${p.grade} · ${s.name} · ${c.title}`;
  const topic = `${t.title} (${s.name}, ${p.board} Class ${p.grade} — ${c.title})`;
  // Adaptive pace: the level follows how the student has scored in this subject so far.
  const level = s.suggested_level ? `&level=${s.suggested_level}` : "";
  return `/new?topic=${encodeURIComponent(topic)}&syllabus=${encodeURIComponent(t.id)}&where=${encodeURIComponent(where)}${level}`;
};

export function findTopicById(p: SyllabusPath, id: string) {
  for (const s of p.subjects) { const f = findTopic(s, id); if (f) return { s, ...f }; }
  return null;
}

export function findTopic(s: SyllabusSubject, id?: string | null) {
  for (const c of s.chapters) for (const t of c.topics) if (t.id === id) return { c, t };
  return null;
}
