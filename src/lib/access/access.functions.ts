import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getProject } from "@/data/projects";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_SEND_WINDOW_MINUTES,
  OTP_TTL_SECONDS,
  OTP_EXPIRED_MESSAGE,
  OTP_INCORRECT_MESSAGE,
  canResend,
  isOtpExpired,
} from "./otp-rules";
import { gradeQuiz, maskEmail, type QuizGrade } from "./quiz-grading";

const projectIdSchema = z.string().min(1).max(64);

export interface AccessStatus {
  quizPassed: boolean;
  quizScore: number | null;
  quizTotal: number | null;
  emailVerified: boolean;
  maskedEmail: string | null;
  /** ISO time the current code stops working, when one is active. */
  otpExpiresAt: string | null;
  /** ISO time Resend OTP becomes available. */
  resendAvailableAt: string | null;
  serverNow: string;
}

type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function requireProtectedProject(projectId: string) {
  const project = getProject(projectId);
  if (!project || project.quiz.length === 0) throw new Error("This project isn't protected by a quiz.");
  return project;
}

/** Grades the quiz on the server. Only a pass (2+ correct) creates an access session. */
export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: projectIdSchema, answers: z.array(z.number().int()).max(50) }).parse(d))
  .handler(async ({ data, context }): Promise<QuizGrade & { accessToken?: string }> => {
    const project = requireProtectedProject(data.projectId);
    const { ACCESS_SESSION_HOURS, randomToken, sha256Hex } = await import("./access.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const grade = gradeQuiz(project.quiz, data.answers);

    // Any new attempt replaces this user's earlier access: a failed retake never keeps old access.
    await supabaseAdmin
      .from("project_access_sessions")
      .delete()
      .eq("user_id", context.userId)
      .eq("project_id", project.id);

    if (!grade.passed) return grade;

    const token = randomToken();
    const expiresAt = new Date(Date.now() + ACCESS_SESSION_HOURS * 3600_000);
    const { error } = await supabaseAdmin.from("project_access_sessions").insert({
      token_hash: await sha256Hex(token),
      user_id: context.userId,
      project_id: project.id,
      quiz_score: grade.score,
      quiz_total: grade.total,
      expires_at: expiresAt.toISOString(),
    });
    if (error) throw new Error("Your quiz result couldn't be saved. Please try again.");
    // The browser keeps this token for the current browser session only (sessionStorage).
    return { ...grade, accessToken: token };
  });

/** Ends every project access session of the signed-in user (used on log out). */
export const endAllAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("project_access_sessions").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const getAccessStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: projectIdSchema }).parse(d))
  .handler(async ({ data, context }): Promise<AccessStatus> => {
    const { getAccessSession } = await import("./access.server");
    const s = await getAccessSession(data.projectId, context.userId);
    const now = new Date();
    const sentAt = s?.otp_sent_at ? new Date(s.otp_sent_at) : null;
    return {
      quizPassed: !!s,
      quizScore: s?.quiz_score ?? null,
      quizTotal: s?.quiz_total ?? null,
      emailVerified: !!s?.email_verified_at,
      maskedEmail: s?.email ? maskEmail(s.email) : null,
      otpExpiresAt:
        sentAt && !s?.email_verified_at && !isOtpExpired(sentAt, now)
          ? new Date(sentAt.getTime() + OTP_TTL_SECONDS * 1000).toISOString()
          : null,
      resendAvailableAt: sentAt ? new Date(sentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000).toISOString() : null,
      serverNow: now.toISOString(),
    };
  });

const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

