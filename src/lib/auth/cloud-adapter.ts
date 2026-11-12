import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { clearAllAccessTokens } from "@/lib/access/access-token";
import type { AuthAdapter, AuthSession } from "./types";
import { emailSchema, entrySchema, nameFromEmail, signInSchema } from "./validation";

/**
 * Demo entry: any non-empty email + password opens a fresh anonymous Lovable Cloud session.
 * The entered email is kept only as a display label; project quiz/OTP access stays bound to
 * that session's user id on the server.
 */
export function toSession(user: User, issuedAt = new Date().toISOString()): AuthSession {
  const entered = typeof user.user_metadata?.["entered_email"] === "string" ? (user.user_metadata["entered_email"] as string) : "";
  const email = (user.email || entered).trim().toLowerCase();
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
    const parsed = entrySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter your email and password" };
    // The password is not checked or stored; it only has to be non-empty.
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { entered_email: parsed.data.email.trim().toLowerCase() } },
    });
    if (error || !data.user) return { ok: false, error: friendlyAuthError(error?.message ?? "") };
    return { ok: true, session: toSession(data.user) };
  },

  async signUp(input) {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("already registered")) return { ok: false, error: "An account with this email already exists. Sign in instead." };
      if (m.includes("not allowed") || m.includes("invalid")) {
        return { ok: false, error: "This email address can't receive email. Please use a real address." };
      }
      if (m.includes("password")) return { ok: false, error: "Choose a stronger password." };
      return { ok: false, error: "Your account couldn't be created. Please try again." };
    }
    // Email confirmation is required: the account can sign in only after the link in the email is opened.
    return { ok: true, message: "Check your inbox and open the confirmation link, then sign in." };
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
