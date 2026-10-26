"use client";

/**
 * Loading screen: a ruled notebook page folds itself into a paper plane,
 * banks, and glides off; its dashed flight path is the progress line. Full
 * sequence once per session, a quick one on later reloads.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useI18n } from "@/providers/i18n";
import { EASE } from "@/lib/utils";

// Same point count, so the page can morph into the plane.
const PAGE = "M22 14 L50 14 L78 14 L78 86 L50 86 L22 86 Z";
const PLANE = "M10 30 L46 42 L90 50 L90 50 L46 58 L10 70 Z";
const SEEN = "vidyasaathi.loader.seen";
const GLIDE = [0.4, 0, 0.2, 1] as const;

export function PageLoader() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [full, setFull] = useState(true);
  const [stage, setStage] = useState<"page" | "plane" | "fly">("page");

  useEffect(() => {
    let quick = false;
    try {
      quick = sessionStorage.getItem(SEEN) === "1";
      sessionStorage.setItem(SEEN, "1");
    } catch { /* private mode: always the full show */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const short = quick || reduce;
    setFull(!short);
    const timers = [
      setTimeout(() => setStage("plane"), short ? 60 : 550),
      setTimeout(() => setStage("fly"), short ? 260 : 1150),
      setTimeout(() => setVisible(false), short ? 450 : 1600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="loader" className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-paper"
          exit={{ opacity: 0, transition: { duration: 0.45, ease: EASE } }} aria-live="polite" aria-label={t("loader.folding")}>
          <div className="ruled-plain pointer-events-none absolute inset-0 opacity-50" />
          {/* drifting cloud puffs give the glide some air */}
          {full && [0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute h-6 rounded-full bg-sky-100/70 blur-[1px]"
              style={{ width: 70 + i * 26, top: `${36 + i * 12}%`, left: "50%" }}
              initial={{ x: 140 + i * 60, opacity: 0 }} animate={{ x: -260 - i * 40, opacity: [0, 0.9, 0] }}
              transition={{ duration: 2 + i * 0.3, ease: "linear", delay: i * 0.15 }} />
          ))}
          <div className="relative flex flex-col items-center">
            <svg viewBox="0 0 100 100" className="h-40 w-40 overflow-visible">
              <defs>
                <clipPath id="ld-shape">
                  <motion.path d={PAGE} initial={{ d: PAGE }} animate={{ d: stage === "page" ? PAGE : PLANE }} transition={{ duration: 0.65, ease: EASE }} />
                </clipPath>
              </defs>
              <motion.g
                animate={stage === "fly" ? { x: 170, y: -70, rotate: -16, scale: 0.85, opacity: 0 } : stage === "plane" ? { x: [0, -4, 0], y: [0, 3, 0], rotate: [-6, -3, -6] } : { x: 0, y: 0, rotate: 0 }}
                transition={stage === "fly" ? { duration: 0.75, ease: GLIDE } : stage === "plane" ? { duration: 1.2, ease: "easeInOut", repeat: Infinity } : { duration: 0.5, ease: EASE }}
                style={{ originX: "50px", originY: "50px" }}
              >
                {/* the page's shadow lifts away as it becomes a plane */}
                <motion.ellipse cx="50" cy="94" rx="30" ry="3" fill="var(--ink)" animate={{ opacity: stage === "page" ? 0.08 : 0.03, rx: stage === "page" ? 30 : 18 }} transition={{ duration: 0.6 }} />
                <motion.path d={PAGE} initial={{ d: PAGE }} animate={{ d: stage === "page" ? PAGE : PLANE }} transition={{ duration: 0.65, ease: EASE }}
                  fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round" />
                <g clipPath="url(#ld-shape)">
                  {[26, 34, 42, 50, 58, 66, 74].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--rule)" strokeWidth="1" />)}
                  <line x1="32" x2="32" y1="0" y2="100" stroke="var(--margin)" strokeWidth="0.8" />
                  {/* the lower wing's shade appears with the fold */}
                  <motion.path d="M46 50 L90 50 L46 58 L10 70 Z" fill="var(--sky-100)" animate={{ opacity: stage === "page" ? 0 : 0.8 }} transition={{ duration: 0.4, delay: 0.3 }} />
                </g>
                <motion.line x1="10" y1="50" x2="90" y2="50" stroke="var(--ink)" strokeWidth="1.1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: stage === "page" ? 0 : 1 }} transition={{ duration: 0.4, ease: EASE, delay: 0.25 }} />
                {[0, 1].map((i) => (
                  <motion.line key={i} x1={52 + i * 7} y1={44} x2={50 + i * 7} y2={56} stroke="var(--sky-600)" strokeWidth="2.4" strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: stage === "page" ? 0 : 1 }} transition={{ duration: 0.25, ease: EASE, delay: 0.45 + i * 0.12 }} />
                ))}
              </motion.g>
            </svg>

            {/* the flight path is the progress line */}
            <svg viewBox="0 0 220 24" className="-mt-2 h-6 w-56 overflow-visible">
              <motion.path d="M4 18 C 50 4, 90 22, 130 10 S 200 6, 216 4" fill="none" stroke="var(--sky-300)" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: stage === "page" ? 0.25 : stage === "plane" ? 0.6 : 1 }} transition={{ duration: 0.6, ease: EASE }} />
            </svg>

            <motion.p className="mt-3 font-hand text-lg text-ink-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: EASE }}>
              {stage === "fly" ? t("loader.ready") : t("loader.folding")}
            </motion.p>
            {full && (
              <motion.p className="mt-1 font-display text-3xl text-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
                VidyaSaathi<span className="text-sky-600">.</span>
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
