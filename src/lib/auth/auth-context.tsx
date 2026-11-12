import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { clearAllAccessTokens } from "@/lib/access/access-token";
import { authAdapter } from "./index";
import type { AuthAdapter, AuthSession, SignInInput, SignInResult } from "./types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  mode: AuthAdapter["mode"];
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(): Promise<void>;
  requestPasswordReset: AuthAdapter["requestPasswordReset"];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  adapter = authAdapter,
}: {
  children: ReactNode;
  adapter?: AuthAdapter;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let active = true;
    const refresh = () =>
      adapter.getSession().then((s) => {
        if (!active) return;
        setSession(s);
        setStatus(s ? "authenticated" : "unauthenticated");
      });
    void refresh();
    // Keep the UI in step with sign-in, sign-out and expired sessions (also from other tabs).
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearAllAccessTokens();
        setSession(null);
        setStatus("unauthenticated");
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void refresh();
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [adapter]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const result = await adapter.signIn(input);
      if (result.ok) {
        setSession(result.session);
        setStatus("authenticated");
      }
      return result;
    },
    [adapter],
  );

  const signOut = useCallback(async () => {
    await adapter.signOut();
    setSession(null);
    setStatus("unauthenticated");
  }, [adapter]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      mode: adapter.mode,
      signIn,
      signOut,
      requestPasswordReset: adapter.requestPasswordReset,
    }),
    [status, session, adapter, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
