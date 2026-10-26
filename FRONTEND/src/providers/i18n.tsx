"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { isLangReady, loadLang, localizeDigits, translate, type Lang, type MessageKey } from "@/core/i18n";

const KEY = "shikshak.lang";
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}
function writeLang(lang: Lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* private mode */ }
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  n: (value: string | number) => string;
};

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Hydration-safe: the server (and first client paint) render English, then
  // the stored choice applies without a mismatch.
  const stored = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  // Hindi's dictionary loads on demand; until it arrives the page stays in English.
  const [, setLoaded] = useState(0);
  useEffect(() => { if (!isLangReady(stored)) void loadLang(stored).then(() => setLoaded((x) => x + 1)); }, [stored]);
  const lang: Lang = isLangReady(stored) ? stored : "en";

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const localized = vars
        ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === "number" ? localizeDigits(lang, v) : v]))
        : undefined;
      return translate(lang, key, localized);
    },
    [lang]
  );
  const n = useCallback((value: string | number) => localizeDigits(lang, value), [lang]);
  const value = useMemo(() => ({ lang, setLang: writeLang, t, n }), [lang, t, n]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
