/**
 * Browser-side holder for project access tokens.
 *
 * A token is a random capability issued by the server after a passing quiz. It is NOT proof of
 * verification: the server looks it up (by hash) and checks the quiz score, the verified email
 * code and the signed-in user on every request. It lives in sessionStorage, so it ends with the
 * browser session, and it travels in a request header (not a cookie) so it also works inside
 * embedded previews where third-party cookies are blocked.
 */
export const ACCESS_HEADER = "x-hp-access";
const STORAGE_KEY = "handoverpulse.access-tokens";

type TokenMap = Record<string, string>;

const TOKEN_RE = /^[a-f0-9]{64}$/;
const PROJECT_RE = /^[a-z0-9-]{1,64}$/i;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Parses a token map, keeping only well-formed entries. Shared by browser and server. */
export function parseAccessTokens(raw: string | null | undefined): TokenMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: TokenMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (PROJECT_RE.test(k) && typeof v === "string" && TOKEN_RE.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function readAccessTokens(): TokenMap {
  return parseAccessTokens(store()?.getItem(STORAGE_KEY));
}

export function storeAccessToken(projectId: string, token: string) {
  const s = store();
  if (!s || !TOKEN_RE.test(token)) return;
  s.setItem(STORAGE_KEY, JSON.stringify({ ...readAccessTokens(), [projectId]: token }));
}

export function clearAccessToken(projectId: string) {
  const s = store();
  if (!s) return;
  const next = readAccessTokens();
  delete next[projectId];
  s.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearAllAccessTokens() {
  store()?.removeItem(STORAGE_KEY);
}

/** Header carrying this browser session's tokens, or nothing when there are none. */
export function accessHeaders(): Record<string, string> {
  const tokens = readAccessTokens();
  return Object.keys(tokens).length ? { [ACCESS_HEADER]: JSON.stringify(tokens) } : {};
}
