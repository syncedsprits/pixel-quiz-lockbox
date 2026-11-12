/** Files the user actually opened or downloaded, kept in this browser. */
const KEY = "handoverpulse.recent-files";
const MAX = 8;

export interface RecentFileEntry {
  projectId: string;
  fileId: string;
  name: string;
  kind: string;
  source: "reference" | "upload";
  at: string;
}

export function getRecentFiles(): RecentFileEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentFileEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentFile(entry: Omit<RecentFileEntry, "at">) {
  try {
    const next = [
      { ...entry, at: new Date().toISOString() },
      ...getRecentFiles().filter((e) => !(e.fileId === entry.fileId && e.projectId === entry.projectId)),
    ].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: recent-file history is optional.
  }
}

export function forgetRecentFile(projectId: string, fileId: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(getRecentFiles().filter((e) => !(e.fileId === fileId && e.projectId === projectId))));
  } catch {
    // ignore
  }
}
