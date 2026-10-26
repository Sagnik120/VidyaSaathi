"use client";

/**
 * Floating buttons (Mor, Ask a doubt) must never cover something important.
 *  - Anything that occupies the bottom of the screen (a bulk-reply bar, a
 *    bottom sheet) calls useHideFabs(true) while it is shown.
 *  - While the user types in a field in the lower part of the screen, the
 *    buttons step aside too.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

let hiders = 0;
let typingLow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function onFocus(e: FocusEvent) {
  const el = e.target as HTMLElement | null;
  const field = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  const low = field && el!.getBoundingClientRect().bottom > window.innerHeight - 140;
  if (low !== typingLow) { typingLow = low; emit(); }
}
function onBlur() { if (typingLow) { typingLow = false; emit(); } }

function subscribe(fn: () => void) {
  if (!listeners.size) {
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", onBlur);
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("focusout", onBlur);
    }
  };
}

/** True when floating buttons should step aside. */
export function useFabHidden() {
  return useSyncExternalStore(subscribe, () => hiders > 0 || typingLow, () => false);
}

/** Hide floating buttons while `active` (e.g. a bottom bar is on screen). */
export function useHideFabs(active: boolean) {
  useEffect(() => {
    if (!active) return;
    hiders += 1; emit();
    return () => { hiders -= 1; emit(); };
  }, [active]);
}

const INTERACTIVE = "button, a[href], input, textarea, select, [role=button], [role=tab], [data-fab-avoid]";

/**
 * Collision avoidance for a floating button: every so often (and on scroll /
 * resize) look at what is underneath its resting spot. If a button, link or
 * field would be covered, report how far to lift so it sits clear of it.
 */
export function useFabLift(ref: React.RefObject<HTMLElement | null>, enabled = true) {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        // Measure the resting box (offset size, ignoring the entrance scale animation).
        const box = el.getBoundingClientRect();
        const w = el.offsetWidth, h = el.offsetHeight;
        const r = { left: box.left + box.width / 2 - w / 2, top: box.top + box.height / 2 - h / 2, width: w, height: h };
        const baseTop = r.top + lift; // where it would rest without the lift
        const covers = (top: number) => {
          for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.15], [0.5, 0.85]]) {
            const hit = document.elementsFromPoint(r.left + r.width * fx, top + r.height * fy).find((n) => !el.contains(n));
            if (hit?.closest(INTERACTIVE)) return true;
          }
          return false;
        };
        let next = 0;
        while (next < 240 && covers(baseTop - next)) next += 36;
        if (next !== lift) setLift(next >= 240 ? 0 : next);
      });
    };
    const first = setTimeout(check, 260); // after the entrance animation
    const t = setInterval(check, 500);
    window.addEventListener("scroll", check, { passive: true, capture: true });
    window.addEventListener("resize", check);
    return () => { cancelAnimationFrame(raf); clearTimeout(first); clearInterval(t); window.removeEventListener("scroll", check, true); window.removeEventListener("resize", check); };
  }, [ref, enabled, lift]);
  return lift;
}
