import { getRequestHeader } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ACCESS_HEADER, parseAccessTokens } from "./access-token";
import { codeFromRandom } from "./otp-rules";
import { QUIZ_PASS_MIN_CORRECT } from "./quiz-grading";

/** Upper bound on the server; the browser drops its token when the browser session ends. */
export const ACCESS_SESSION_HOURS = 12;

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type AccessSession = {
  id: string;
  user_id: string;
  project_id: string;
  quiz_score: number;
  quiz_total: number;
  email: string | null;
  otp_sent_at: string | null;
  otp_send_count: number;
  otp_window_started_at: string | null;
  otp_attempts: number;
  otp_hash: string | null;
  email_verified_at: string | null;
  expires_at: string;
};

/** Reads this request's token for a project from the access header. */
export function accessTokenFrom(headerValue: string | null | undefined, projectId: string): string | null {
  return parseAccessTokens(headerValue)[projectId] ?? null;
}

/**
 * Looks up the signed-in caller's access session for a project. The session must have been
 * created by this same user AND the request must carry this browser session's token.
 */
export async function getAccessSession(projectId: string, userId: string): Promise<AccessSession | null> {
  const token = accessTokenFrom(getRequestHeader(ACCESS_HEADER), projectId);
  if (!token) return null;
  return getAccessSessionByToken(projectId, userId, token);
}

export async function getAccessSessionByToken(
  projectId: string,
  userId: string,
  token: string,
): Promise<AccessSession | null> {
  const { data, error } = await supabaseAdmin
    .from("project_access_sessions")
    .select(
      "id, user_id, project_id, quiz_score, quiz_total, email, otp_sent_at, otp_send_count, otp_window_started_at, otp_attempts, otp_hash, email_verified_at, expires_at",
    )
    .eq("token_hash", await sha256Hex(token))
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Access check failed.");
  if (!data || new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data as AccessSession;
}

/** True only when the quiz was passed AND the email OTP was verified for this project. */
export function hasFileAccess(s: AccessSession | null): boolean {
  return !!s && s.quiz_score >= QUIZ_PASS_MIN_CORRECT && !!s.email_verified_at;
}

/** Cryptographically secure, uniformly random 6-digit code. */
export function generateOtpCode(): string {
  const buf = new Uint32Array(1);
  return codeFromRandom(() => {
    crypto.getRandomValues(buf);
    return buf[0]!;
  });
}

/** Keyed hash binding a code to one access session and one email address. Only this hash is stored. */
export async function otpHash(sessionId: string, email: string, code: string): Promise<string> {
  const secret = process.env["OTP_HASH_SECRET"];
  if (!secret) throw new Error("OTP_HASH_SECRET is not configured.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${sessionId}:${email}:${code}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies a bearer access token from a raw request and returns the signed-in user's id. */
export async function userIdFromRequest(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token.split(".").length !== 3) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
