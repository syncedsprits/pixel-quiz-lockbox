import type { Project } from "@/data/types";

/**
 * Who may see, open and remove shared project uploads. Pure rules so they can be tested;
 * the server applies them on every request.
 */

/** Signed-in users see a project's shared uploads; quiz-protected projects also need quiz + verified email code. */
export function canSeeSharedUploads(project: Project | undefined, hasVerifiedFileAccess: boolean): boolean {
  if (!project) return false;
  return project.quiz.length === 0 || hasVerifiedFileAccess;
}

/** Only the person (same sign-in) who uploaded a shared file may remove it. */
export function canRemoveSharedUpload(uploadedBy: string, userId: string): boolean {
  return !!uploadedBy && uploadedBy === userId;
}

export const UPLOAD_SUMMARY_MAX = 200;
