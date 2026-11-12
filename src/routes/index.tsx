import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import loginArt from "@/assets/login-handover.jpg";
import { Logo } from "@/components/brand/Logo";
import { DemoBadge } from "@/components/common/DemoBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { MIN_PASSWORD_LENGTH, entrySchema } from "@/lib/auth/validation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — HandoverPulse" },
      { name: "description", content: "Sign in to HandoverPulse to continue projects with complete handover knowledge." },
      { property: "og:title", content: "Sign in — HandoverPulse" },
      { property: "og:description", content: "Automated knowledge handover and project continuation engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

type FieldErrors = Partial<Record<"email" | "password" | "form", string>>;

function LoginPage() {
  const { signIn, status, mode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") navigate({ to: "/dashboard", replace: true });
  }, [status, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = entrySchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const result = await signIn(parsed.data);
    setSubmitting(false);
    if (!result.ok) setErrors({ form: result.error });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-hero lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo to="/" />
        <img
          src={loginArt}
          alt="Documents flowing between two teams, illustrating a project handover"
          width={1024}
          height={1280}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply"
        />
        <div className="relative max-w-md animate-fade-up">
          <h2 className="text-4xl font-extrabold leading-tight text-foreground">
            Pick up any project <span className="text-primary">exactly</span> where it was left.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Automated knowledge handover and project continuation — decisions, documents and context in one place.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo to="/" />
          </div>

          <div className="surface-card p-7 sm:p-9">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-extrabold text-foreground">Welcome back</h1>
              {mode === "demo" && <DemoBadge />}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>

            {mode === "demo" && (
              <div className="mt-5 rounded-xl border border-lavender/25 bg-lavender-soft p-3.5 text-xs leading-relaxed text-accent-foreground">
                <strong>Demo Mode:</strong> use any valid email and a password of at least {MIN_PASSWORD_LENGTH}{" "}
                characters. Your session stays in this browser only.
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className="h-11 rounded-xl bg-background pl-10"
                  />
                </div>
                {errors.email && <p id="email-error" className="text-xs font-medium text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="h-11 rounded-xl bg-background px-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs font-medium text-destructive">{errors.password}</p>
                )}
              </div>

              {errors.form && (
                <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">{errors.form}</p>
              )}

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Sign In
              </Button>
            </form>

          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Project files stay protected by quiz and email verification.
          </p>
        </div>
      </main>
    </div>
  );
}
