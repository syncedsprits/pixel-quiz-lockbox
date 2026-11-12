/** Rules for reading ZIP archives safely. Nothing inside an archive is ever executed. */
export const MAX_ZIP_ENTRIES = 2000;
export const MAX_ZIP_UNCOMPRESSED_BYTES = 300 * 1024 * 1024;

/** Rejects absolute paths, drive letters, NUL bytes and any ".." segment (path traversal). */
export function isUnsafeZipPath(path: string): boolean {
  if (!path || path.includes("\0")) return true;
  const p = path.replace(/\\/g, "/");
  if (p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return true;
  return p.split("/").some((seg) => seg === "..");
}

/** Finds the conversations.json file of a ChatGPT data export, if present. */
export function findChatGptConversations(paths: string[]): string | null {
  return paths.find((p) => /(^|\/)conversations\.json$/i.test(p) && !isUnsafeZipPath(p)) ?? null;
}
