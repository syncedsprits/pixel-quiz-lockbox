import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { clearAllAccessTokens } from "@/lib/access/access-token";
import type { AuthAdapter, AuthSession } from "./types";
import { emailSchema, nameFromEmail, signInSchema } from "./validation";

/**
 * Real sign-in through Lovable Cloud accounts. Credentials are checked by the auth server;
 * there is no client-side fallback, so an unknown email or wrong password never gets in.
 */
export function toSession(user: User, issuedAt = new Date().toISOString()): AuthSession {
  const email = (user.email ?? "").toLowerCase();
  const metaName = typeof user.user_metadata?.["full_name"] === "string" ? (user.user_metadata["full_name"] as string) : "";
  return { mode: "production", issuedAt, user: { id: user.id, email, name: metaName.trim() || nameFromEmail(email) } };
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email address before signing in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  return "Sign-in failed. Please try again.";
}

export const cloudAdapter: AuthAdapter = {
  mode: "production",

  async getSession() {
    // getUser() re-validates the stored session with the auth server instead of trusting local storage.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return toSession(data.user);
  },

  async signIn(input) {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    });
    if (error || !data.user) return { ok: false, error: friendlyAuthError(error?.message ?? "") };
    return { ok: true, session: toSession(data.user) };
  },

  async signOut() {
    try {
      // End project file access on the server before the sign-in session goes away.
      const { endAllAccess } = await import("@/lib/access/access.functions");
      await endAllAccess();
    } catch {
      /* the session may already be gone; local cleanup below still runs */
    }
    clearAllAccessTokens();
    await supabase.auth.signOut();
  },

  async requestPasswordReset(email) {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { ok: false, error: "The reset link couldn't be sent. Please try again in a moment." };
    return { ok: true, message: "If an account exists for this email, a password reset link is on its way." };
  },
};
