"use client";

/**
 * The mark: a paper plane folded from a ruled notebook page. Its two creases
 * sit like "॥" — the Devanagari pause, and a pause button: the teacher who
 * stops to check you're with it. Hover: it loops and leaves a flight trail.
 * (logo.png is used only as the browser-tab icon; see app/layout.tsx.)
 */
import { motion, useAnimationControls } from "motion/react";
import { useEffect, useId } from "react";
import { cn, EASE } from "@/lib/utils";

export function PlaneMark({ size = 36, className, animateIn = false }: { size?: number; className?: string; animateIn?: boolean }) {
  const clip = `sk-body-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d="M6 30 L58 9 L27 37 Z" />
        </clipPath>
        <linearGradient id={`${clip}-wing`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky-100)" />
          <stop offset="1" stopColor="var(--sky-200)" />
        </linearGradient>
      </defs>
      {/* soft shadow on the page below */}
      <ellipse cx="34" cy="60" rx="16" ry="2.2" fill="var(--ink)" opacity="0.08" />
      {/* lower wing (in shadow) */}
      <motion.path
        d="M27 37 L58 9 L35 56 Z"
        fill={`url(#${clip}-wing)`}
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        initial={animateIn ? { opacity: 0, x: -6 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      />
      {/* fold flap */}
      <path d="M27 37 L31 47 L35 56 Z" fill="var(--sky-200)" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" />
      {/* the page itself, with its ruled lines */}
      <motion.g initial={animateIn ? { opacity: 0, y: 4 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <path d="M6 30 L58 9 L27 37 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
        <g clipPath={`url(#${clip})`} stroke="var(--rule)" strokeWidth="1.1">
          <line x1="0" y1="20" x2="64" y2="20" />
          <line x1="0" y1="26" x2="64" y2="26" />
          <line x1="0" y1="32" x2="64" y2="32" />
          <line x1="16" y1="0" x2="16" y2="64" stroke="var(--margin)" strokeWidth="0.9" />
        </g>
      </motion.g>
      {/* ॥ — the pause */}
      <motion.g stroke="var(--sky-600)" strokeWidth="2.6" strokeLinecap="round" initial={animateIn ? { pathLength: 0 } : false} animate={{ pathLength: 1 }}>
        <motion.line x1="31" y1="21" x2="28.5" y2="29" initial={animateIn ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.35, ease: EASE }} />
        <motion.line x1="37" y1="18.5" x2="34.5" y2="26.5" initial={animateIn ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.35, ease: EASE }} />
      </motion.g>
    </svg>
  );
}

export function Logo({ className, withWord = true, size = 34 }: { className?: string; withWord?: boolean; size?: number }) {
  const plane = useAnimationControls();
  const trail = useAnimationControls();

  // A little take-off each time the page (re)loads.
  useEffect(() => {
    plane.start({ x: [-12, 0], y: [8, 0], rotate: [-16, 0], opacity: [0, 1], transition: { duration: 0.9, ease: EASE } });
  }, [plane]);

  // Hover: a smooth loop-the-loop with a fading dashed trail.
  const loop = () => {
    plane.start({
      x: [0, 8, 16, 12, 2, -2, 0],
      y: [0, -8, -4, 6, 8, 3, 0],
      rotate: [0, -20, -110, -220, -300, -350, -360],
      transition: { duration: 1.2, ease: [0.45, 0, 0.2, 1] },
    });
    trail.start({ pathLength: [0, 1, 1], opacity: [0, 1, 0], transition: { duration: 1.3, ease: EASE } });
  };

  return (
    <span className={cn("group inline-flex items-center gap-2.5 select-none", className)} onMouseEnter={loop} data-cursor="link">
      <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="pointer-events-none absolute -left-4 -top-3 h-[150%] w-[150%] overflow-visible" aria-hidden="true">
          <motion.path d="M4 58 C 14 40, 30 64, 40 46 S 60 30, 46 20" fill="none" stroke="var(--sky-300)" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} animate={trail} />
        </svg>
        <motion.span animate={plane} className="inline-block" style={{ originX: 0.5, originY: 0.5 }}>
          <PlaneMark size={size} />
        </motion.span>
      </span>
      {withWord && (
        <span className="leading-none">
          <span className="block font-display text-[1.55rem] tracking-tight text-ink">
            VidyaSaathi<span className="text-sky-600">.</span>
          </span>
          <span className="mt-0.5 block whitespace-nowrap text-[0.6rem] font-medium tracking-[0.14em] text-ink-3 uppercase">विद्यासाथी · Class 6–10</span>
        </span>
      )}
    </span>
  );
}
