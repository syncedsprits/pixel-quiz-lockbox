/**
 * The role picked before a project's quiz, kept for this browser session only (like the access
 * token), so the question isn't asked again during the same session. It is also saved on the
 * server with the access session when the quiz is submitted.
 */
import { normalizeRole } from "./role-order";

const STORAGE_KEY = "handoverpulse.project-roles";

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function readAll(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(store()?.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function readProjectRole(projectId: string): string | null {
  const v = readAll()[projectId];
  return typeof v === "string" ? normalizeRole(v) : null;
}

export function saveProjectRole(projectId: string, role: string) {
  const r = normalizeRole(role);
  const s = store();
  if (!s || !r) return;
  s.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [projectId]: r }));
}

export function clearAllProjectRoles() {
  store()?.removeItem(STORAGE_KEY);
}
