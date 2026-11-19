import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { QuizGrade } from "./quiz-grading";
import {
  projectOnlySchema,
  requestOtpSchema,
  submitQuizSchema,
  verifyOtpSchema,
  decideApprovalSchema,
  type ApprovalRequest,
  type AccessStatus,
  type ActionResult,
} from "./access-schemas";

export type { AccessStatus } from "./access-schemas";

// Thin server-function wrappers used when the site is served by Lovable hosting.
// The logic lives in access-ops.server.ts, shared with /api/public/hp/$op.

/** Grades the quiz on the server. Only a pass (2+ correct) creates an access session. */
export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => submitQuizSchema.parse(d))
  .handler(async ({ data, context }): Promise<QuizGrade & { accessToken?: string }> => {
    const { runSubmitQuiz } = await import("./access-ops.server");
    return runSubmitQuiz(data, context.userId);
  });

/** Ends every project access session of the signed-in user (used on log out). */
export const endAllAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runEndAllAccess } = await import("./access-ops.server");
    return runEndAllAccess(context.userId);
  });

export const getAccessStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => projectOnlySchema.parse(d))
  .handler(async ({ data, context }): Promise<AccessStatus> => {
    const { runGetAccessStatus } = await import("./access-ops.server");
    return runGetAccessStatus(data, context.userId);
  });

/** Generates a 6-digit code on the server, stores only its keyed hash and emails it via Gmail. */
export const requestOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => requestOtpSchema.parse(d))
  .handler(async ({ data, context }): Promise<ActionResult<{ maskedEmail: string }>> => {
    const { runRequestOtp } = await import("./access-ops.server");
    return runRequestOtp(data, context.userId);
  });

/** Verifies the code on the server; success unlocks the project's files for this access session. */
export const verifyOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => verifyOtpSchema.parse(d))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const { runVerifyOtp } = await import("./access-ops.server");
    return runVerifyOtp(data, context.userId);
  });

/** Sends this verified request to Old Admin for a decision. */
export const requestApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => projectOnlySchema.parse(d))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const { runRequestApproval } = await import("./access-ops.server");
    return runRequestApproval(data, context.userId);
  });

export const listApprovalRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => projectOnlySchema.parse(d))
  .handler(async ({ data, context }): Promise<ApprovalRequest[]> => {
    const { runListApprovalRequests } = await import("./access-ops.server");
    return runListApprovalRequests(data, context.userId);
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => decideApprovalSchema.parse(d))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const { runDecideApproval } = await import("./access-ops.server");
    return runDecideApproval(data, context.userId);
  });
