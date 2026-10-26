"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n";
import { EASE } from "@/lib/utils";

/* In-page replacement for window.confirm: Esc / backdrop cancel, and the
   confirm button shows progress while the action runs. */
export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onClose, icon = <Trash2 className="h-5 w-5" /> }: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  icon?: ReactNode;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]" onClick={() => !busy && onClose()} />
          <motion.div role="alertdialog" aria-modal="true"
            initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="relative w-full max-w-md rounded-[26px] border border-line bg-surface p-6 shadow-[var(--shadow-lift)]">
            <motion.span className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose"
              initial={{ rotate: 0 }} animate={{ rotate: [0, -12, 10, -6, 0] }} transition={{ delay: 0.15, duration: 0.5 }}>
              {icon}
            </motion.span>
            <h2 className="mt-4 break-words font-display text-2xl text-ink [overflow-wrap:anywhere]">{title}</h2>
            {body && <p className="mt-1.5 text-sm text-ink-2">{body}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelRef} variant="ghost" onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
              <Button variant="danger" onClick={run} status={busy ? "loading" : "idle"} icon={<Trash2 className="h-4 w-4" />}>{confirmLabel ?? t("common.delete")}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
