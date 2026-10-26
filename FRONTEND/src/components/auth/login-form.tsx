"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { GraduationCap, Loader2, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { api, ApiError } from "@/core/api";
import { useAuth } from "@/providers/auth";
import { useI18n } from "@/providers/i18n";
import { Button, type ButtonStatus } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/primitives";
import { EMAIL_RE, Field, formValues } from "@/components/ui/field";
import { AuthHeading, FormAlert, errText, pendingOtp } from "@/components/auth/auth-kit";
import { DEMO_ADMIN, DEMO_PASSWORD, DEMO_STUDENT, DEMO_TEACHERS } from "@/lib/demo";
import { portalFor } from "@/lib/staff";
import { cn } from "@/lib/utils";

export type LoginRole = "student" | "teacher" | "admin";

const ROUTE: Record<LoginRole, string> = { student: "/login", teacher: "/teacher/login", admin: "/staff/login" };

function safeNext(fallback: string) {
  const n = new URLSearchParams(window.location.search).get("next") || "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

/** One sign-in form, three doors. Each door only admits its own role and opens that role's home. */
export function LoginForm({ role = "student" }: { role?: LoginRole }) {
  const { t, lang } = useI18n();
  const hi = lang === "hi";
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const [demoBusy, setDemoBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const wrongDoor = (actual: string) =>
    hi ? `यह ${actual === "student" ? "छात्र" : actual === "teacher" ? "शिक्षक" : "एडमिन"} खाता है — सही दरवाज़े से साइन इन करें।`
       : `This is a ${actual} account — use the ${actual} sign-in.`;

  const submit = async (e?: React.FormEvent<HTMLFormElement>, demoCreds?: { email: string; password: string }) => {
    e?.preventDefault();
    const v = e ? formValues(e.currentTarget) : {};
    const creds = demoCreds ?? { email: (v.email ?? email).trim(), password: v.password ?? password };
    const next: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(creds.email)) next.email = t("err.email");
    if (!creds.password) next.password = t("err.passwordEmpty");
    setErrors(next);
    if (Object.keys(next).length) return;
    setError("");
    setStatus("loading");
    try {
      const tok = await api.login(creds.email.trim(), creds.password);
      if (tok.user.role !== role) {
        void api.revokeRefresh(tok.refresh_token);
        setStatus("idle");
        setDemoBusy(null);
        setError(wrongDoor(tok.user.role));
        return;
      }
      signIn(tok);
      setStatus("success");
      toast.success(t("auth.signedIn"));
      router.replace(safeNext(portalFor(tok.user)));
    } catch (err) {
      setStatus("error");
      setDemoBusy(null);
      if (err instanceof ApiError && err.status === 403 && /verify/i.test(err.message)) {
        const r = await api.resendOtp(creds.email.trim()).catch(() => null);
        pendingOtp.save({ email: creds.email.trim(), code: r?.dev_otp, purpose: "verify_email", staff: role !== "student" });
        router.push("/verify");
        return;
      }
      setError(errText(err, t("common.error")));
      setTimeout(() => setStatus("idle"), 1200);
    }
  };
  const demo = (e: string) => { setDemoBusy(e); setEmail(e); setPassword(DEMO_PASSWORD); void submit(undefined, { email: e, password: DEMO_PASSWORD }); };

  // Landing-page shortcuts: /teacher/login?demo=<email> signs straight in as that demo teacher.
  const autoDemo = useRef(false);
  useEffect(() => {
    if (autoDemo.current) return;
    autoDemo.current = true;
    const want = new URLSearchParams(window.location.search).get("demo");
    if (role === "teacher" && want && DEMO_TEACHERS.some((d) => d.email === want)) demo(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titles: Record<LoginRole, [string, string]> = {
    student: [t("auth.welcomeBack"), t("auth.loginSub")],
    teacher: [hi ? "शिक्षक साइन इन" : "Teacher sign in", hi ? "आपके छात्र, उनके डाउट और टेस्ट — आपकी डेस्क पर।" : "Your students, their doubts and your tests — on your desk."],
    admin: [hi ? "एडमिन साइन इन" : "Admin sign in", hi ? "पूरे स्कूल का हाल, शिक्षक और सिस्टम।" : "The whole school at a glance: teachers, learners and system health."],
  };
  const doors: Array<{ r: LoginRole; label: string; icon: React.ReactNode }> = [
    { r: "student", label: hi ? "छात्र" : "Student", icon: <UserRound className="h-3.5 w-3.5" /> },
    { r: "teacher", label: hi ? "शिक्षक" : "Teacher", icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { r: "admin", label: hi ? "एडमिन" : "Admin", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <div className="mb-6 grid grid-cols-3 rounded-2xl border border-line bg-paper-2 p-1" role="tablist">
        {doors.map((d) => (
          <Link key={d.r} href={ROUTE[d.r]} role="tab" aria-selected={role === d.r}
            className={cn("relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium", role === d.r ? "text-ink" : "text-ink-3 hover:text-ink")}>
            {role === d.r && <motion.span layoutId="login-door" className="absolute inset-0 rounded-xl bg-surface shadow-[var(--shadow-soft)]" />}
            <span className="relative flex items-center gap-1.5">{d.icon}{d.label}</span>
          </Link>
        ))}
      </div>
      <AuthHeading title={titles[role][0]} sub={titles[role][1]} />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field id="email" label={t("auth.email")} error={errors.email} index={0}>
          <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
        </Field>
        <Field id="password" label={t("auth.password")} error={errors.password} index={1}
          hint={<Link href="/forgot" className="text-sm text-sky-700 hover:underline">{t("auth.forgot")}</Link>}>
          <PasswordInput id="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} showLabel={t("auth.showPassword")} hideLabel={t("auth.hidePassword")} />
        </Field>
        <FormAlert>{error}</FormAlert>
        <Button type="submit" className="w-full" size="lg" variant={role === "student" ? "primary" : "ink"} status={status} loadingLabel={t("auth.signingIn")}>
          {t("auth.signIn")}
        </Button>
        {role !== "teacher" && (
          <Button type="button" variant="soft" className="w-full" icon={<Sparkles className="h-4 w-4" />}
            onClick={() => demo(role === "student" ? DEMO_STUDENT.email : DEMO_ADMIN.email)}>
            {t("auth.demo")}{role === "student" ? ` · ${DEMO_STUDENT.label}` : ""}
          </Button>
        )}
      </form>

      {role === "teacher" && (
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3"><Sparkles className="h-3.5 w-3.5 text-sky-600" />{hi ? "डेमो शिक्षक — एक विषय चुनें" : "Try a demo teacher — pick a subject"}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_TEACHERS.map((d) => (
              <button key={d.email} type="button" onClick={() => demo(d.email)} disabled={!!demoBusy}
                className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-sky-300 hover:bg-sky-50 disabled:opacity-60">
                <span className="text-lg leading-none">{demoBusy === d.email ? <Loader2 className="h-4 w-4 animate-spin" /> : d.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-ink">{hi ? d.hi : d.subject}</span>
                  <span className="block truncate text-[0.65rem] text-ink-3">{d.name} · {d.boards}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-2 text-center text-sm text-ink-2">
        <p>
          {role === "student" ? t("auth.noAccount") : t("staff.newAccount")}{" "}
          <Link href={role === "student" ? "/signup" : `/staff/signup?role=${role}`} className="font-medium text-sky-700 hover:underline">{t("auth.createOne")}</Link>
        </p>
      </div>
    </>
  );
}
