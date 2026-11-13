import { supabase } from "@/integrations/supabase/client";
import { accessHeaders } from "@/lib/access/access-token";

/**
 * Optional "remote backend" mode for a copy of this site hosted outside Lovable (e.g. Vercel).
 *
 * Set VITE_HP_BACKEND_URL (build time) to the Lovable-hosted address of this same app, e.g.
 * https://pixel-quiz-lockbox.lovable.app. The browser then sends quiz, email-code, file and
 * assistant requests there, where the trusted server code and its secrets run. When the
 * variable is empty, or points at the current site, the normal same-site server functions
 * are used (Lovable hosting and the editor preview).
 */
const RAW_BACKEND_URL = String(import.meta.env["VITE_HP_BACKEND_URL"] ?? "").trim();

export function remoteBackendOrigin(): string | null {
  if (!RAW_BACKEND_URL || typeof window === "undefined") return null;
  try {
    const url = new URL(RAW_BACKEND_URL);
    if (url.origin === window.location.origin) return null;
    if (url.protocol !== "https:" && !import.meta.env.DEV) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Headers proving who is asking: the sign-in token plus this browser session's project access tokens. */
export async function backendAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { ...accessHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export type RemoteOp =
  | "submit-quiz"
  | "end-all-access"
  | "access-status"
  | "request-otp"
  | "verify-otp"
  | "ask-assistant";

const UNREACHABLE = "The server couldn't be reached. Please try again.";

/** Calls one operation on the Lovable-hosted backend and returns its result, or throws its error message. */
export async function callRemote<T>(origin: string, op: RemoteOp, data: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${origin}/api/public/hp/${op}`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: { "content-type": "application/json", ...(await backendAuthHeaders()) },
      body: JSON.stringify(data ?? {}),
    });
  } catch {
    throw new Error(UNREACHABLE);
  }
  const body = (await res.json().catch(() => null)) as { result?: T; error?: string } | null;
  if (!res.ok || !body || !("result" in body)) throw new Error(body?.error || UNREACHABLE);
  return body.result as T;
}
