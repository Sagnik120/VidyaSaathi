"use client";

/**
 * A short, themed "arriving" animation for each section of the app, so moving
 * between tabs feels alive: the plane takes off on Home, flies a route on the
 * Learning path, a flask bubbles in the Lab, ticks appear on Tests, chat
 * bubbles type on Doubts… Brief (~0.6 s), never blocks input for long, and
 * skipped entirely for reduced-motion users.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useI18n } from "@/providers/i18n";
import { PlaneMark } from "./logo";
import { EASE } from "@/lib/utils";

type Kind = "home" | "path" | "lab" | "tests" | "doubts" | "book" | "teacher" | "admin" | "plane";

export function kindFor(pathname: string): Kind {
  const p = pathname || "/";
  if (p.startsWith("/dashboard")) return "home";
  if (p.startsWith("/path")) return "path";
  if (p.startsWith("/lab")) return "lab";
  if (p.startsWith("/tests")) return "tests";
  if (p.startsWith("/doubts")) return "doubts";
  if (/^\/(lessons|progress|report|review|refresh)/.test(p)) return "book";
  if (p.startsWith("/teacher")) return "teacher";
  if (p.startsWith("/admin")) return "admin";
  return "plane";
}

const LABEL: Record<Kind, [string, string]> = {
  home: ["Taking off…", "उड़ान भर रहे हैं…"],
  path: ["Plotting your route…", "आपका रास्ता बन रहा है…"],
  lab: ["Mixing the experiment…", "प्रयोग तैयार हो रहा है…"],
  tests: ["Sharpening pencils…", "पेंसिल तैयार…"],
  doubts: ["Opening your conversations…", "बातचीत खुल रही है…"],
  book: ["Turning the pages…", "पन्ने पलट रहे हैं…"],
  teacher: ["Uncapping the red pen…", "लाल पेन तैयार…"],
  admin: ["Reading the dials…", "आँकड़े पढ़ रहे हैं…"],
  plane: ["One moment…", "एक पल…"],
};

const D = { duration: 0.55, ease: EASE };

function Art({ kind }: { kind: Kind }) {
  switch (kind) {
    case "home":
      return (
        <svg viewBox="0 0 120 80" className="h-24 w-36 overflow-visible">
          {[0, 1, 2, 3, 4].map((i) => <motion.line key={i} x1={8 + i * 22} x2={20 + i * 22} y1={66} y2={66} stroke="var(--line-2)" strokeWidth="3" strokeLinecap="round"
            animate={{ x: [0, -22] }} transition={{ duration: 0.4, ease: "linear", repeat: Infinity }} />)}
          <motion.g initial={{ x: 0, y: 46, rotate: 0 }} animate={{ x: 70, y: 0, rotate: -18 }} transition={{ duration: 0.6, ease: [0.5, 0, 0.3, 1] }}>
            <foreignObject width="34" height="34"><PlaneMark size={34} /></foreignObject>
          </motion.g>
        </svg>
      );
    case "path":
      return (
        <svg viewBox="0 0 140 80" className="h-24 w-40 overflow-visible">
          <motion.path id="rl-route" d="M8 66 C 40 66, 40 18, 70 30 S 110 70, 132 14" fill="none" stroke="var(--sky-300)" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={D} />
          {[[8, 66], [70, 30], [132, 14]].map(([x, y], i) => (
            <motion.circle key={i} cx={x} cy={y} r="5" fill={i === 2 ? "var(--marigold-400)" : "var(--sage)"} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.12 + i * 0.15, type: "spring" }} />
          ))}
          <motion.g style={{ offsetPath: "path('M8 66 C 40 66, 40 18, 70 30 S 110 70, 132 14')", offsetRotate: "auto" } as React.CSSProperties}
            initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: "100%" }} transition={{ duration: 0.6, ease: "easeInOut" }}>
            <foreignObject x="-12" y="-12" width="24" height="24"><PlaneMark size={24} /></foreignObject>
          </motion.g>
        </svg>
      );
    case "lab":
      return (
        <svg viewBox="0 0 80 90" className="h-24 w-24 overflow-visible">
          <path d="M30 8 L50 8 M33 8 L33 34 L14 74 Q12 82 20 82 L60 82 Q68 82 66 74 L47 34 L47 8" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          <motion.path d="M22 62 L58 62 L66 76 Q67 81 60 81 L20 81 Q13 81 14 76 Z" fill="var(--sky-200)" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} />
          {[0, 1, 2, 3].map((i) => (
            <motion.circle key={i} cx={30 + i * 7} r={2 + (i % 2)} fill="var(--sky-500)" initial={{ cy: 76, opacity: 1 }} animate={{ cy: 20, opacity: 0 }}
              transition={{ duration: 0.7, delay: i * 0.12, repeat: Infinity }} />
          ))}
        </svg>
      );
    case "tests":
      return (
        <svg viewBox="0 0 80 90" className="h-24 w-24">
          <rect x="12" y="10" width="56" height="74" rx="6" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
          <rect x="28" y="5" width="24" height="10" rx="3" fill="var(--marigold-200)" stroke="var(--ink)" strokeWidth="1.5" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <line x1="38" x2="60" y1={34 + i * 16} y2={34 + i * 16} stroke="var(--line-2)" strokeWidth="3" strokeLinecap="round" />
              <motion.path d={`M20 ${33 + i * 16} l4 4 l8 -9`} fill="none" stroke="var(--sage)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1 + i * 0.15, duration: 0.2 }} />
            </g>
          ))}
        </svg>
      );
    case "doubts":
      return (
        <svg viewBox="0 0 110 80" className="h-24 w-32">
          <motion.path d="M10 14 h56 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-40 l-10 8 v-8 h-6 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8z" fill="var(--sky-100)" stroke="var(--sky-600)" strokeWidth="1.5"
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300 }} style={{ originX: "20px", originY: "40px" }} />
          <motion.path d="M48 40 h46 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-4 v8 l-10 -8 h-32 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8z" fill="var(--marigold-100)" stroke="var(--marigold-600)" strokeWidth="1.5"
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.15 }} style={{ originX: "90px", originY: "70px" }} />
          {[0, 1, 2].map((i) => <motion.circle key={i} cx={64 + i * 10} cy={54} r="3" fill="var(--marigold-600)" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }} />)}
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 110 70" className="h-24 w-36" style={{ perspective: 400 }}>
          <path d="M55 12 Q35 4 8 10 L8 62 Q35 56 55 64 Q75 56 102 62 L102 10 Q75 4 55 12 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          <line x1="55" y1="12" x2="55" y2="64" stroke="var(--ink)" strokeWidth="1.5" />
          {[0, 1].map((i) => (
            <motion.path key={i} d="M55 12 Q75 4 100 10 L100 60 Q75 54 55 62 Z" fill="var(--paper-2)" stroke="var(--line-2)"
              initial={{ rotateY: 0 }} animate={{ rotateY: -180 }} transition={{ duration: 0.45, delay: i * 0.18, ease: "easeInOut" }} style={{ originX: "55px", transformBox: "view-box" }} />
          ))}
        </svg>
      );
    case "teacher":
      return (
        <svg viewBox="0 0 100 80" className="h-24 w-32">
          <rect x="10" y="10" width="64" height="62" rx="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
          {[24, 34, 44, 54].map((y) => <line key={y} x1="16" x2="68" y1={y} y2={y} stroke="var(--rule)" strokeWidth="1.5" />)}
          <motion.path d="M26 42 l9 10 l22 -26" fill="none" stroke="var(--margin)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: EASE }} />
          <motion.g initial={{ x: 26, y: 42 }} animate={{ x: 57, y: 16 }} transition={{ duration: 0.45, ease: EASE }}>
            <rect x="0" y="-3" width="26" height="6" rx="2" fill="var(--rose)" transform="rotate(-40)" />
          </motion.g>
        </svg>
      );
    case "admin":
      return (
        <svg viewBox="0 0 100 64" className="h-24 w-32">
          <path d="M12 56 A38 38 0 0 1 88 56" fill="none" stroke="var(--paper-3)" strokeWidth="8" strokeLinecap="round" />
          <motion.path d="M12 56 A38 38 0 0 1 88 56" fill="none" stroke="var(--sky-500)" strokeWidth="8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 0.72 }} transition={D} />
          <motion.line x1="50" y1="56" x2="50" y2="24" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" initial={{ rotate: -90 }} animate={{ rotate: 40 }} transition={D} style={{ originX: "50px", originY: "56px" }} />
          <circle cx="50" cy="56" r="4" fill="var(--ink)" />
        </svg>
      );
    default:
      return (
        <motion.div animate={{ rotate: [0, -20, -360], x: [0, 10, 0], y: [0, -12, 0] }} transition={{ duration: 0.6, ease: "easeInOut" }}>
          <PlaneMark size={64} />
        </motion.div>
      );
  }
}

const SEEN = "vidyasaathi.sections";

export function RouteLoader({ pathname }: { pathname: string }) {
  const { lang } = useI18n();
  const kind = kindFor(pathname);
  // Speed first: the arrival animation plays only on the first visit to a
  // section in a session, briefly, and never blocks the page underneath.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seen: string[] = [];
    try { seen = JSON.parse(sessionStorage.getItem(SEEN) || "[]"); } catch { /* storage blocked */ }
    if (seen.includes(kind)) return;
    try { sessionStorage.setItem(SEEN, JSON.stringify([...seen, kind])); } catch { /* storage blocked */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), 480);
    return () => clearTimeout(t);
  }, [kind]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="route-loader" exit={{ opacity: 0, transition: { duration: 0.25 } }}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-paper/92 backdrop-blur-[2px] lg:left-[264px]" aria-hidden>
          <div className="flex flex-col items-center gap-2">
            <Art kind={kind} />
            <p className="font-hand text-lg text-ink-2">{LABEL[kind][lang === "hi" ? 1 : 0]}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
