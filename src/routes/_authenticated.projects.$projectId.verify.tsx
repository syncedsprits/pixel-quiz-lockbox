import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, MailCheck, RotateCcw, ShieldCheck, Timer } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { getProject } from "@/data/projects";
import { accessStatusQuery } from "@/lib/access/access-queries";
import { requestOtp, verifyOtp } from "@/lib/access/access.functions";
import { OTP_EXPIRED_MESSAGE } from "@/lib/access/otp-rules";

export const Route = createFileRoute("/_authenticated/projects/$projectId/verify")({
  loader: async ({ params, context }) => {
    const project = getProject(params.projectId);
    if (!project || project.quiz.length === 0) throw notFound();
    const status = await context.queryClient.fetchQuery(accessStatusQuery(project.id));
    // Email verification only opens after a passing quiz (2+ correct), checked on the server.
    if (!status.quizPassed) throw redirect({ to: "/projects/$projectId/quiz", params: { projectId: project.id } });
    if (status.emailVerified) {
      throw redirect({ to: "/projects/$projectId", params: { projectId: project.id }, hash: "project-files" });
    }
    return { project };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Verify your email · ${loaderData.project.shortName} — HandoverPulse` },
          { name: "description", content: `Verify your email with a one-time code to open ${loaderData.project.shortName} files.` },
          { property: "og:title", content: `Verify your email · ${loaderData.project.shortName}` },
          { property: "og:description", content: `Verify your email with a one-time code to open ${loaderData.project.shortName} files.` },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
          { name: "robots", content: "noindex" },
        ]
      : [{ title: "Verification unavailable — HandoverPulse" }, { name: "robots", content: "noindex" }],
  }),
  component: VerifyEmailPage,
});

const emailSchema = z.string().trim().max(254).email();

function useServerClock(serverNow: string, fetchedAt: number) {
  const offset = useMemo(() => Date.parse(serverNow) - fetchedAt, [serverNow, fetchedAt]);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const t = window.setInterval(() => setNow(Date.now() + offset), 250);
    return () => window.clearInterval(t);
  }, [offset]);
  return now;
}

const secondsUntil = (iso: string | null, now: number) => (iso ? Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000)) : 0);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function VerifyEmailPage() {
  const { project } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const statusQuery = useSuspenseQuery(accessStatusQuery(project.id));
  const status = statusQuery.data;
  const now = useServerClock(status.serverNow, statusQuery.dataUpdatedAt);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [changingEmail, setChangingEmail] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const codeSent = !!status.maskedEmail && !changingEmail;
  const expiresIn = secondsUntil(status.otpExpiresAt, now);
  const resendIn = secondsUntil(status.resendAvailableAt, now);
  const expired = codeSent && expiresIn === 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: accessStatusQuery(project.id).queryKey });

  async function send(target: string | null) {
    setSending(true);
    setEmailError(null);
    setCodeError(null);
    try {
      const res = await requestOtp({ data: { projectId: project.id, email: target ?? "" } });
      if (!res.ok) {
        if (target === null || codeSent) setCodeError(res.error);
        else setEmailError(res.error);
        return;
      }
      setCode("");
      setChangingEmail(false);
      toast.success(target === null ? "New code sent" : "Code sent", { description: `Check ${res.maskedEmail}` });
      await refresh();
    } catch {
      const msg = "The code couldn't be sent. Please try again.";
      if (codeSent) setCodeError(msg);
      else setEmailError(msg);
    } finally {
      setSending(false);
    }
  }

  function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError("Enter a valid email address.");
      return;
    }
    void send(parsed.data);
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Enter the 6-digit code from the email.");
      return;
    }
    setVerifying(true);
    setCodeError(null);
    try {
      const res = await verifyOtp({ data: { projectId: project.id, code } });
      if (!res.ok) {
        setCodeError(res.error);
        setCode("");
        await refresh();
        return;
      }
      toast.success("Verification successful", { description: `Your email is verified. ${project.shortName} files are now unlocked.` });
      await refresh();
      navigate({ to: "/projects/$projectId", params: { projectId: project.id }, hash: "project-files" });
    } catch {
      setCodeError("The code couldn't be checked. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {project.shortName}
      </Link>

      <div className="surface-card animate-fade-up p-7 sm:p-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-panel text-primary">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Verify your email</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {codeSent ? (
            <>
              We sent a 6-digit code to <strong className="text-foreground">{status.maskedEmail}</strong>. Enter it below to
              open the project files.
            </>
          ) : (
            "You passed the onboarding quiz. Enter your email and we'll send you a one-time code to open the project files."
          )}
        </p>

        {!codeSent ? (
          <form onSubmit={onSubmitEmail} noValidate className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="verify-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "verify-email-error" : undefined}
                  className="h-11 rounded-xl bg-background pl-10"
                />
              </div>
              {emailError && (
                <p id="verify-email-error" className="text-xs font-medium text-destructive">
                  {emailError}
                </p>
              )}
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={sending}>
              {sending && <Loader2 className="animate-spin" />}
              Get OTP
            </Button>
            {changingEmail && (
              <button
                type="button"
                onClick={() => setChangingEmail(false)}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Back to code entry
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={onVerify} noValidate className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="verify-code">One-time code</Label>
              <InputOTP
                id="verify-code"
                maxLength={6}
                inputMode="numeric"
                pattern="^[0-9]*$"
                autoComplete="one-time-code"
                value={code}
                onChange={(v) => setCode(v)}
                disabled={expired || verifying}
                containerClassName="justify-between"
              >
                <InputOTPGroup className="w-full justify-between gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot key={i} index={i} className="size-11 rounded-xl border bg-background text-base font-bold" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p
                className={
                  expired
                    ? "flex items-center gap-1.5 text-xs font-semibold text-destructive"
                    : "flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                }
                aria-live="polite"
              >
                <Timer className="size-3.5" />
                {expired ? OTP_EXPIRED_MESSAGE : `Code expires in ${clock(expiresIn)}`}
              </p>
            </div>

            {codeError && (
              <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">{codeError}</p>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={verifying || expired || code.length !== 6}>
              {verifying && <Loader2 className="animate-spin" />}
              Verify OTP
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="soft" size="sm" onClick={() => void send(null)} disabled={resendIn > 0 || sending}>
                {sending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                {resendIn > 0 ? `Resend OTP in ${clock(resendIn)}` : "Resend OTP"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setChangingEmail(true);
                  setCodeError(null);
                }}
                disabled={resendIn > 0}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Codes expire after 60 seconds and are checked on our server.
      </p>
    </div>
  );
}