/** Generates a 6-digit code on the server, stores only its keyed hash and emails it via Gmail. */
export const requestOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: projectIdSchema, email: z.string().max(320) }).parse(d))
  .handler(async ({ data, context }): Promise<ActionResult<{ maskedEmail: string }>> => {
    const { getAccessSession, generateOtpCode, otpHash } = await import("./access.server");
    const { sendOtpEmail } = await import("./otp-email.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await getAccessSession(data.projectId, context.userId);
    if (!s) return { ok: false, error: "Pass the onboarding quiz before requesting a code." };
    if (s.email_verified_at) return { ok: false, error: "Your email is already verified." };

    // An empty email means "resend to the same address".
    const parsed = emailSchema.safeParse(data.email.trim() === "" ? (s.email ?? "") : data.email);
    if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
    const email = parsed.data;

    const now = new Date();
    if (!canResend(s.otp_sent_at ? new Date(s.otp_sent_at) : null, now)) {
      return { ok: false, error: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new code.` };
    }
    const windowStart = s.otp_window_started_at ? new Date(s.otp_window_started_at) : null;
    const windowActive = windowStart && now.getTime() - windowStart.getTime() < OTP_SEND_WINDOW_MINUTES * 60_000;
    const sendCount = windowActive ? s.otp_send_count : 0;
    if (sendCount >= OTP_MAX_SENDS_PER_WINDOW) {
      return { ok: false, error: "Too many codes requested. Please try again in an hour." };
    }

    // Store the new code's hash first: this immediately invalidates any previous code.
    const code = generateOtpCode();
    const { error: upd } = await supabaseAdmin
      .from("project_access_sessions")
      .update({
        email,
        otp_hash: await otpHash(s.id, email, code),
        otp_sent_at: now.toISOString(),
        otp_attempts: 0,
        otp_send_count: sendCount + 1,
        otp_window_started_at: windowActive && windowStart ? windowStart.toISOString() : now.toISOString(),
      })
      .eq("id", s.id);
    if (upd) return { ok: false, error: "A code couldn't be created. Please try again." };

    const sent = await sendOtpEmail(email, code);
    if (!sent.ok) {
      // Nothing was delivered: drop the unsent code and its countdown (the send still counts toward the limit).
      await supabaseAdmin.from("project_access_sessions").update({ otp_hash: null, otp_sent_at: null }).eq("id", s.id);
      return { ok: false, error: sent.error };
    }
    return { ok: true, maskedEmail: maskEmail(email) };
  });

/** Verifies the code on the server; success unlocks the project's files for this access session. */
export const verifyOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: projectIdSchema, code: z.string().max(12) }).parse(d))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const code = data.code.trim();
    if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code from the email." };

    const { getAccessSession, otpHash, safeEqual } = await import("./access.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await getAccessSession(data.projectId, context.userId);
    if (!s) return { ok: false, error: "Pass the onboarding quiz before verifying your email." };
    if (s.email_verified_at) return { ok: true };
    if (!s.email || !s.otp_sent_at || !s.otp_hash) return { ok: false, error: "Request a code first." };
    if (isOtpExpired(new Date(s.otp_sent_at), new Date())) return { ok: false, error: OTP_EXPIRED_MESSAGE };
    if (s.otp_attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      return { ok: false, error: "Too many incorrect attempts. Request a new code." };
    }

    const matches = safeEqual(await otpHash(s.id, s.email, code), s.otp_hash);
    if (!matches) {
      // Count the attempt only if the stored code is still the one that was checked.
      await supabaseAdmin
        .from("project_access_sessions")
        .update({ otp_attempts: s.otp_attempts + 1 })
        .eq("id", s.id)
        .eq("otp_hash", s.otp_hash);
      return { ok: false, error: OTP_INCORRECT_MESSAGE };
    }

    // Single use: the code is cleared in the same update that marks the email verified.
    const { data: updated, error: upd } = await supabaseAdmin
      .from("project_access_sessions")
      .update({ email_verified_at: new Date().toISOString(), otp_hash: null, otp_sent_at: null })
      .eq("id", s.id)
      .eq("otp_hash", s.otp_hash)
      .select("id");
    if (upd || !updated?.length) return { ok: false, error: "Verification couldn't be saved. Please request a new code." };
    return { ok: true };
  });
