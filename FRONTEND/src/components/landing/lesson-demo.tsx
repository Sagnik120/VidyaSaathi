"use client";

const CHALK = "#f5f1e6";

/**
 * A chalk-board plant. step 0: sunlight, water and CO₂ flow in; 1: glucose
 * forms and travels down; 2: O₂ bubbles out and the equation appears;
 * 3 (paused at the question): the cupboard door shuts out the light and the
 * leaf turns pale. A wrong answer shows the "solar stove" idea; right brings
 * the light back.
 */
function PhotosynthesisBoard({ step, phase }: { step: number; phase: Phase }) {
  const dark = phase === "asking" || phase === "wrong";
  const leaf = dark ? "#c9c27a" : "#7fc48a";
  return (
    <svg viewBox="0 0 320 200" className="absolute inset-x-4 top-3 h-[70%] w-[calc(100%-2rem)]" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* ground and pot */}
      <path d="M20 176 H300" stroke={CHALK} strokeOpacity="0.35" strokeWidth="2" />
      <path d="M128 176 L136 150 H184 L192 176 Z" stroke={CHALK} strokeWidth="2" fill="#2f4470" />
      {/* roots, with water rising */}
      <path d="M160 150 V166 M160 160 L148 170 M160 160 L172 170" stroke={CHALK} strokeOpacity="0.6" strokeWidth="1.5" />
      {/* stem */}
      <path d="M160 150 C 158 120, 162 100, 160 78" stroke="#9fd3a6" strokeWidth="3" />
      {/* leaves */}
      <motion.path d="M160 104 C 120 96, 104 70, 112 52 C 140 58, 158 80, 160 104 Z" stroke={CHALK} strokeWidth="1.8" animate={{ fill: leaf }} transition={{ duration: 0.8 }} />
      <motion.path d="M160 92 C 196 82, 214 58, 206 40 C 180 46, 162 68, 160 92 Z" stroke={CHALK} strokeWidth="1.8" animate={{ fill: leaf }} transition={{ duration: 0.8 }} />
      <path d="M160 104 L122 62 M160 92 L198 50" stroke="#2f6b3e" strokeOpacity="0.6" strokeWidth="1" />

      {/* the sun and its rays */}
      <motion.g animate={{ opacity: dark ? 0.15 : 1 }} transition={{ duration: 0.6 }}>
        <circle cx="52" cy="40" r="16" fill="#f0c35a" />
        {[0, 1, 2].map((i) => (
          <motion.line key={i} x1={70} y1={44 + i * 8} x2={112} y2={58 + i * 6} stroke="#f0c35a" strokeWidth="2" strokeDasharray="4 5"
            animate={{ strokeDashoffset: step >= 0 && !dark ? [18, 0] : 0 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear", delay: i * 0.15 }} />
        ))}
        <text x="34" y="74" fill="#f0c35a" fontSize="9" fontFamily="var(--font-sans)">sunlight</text>
      </motion.g>

      {/* CO₂ drifting in from the air */}
      {[0, 1].map((i) => (
        <motion.text key={`co2-${i}`} x={250} y={70 + i * 22} fill={CHALK} fontSize="10" fontFamily="var(--font-sans)"
          animate={!dark ? { x: [262, 212], opacity: [0, 1, 0] } : { opacity: 0 }} transition={{ repeat: Infinity, duration: 2.2, delay: i * 1.1 }}>CO₂</motion.text>
      ))}
      {/* water climbing the stem */}
      {[0, 1, 2].map((i) => (
        <motion.circle key={`w-${i}`} cx={160} r="2.6" fill="#9cbce8" animate={!dark ? { cy: [166, 96], opacity: [0, 1, 0] } : { opacity: 0 }}
          transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.6 }} />
      ))}
      <text x="176" y="166" fill="#9cbce8" fontSize="9" fontFamily="var(--font-sans)">water</text>

      {/* step 1: glucose forms and travels down to feed the plant */}
      <AnimatePresence>
        {step >= 1 && !dark && (
          <motion.g key="glucose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[0, 1].map((i) => (
              <motion.path key={i} d="M0 -5 L4.3 -2.5 L4.3 2.5 L0 5 L-4.3 2.5 L-4.3 -2.5 Z" fill="#e5917f" stroke={CHALK} strokeWidth="0.8"
                animate={{ x: [138, 160, 160], y: [74, 100, 146] }} transition={{ repeat: Infinity, duration: 2.4, delay: i * 1.2 }} />
            ))}
            <text x="94" y="128" fill="#e5917f" fontSize="9" fontFamily="var(--font-sans)">food (glucose)</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* step 2: oxygen out, and the word equation */}
      <AnimatePresence>
        {step >= 2 && !dark && (
          <motion.g key="o2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[0, 1, 2].map((i) => (
              <motion.circle key={i} r="4" stroke={CHALK} strokeWidth="1.2" animate={{ cx: [196, 232 + i * 10], cy: [52, 18], opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }} />
            ))}
            <text x="244" y="30" fill={CHALK} fontSize="10" fontFamily="var(--font-sans)">O₂</text>
            <motion.text x="160" y="194" textAnchor="middle" fill={CHALK} fontSize="9.5" fontFamily="var(--font-sans)" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 0.9, y: 0 }}>
              CO₂ + H₂O —(sunlight)→ glucose + O₂
            </motion.text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* the question: a dark cupboard shuts out the light */}
      <AnimatePresence>
        {dark && (
          <motion.g key="cupboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.rect x="96" y="30" width="128" height="150" rx="6" fill="#141d30" fillOpacity="0.55" stroke={CHALK} strokeOpacity="0.5" strokeWidth="1.5"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: EASE }} style={{ originX: "96px" }} />
            <text x="160" y="24" textAnchor="middle" fill={CHALK} fontSize="10" fontFamily="var(--font-sans)">1 week in a dark cupboard…</text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* re-explain: the leaf is a little kitchen with a solar stove */}
      <AnimatePresence>
        {phase === "wrong" && (
          <motion.g key="stove" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <rect x="236" y="96" width="62" height="44" rx="8" fill="#2f4470" stroke={CHALK} strokeWidth="1.5" />
            <text x="267" y="114" textAnchor="middle" fontSize="14">🍳</text>
            <text x="267" y="132" textAnchor="middle" fill={CHALK} fontSize="8" fontFamily="var(--font-sans)">no sun = no cooking</text>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/**
 * The hero's live mini-lesson. It plays captions over a chalk-blue board,
 * then pauses on its own (॥) and asks the visitor. Wrong → it re-explains
 * differently and asks again. Right → it resumes. Exactly what the product does.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/providers/i18n";
import { cn, EASE } from "@/lib/utils";

type Phase = "playing" | "asking" | "wrong" | "right";
const PAUSE_AT = 72;

export function LessonDemo() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("playing");
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (phase !== "playing" && phase !== "right") return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setProgress((p) => {
        const next = p + dt / 90;
        if (phase === "playing" && p < PAUSE_AT && next >= PAUSE_AT) { setPhase("asking"); return PAUSE_AT; }
        if (next >= 100) return 100;
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase]);

  const restart = () => { setProgress(0); setPicked(null); setAttempt(0); setPhase("playing"); };
  useEffect(() => {
    if (progress < 100) return;
    const id = setTimeout(restart, 1800);
    return () => clearTimeout(id);
  }, [progress]);
  const answer = (id: string) => {
    setPicked(id);
    setAttempt((a) => a + 1);
    if (id === "A") { setPhase("right"); setProgress((p) => p + 0.5); }
    else setPhase("wrong");
  };

  const captions = [t("demo.caption1"), t("demo.caption2"), t("demo.caption3")];
  const caption = captions[Math.min(2, Math.floor((progress / PAUSE_AT) * 3))];
  const paused = phase === "asking" || phase === "wrong";
  const opts = [["A", t("demo.optA")], ["B", t("demo.optB")], ["C", t("demo.optC")]] as const;

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-lift)]" data-cursor="video">
      {/* window bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">{["#e5917f", "#f0c35a", "#9cbce8"].map((c) => <i key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span>
        <span className="truncate px-3 text-xs text-ink-3">{t("demo.label")}</span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold", paused ? "bg-marigold-100 text-marigold-600" : "bg-sky-50 text-sky-700")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", paused ? "bg-marigold-600" : "animate-pulse bg-sky-600")} />
          {paused ? t("demo.paused") : t("demo.playing")}
        </span>
      </div>

      {/* the "video" board */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#2a3a5c]">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
        {/* the diagram: a plant doing photosynthesis, in step with the captions */}
        <PhotosynthesisBoard step={phase === "playing" ? Math.min(2, Math.floor((progress / PAUSE_AT) * 3)) : 3} phase={phase} />
        {/* caption */}
        <AnimatePresence mode="wait">
          <motion.p key={phase === "wrong" ? "re" : caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease: EASE }}
            className="absolute inset-x-4 bottom-4 mx-auto w-fit max-w-[92%] rounded-xl bg-black/45 px-3 py-1.5 text-center text-[0.82rem] text-white backdrop-blur-sm sm:text-sm">
            {phase === "wrong" ? t("demo.reexplain") : phase === "right" ? t("demo.resumes") : caption}
          </motion.p>
        </AnimatePresence>
        {/* the ॥ that appears when it pauses */}
        <AnimatePresence>
          {paused && (
            <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.4, opacity: 0 }} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-marigold text-ink">
              <Pause className="h-5 w-5" fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* progress with a checkpoint notch */}
      <div className="relative mx-4 mt-3 h-1.5 rounded-full bg-paper-3">
        <div className="h-full rounded-full bg-sky-600" style={{ width: `${progress}%` }} />
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-marigold shadow" style={{ left: `${PAUSE_AT}%` }} />
      </div>

      {/* the question panel */}
      <div className="relative min-h-[178px] px-4 pb-4 pt-3">
        <AnimatePresence mode="wait">
          {paused ? (
            <motion.div key="q" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
              <p className="font-medium text-ink">{t("demo.question")}</p>
              <div className="mt-2.5 grid gap-2">
                {opts.map(([id, label]) => {
                  const wrongPick = phase === "wrong" && picked === id;
                  return (
                    <motion.button key={id} onClick={() => answer(id)} disabled={wrongPick}
                      animate={wrongPick ? { x: [0, -6, 6, -3, 0] } : {}}
                      className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        wrongPick ? "border-rose/40 bg-rose-100/60 text-ink-2" : "border-line hover:border-sky-300 hover:bg-sky-50")}>
                      <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-semibold", wrongPick ? "bg-rose text-white" : "bg-paper-2 text-ink-2")}>
                        {wrongPick ? <X className="h-3.5 w-3.5" /> : id}
                      </span>
                      {label}
                    </motion.button>
                  );
                })}
              </div>
              {phase === "wrong" && <p className="mt-2 text-xs text-rose">{t("demo.wrong")} · {t("demo.tryAgain")}</p>}
            </motion.div>
          ) : phase === "right" ? (
            <motion.div key="ok" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-3 rounded-2xl bg-sage-100 p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage text-white"><Check className="h-4 w-4" /></span>
              <div>
                <p className="text-sm text-ink">{t("demo.right")}</p>
                {attempt > 1 && <p className="mt-1 font-hand text-lg text-sky-700">{t("demo.resumes")}</p>}
              </div>
              <button onClick={restart} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-white/60" aria-label="Replay"><RotateCcw className="h-4 w-4" /></button>
            </motion.div>
          ) : (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs text-ink-3"><Play className="h-3 w-3" fill="currentColor" /> {t("hero.ctaSecondary")}</div>
              <div className="skeleton h-3 w-4/5" /><div className="skeleton h-3 w-3/5" /><div className="skeleton h-3 w-2/3" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
