import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Logo } from "@/components/brand/Logo";
import { DemoBadge } from "@/components/common/DemoBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — HandoverPulse" },
      { name: "description", content: "Request a password reset link for your HandoverPulse account." },
      { property: "og:title", content: "Reset your password — HandoverPulse" },
      { property: "og:description", content: "Request a password reset link for your HandoverPulse account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { requestPasswordReset, mode } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await requestPasswordReset(email);
    setSubmitting(false);
    if (result.ok) {
      setError(null);
      setMessage(result.message);
    } else {
      setError(result.error);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero px-5 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <Logo to="/" />
        </div>
        <div className="surface-card p-7 sm:p-9">
          {message ? (
            <div className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
                <MailCheck className="size-6" />
              </span>
              <h1 className="mt-4 text-xl font-extrabold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              <Button asChild variant="hero" className="mt-6 w-full" size="lg">
                <Link to="/">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-extrabold">Forgot password?</h1>
                {mode === "demo" && <DemoBadge />}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!error}
                      className="h-11 rounded-xl bg-background pl-10"
                    />
                  </div>
                  {error && <p className="text-xs font-medium text-destructive">{error}</p>}
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="animate-spin" />}
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>
        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
