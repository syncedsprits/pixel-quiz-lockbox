import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/auth/validation";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — HandoverPulse" },
      { name: "description", content: "Choose a new password for your HandoverPulse account." },
      { property: "og:title", content: "Set a new password — HandoverPulse" },
      { property: "og:description", content: "Choose a new password for your HandoverPulse account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The reset link signs the user in with a short-lived recovery session.
  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (active && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setReady("ok");
    });
    const t = window.setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      if (active) setReady((r) => (r === "ok" || s.session ? "ok" : "invalid"));
    }, 800);
    return () => {
      active = false;
      window.clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid password");
    if (password !== confirm) return setError("The passwords don't match.");
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) return setError("Your password couldn't be updated. Please request a new reset link.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero px-5 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center">
          <Logo to="/" />
        </div>
        <div className="surface-card p-7 sm:p-9">
          <h1 className="text-2xl font-extrabold">Set a new password</h1>
          {ready === "invalid" ? (
            <>
              <p className="mt-1.5 text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Button asChild variant="hero" className="mt-6 w-full" size="lg">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-muted-foreground">Choose a password with at least 8 characters.</p>
              <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
                {(["new-password", "confirm-password"] as const).map((id) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id}>{id === "new-password" ? "New password" : "Confirm password"}</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id={id}
                        type="password"
                        autoComplete="new-password"
                        value={id === "new-password" ? password : confirm}
                        onChange={(e) => (id === "new-password" ? setPassword : setConfirm)(e.target.value)}
                        className="h-11 rounded-xl bg-background pl-10"
                      />
                    </div>
                  </div>
                ))}
                {error && (
                  <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">{error}</p>
                )}
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting || ready !== "ok"}>
                  {(submitting || ready === "checking") && <Loader2 className="animate-spin" />}
                  Save new password
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Your new password is stored securely.
        </p>
        <Link
          to="/"
          className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
