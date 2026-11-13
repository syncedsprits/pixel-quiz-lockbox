import { z } from "zod";

import { normalizeRole, ROLE_MAX_LENGTH } from "@/lib/roles/role-order";

/** Input rules and result shapes shared by the browser, the server functions and the public API route. */
export const projectIdSchema = z.string().min(1).max(64);

export const projectOnlySchema = z.object({ projectId: projectIdSchema });

export const submitQuizSchema = z.object({
  projectId: projectIdSchema,
  answers: z.array(z.number().int()).max(50),
  // The role question comes before the quiz. It is saved for document ordering only.
  role: z
    .string()
    .max(ROLE_MAX_LENGTH * 2)
    .transform((r, ctx) => {
      const n = normalizeRole(r);
      if (!n) ctx.addIssue({ code: "custom", message: "Choose your role before the quiz." });
      return n ?? "";
    }),
});

export const requestOtpSchema = z.object({ projectId: projectIdSchema, email: z.string().max(320) });

export const verifyOtpSchema = z.object({ projectId: projectIdSchema, code: z.string().max(12) });

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

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
  /** Role picked before the quiz (document ordering only). */
  role: string | null;
}

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
