import type { AuthAdapter, AuthSession } from "./types";
import { emailSchema, nameFromEmail, signInSchema } from "./validation";

/**
 * Demo Mode adapter.
 * - Accepts any well-formed email with a valid-length password; nothing is sent to a server.
 * - The password is validated but never stored.
 * - Demo sessions only unlock the fictional sample workspace in src/data — no real project data.
 * Replace with a production adapter in src/lib/auth/index.ts.
 */
export const DEMO_SESSION_KEY = "handoverpulse.demo-session";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const s = value as AuthSession;
  return (
    s.mode === "demo" &&
    typeof s.issuedAt === "string" &&
    !!s.user &&
    typeof s.user.id === "string" &&
    typeof s.user.name === "string" &&
    emailSchema.safeParse(s.user.email).success
  );
}

export const demoAdapter: AuthAdapter = {
  mode: "demo",

  async getSession() {
    const raw = storage()?.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  async signIn(input) {
    const result = signInSchema.safeParse(input);
    if (!result.success) {
      return { ok: false, error: result.error.issues[0]?.message ?? "Invalid credentials" };
    }
    const email = result.data.email.toLowerCase();
    const session: AuthSession = {
      mode: "demo",
      issuedAt: new Date().toISOString(),
      user: { id: `demo-${email}`, email, name: nameFromEmail(email) },
    };
    storage()?.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  },

  async signOut() {
    storage()?.removeItem(DEMO_SESSION_KEY);
  },

  async requestPasswordReset(email) {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      return { ok: false, error: result.error.issues[0]?.message ?? "Invalid email" };
    }
    return {
      ok: true,
      message:
        "Demo Mode doesn't send emails. In production, a secure reset link will be sent to this address.",
    };
  },
};
