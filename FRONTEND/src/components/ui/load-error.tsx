"use client";

import { RefreshCw } from "lucide-react";
import { ApiError } from "@/core/api";
import { useI18n } from "@/providers/i18n";
import { Button } from "@/components/ui/button";

/** Shown instead of an endless skeleton when a request fails — with the likely reason. */
export function LoadError({ onRetry, className, error }: { onRetry: () => void; className?: string; error?: unknown }) {
  const { t, lang } = useI18n();
  const hi = lang === "hi";
  const status = error instanceof ApiError ? error.status : undefined;
  const message =
    status === 404 ? (hi ? "सर्वर पर यह सुविधा नहीं मिली — बैकएंड शायद पुराने कोड पर चल रहा है। उसे दोबारा शुरू करें, फिर ‘फिर कोशिश करें’ दबाएँ।" : "The server doesn't have this feature yet — the backend is probably running older code. Restart it, then tap Try again.")
    : status === 0 ? t("common.networkError")
    : error instanceof ApiError && error.message && status && status < 500 ? error.message
    : t("common.loadFailed");
  return (
    <div className={`grid place-items-center gap-3 rounded-2xl border border-dashed border-line-2 px-6 py-10 text-center ${className ?? ""}`} role="alert">
      <p className="max-w-sm text-sm text-ink-2">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>{t("common.retry")}</Button>
    </div>
  );
}
