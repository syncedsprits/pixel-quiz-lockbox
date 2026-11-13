/**
 * Which other websites may call this app's public API from the browser (CORS).
 * Defaults cover the Vercel copy of the site; HP_ALLOWED_ORIGINS (comma-separated) adds more.
 * Every API request still needs a valid sign-in token, so CORS only decides which sites'
 * pages may read the responses.
 */
const DEFAULT_ALLOWED_ORIGINS = ["https://pixel-quiz-lockbox.vercel.app"];

export function allowedOrigins(): string[] {
  const extra = (process.env["HP_ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra];
}

export function isAllowedOrigin(origin: string, list = allowedOrigins(), dev = import.meta.env.DEV): boolean {
  if (list.includes(origin)) return true;
  // Local development servers only, never in a published build.
  return dev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = { vary: "Origin" };
  if (!origin || !isAllowedOrigin(origin)) return base;
  return {
    ...base,
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-hp-access",
    "access-control-expose-headers": "content-type, content-disposition",
    "access-control-max-age": "600",
  };
}

/** Rejects browser requests coming from a site that isn't on the list. Requests with no Origin pass. */
export function originRejected(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin || origin === new URL(request.url).origin || isAllowedOrigin(origin)) return null;
  return Response.json({ error: "This website isn't allowed to use this service." }, { status: 403, headers: { vary: "Origin" } });
}

export function preflight(request: Request): Response {
  return originRejected(request) ?? new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export function withCors(request: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(request.headers.get("origin")))) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
