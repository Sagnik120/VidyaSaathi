"use client";

/**
 * Mor the peacock: a cheeky guide to "where do I do what" on the website.
 * Only this small round button ships with every page; the chat panel is its
 * own chunk, fetched the first time someone opens it.
 *
 * Never in the way: it steps aside while another bottom bar is open
 * (data-fab-hide on <body>, see lib/fab.ts) and while the user is typing in
 * a field near the bottom of the screen; pages keep room for it underneath.
 */
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "@/providers/i18n";
import { Peacock } from "@/components/brand/peacock";
import { useFabHidden, useFabLift } from "@/lib/fab";
import { cn, EASE } from "@/lib/utils";

const HelpPanel = dynamic(() => import("./help-bot-panel").then((m) => m.HelpPanel), { ssr: false });

export function HelpBot() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const hi = lang === "hi";
  const [open, setOpen] = useState(false);
  const [wave, setWave] = useState(false);
  const hidden = useFabHidden();
  const close = useCallback(() => setOpen(false), []);
  const btn = useRef<HTMLButtonElement>(null);
  const lift = useFabLift(btn, !open && !hidden);

  useEffect(() => { const t = setTimeout(() => setWave(true), 3000); const u = setTimeout(() => setWave(false), 9000); return () => { clearTimeout(t); clearTimeout(u); }; }, []);
  // Warm the panel's chunk once the page is idle, so the first open is instant.
  useEffect(() => { const t = setTimeout(() => { void import("./help-bot-panel"); }, 4000); return () => clearTimeout(t); }, []);

  if (pathname?.startsWith("/learn")) return null; // the classroom has its own doubt bot

  return (
    <>
      <AnimatePresence>
        {!open && !hidden && (
          <motion.button ref={btn} key="mor" onClick={() => { setWave(false); setOpen(true); }} aria-label="Help" title={hi ? "मोर से पूछें" : "Ask Mor"}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: -lift }} exit={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1.08, rotate: -6 }} transition={{ duration: 0.2, ease: EASE }}
            className={cn("fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-sky-600 to-[#2a8a7a] shadow-[var(--shadow-lift)] ring-4 ring-paper lg:bottom-6 lg:right-6")}>
            <Peacock size={34} />
            <AnimatePresence>
              {wave && (
                <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="pointer-events-none absolute right-16 top-1/2 hidden w-max -translate-y-1/2 rounded-2xl rounded-br-sm bg-surface px-3 py-1.5 text-sm text-ink shadow-[var(--shadow-lift)] sm:block">
                  {hi ? "मदद चाहिए? 🦚" : "Need help? 🦚"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
      {open && <HelpPanel onClose={close} />}
    </>
  );
}
