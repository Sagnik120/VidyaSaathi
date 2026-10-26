import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { storage } from '@/core/api';
import { localizeDigits, translate, type Lang, type MessageKey } from '@/core/i18n';

const KEY = 'shikshak.lang';
const listeners = new Set<() => void>();

function readLang(): Lang {
  return storage.getItem(KEY) === 'hi' ? 'hi' : 'en';
}
function writeLang(lang: Lang) {
  storage.setItem(KEY, lang);
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  n: (value: string | number) => string;
};

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => 'en' as Lang);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const localized = vars
        ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'number' ? localizeDigits(lang, v) : v]))
        : undefined;
      return translate(lang, key, localized);
    },
    [lang],
  );
  const n = useCallback((value: string | number) => localizeDigits(lang, value), [lang]);
  const value = useMemo(() => ({ lang, setLang: writeLang, t, n }), [lang, t, n]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
