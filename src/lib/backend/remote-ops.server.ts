import type { ZodType } from "zod";

import {
  projectOnlySchema,
  requestOtpSchema,
  submitQuizSchema,
  verifyOtpSchema,
} from "@/lib/access/access-schemas";
import { assistantInputSchema } from "@/lib/assistant/assistant.functions";
import { deleteUploadSchema, listUploadsSchema } from "@/lib/files/uploads-schemas";
import { updateProfileSchema } from "@/lib/profile/profile-schemas";
import type { RemoteOp } from "./remote-backend";

/** Input that failed validation; its message is safe to show. */
export class BadInput extends Error {}

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new BadInput(r.error.issues[0]?.message ?? "Invalid request.");
  return r.data;
}

const OPS: Record<RemoteOp, (input: unknown, userId: string) => Promise<unknown>> = {
  "submit-quiz": async (input, userId) =>
    (await import("@/lib/access/access-ops.server")).runSubmitQuiz(parse(submitQuizSchema, input), userId),
  "end-all-access": async (_input, userId) => (await import("@/lib/access/access-ops.server")).runEndAllAccess(userId),
  "access-status": async (input, userId) =>
    (await import("@/lib/access/access-ops.server")).runGetAccessStatus(parse(projectOnlySchema, input), userId),
  "request-otp": async (input, userId) =>
    (await import("@/lib/access/access-ops.server")).runRequestOtp(parse(requestOtpSchema, input), userId),
  "verify-otp": async (input, userId) =>
    (await import("@/lib/access/access-ops.server")).runVerifyOtp(parse(verifyOtpSchema, input), userId),
  "ask-assistant": async (input, userId) =>
    (await import("@/lib/assistant/assistant-ops.server")).runAskAssistant(parse(assistantInputSchema, input), userId),
  "list-uploads": async (input, userId) =>
    (await import("@/lib/files/uploads-ops.server")).runListUploads(parse(listUploadsSchema, input), userId),
  "delete-upload": async (input, userId) =>
    (await import("@/lib/files/uploads-ops.server")).runDeleteUpload(parse(deleteUploadSchema, input), userId),
  "get-profile": async (_input, userId) => (await import("@/lib/profile/profile-ops.server")).runGetProfile(userId),
  "update-profile": async (input, userId) =>
    (await import("@/lib/profile/profile-ops.server")).runUpdateProfile(parse(updateProfileSchema, input), userId),
};

export function isRemoteOp(op: string): op is RemoteOp {
  return Object.prototype.hasOwnProperty.call(OPS, op);
}

export function runRemoteOp(op: RemoteOp, input: unknown, userId: string): Promise<unknown> {
  return OPS[op](input, userId);
}
