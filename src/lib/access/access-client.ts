import { callRemote, remoteBackendOrigin } from "@/lib/backend/remote-backend";
import * as fns from "./access.functions";
import type { AccessStatus, ActionResult } from "./access-schemas";
import type { QuizGrade } from "./quiz-grading";

/**
 * Browser entry points for the quiz / email-code flow. Same call shape as the server functions;
 * when the site runs outside Lovable hosting (VITE_HP_BACKEND_URL set), the calls go to the
 * Lovable-hosted backend instead, which runs exactly the same server logic.
 */
type Input<T> = { data: T };

export function submitQuiz({ data }: Input<{ projectId: string; answers: number[]; role: string | null }>) {
  const origin = remoteBackendOrigin();
  return origin
    ? callRemote<QuizGrade & { accessToken?: string }>(origin, "submit-quiz", data)
    : fns.submitQuiz({ data });
}

export function endAllAccess() {
  const origin = remoteBackendOrigin();
  return origin ? callRemote<{ ok: boolean }>(origin, "end-all-access", {}) : fns.endAllAccess();
}

export function getAccessStatus({ data }: Input<{ projectId: string }>): Promise<AccessStatus> {
  const origin = remoteBackendOrigin();
  return origin ? callRemote<AccessStatus>(origin, "access-status", data) : fns.getAccessStatus({ data });
}

export function requestOtp({ data }: Input<{ projectId: string; email: string }>) {
  const origin = remoteBackendOrigin();
  return origin
    ? callRemote<ActionResult<{ maskedEmail: string }>>(origin, "request-otp", data)
    : fns.requestOtp({ data });
}

export function verifyOtp({ data }: Input<{ projectId: string; code: string }>) {
  const origin = remoteBackendOrigin();
  return origin ? callRemote<ActionResult>(origin, "verify-otp", data) : fns.verifyOtp({ data });
}
