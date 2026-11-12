import { getCookie } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { codeFromRandom } from "./otp-rules";
import { QUIZ_PASS_MIN_CORRECT } from "./quiz-grading";

export const accessCookieName = (projectId: string) => `hp_access_${projectId.replace(/[^a-z0-9-]/gi, "")}`;
/** Upper bound on the server; the cookie itself is a browser-session cookie. */
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

/** Looks up the caller's access session for a project from its HTTP-only cookie. */
export async function getAccessSession(projectId: string): Promise<AccessSession | null> {
  const token = getCookie(accessCookieName(projectId));
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return getAccessSessionByToken(projectId, token);
}

export async function getAccessSessionByToken(projectId: string, token: string): Promise<AccessSession | null> {
  const { data, error } = await supabaseAdmin
    .from("project_access_sessions")
    .select(
      "id, project_id, quiz_score, quiz_total, email, otp_sent_at, otp_send_count, otp_window_started_at, otp_attempts, otp_hash, email_verified_at, expires_at",
    )
    .eq("token_hash", await sha256Hex(token))
    .eq("project_id", projectId)
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
