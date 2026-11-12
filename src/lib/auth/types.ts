/**
 * Auth contracts. The UI only talks to `AuthAdapter`, so swapping the demo adapter
 * for a production one (e.g. Lovable Cloud) does not touch any page or component.
 */
export type AuthMode = "demo" | "production";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  user: AuthUser;
  mode: AuthMode;
  issuedAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type SignInResult = { ok: true; session: AuthSession } | { ok: false; error: string };

export type PasswordResetResult = { ok: true; message: string } | { ok: false; error: string };

export interface AuthAdapter {
  mode: AuthMode;
  getSession(): Promise<AuthSession | null>;
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<PasswordResetResult>;
}
