import { describe, expect, it } from "vitest";

import { allowedOrigins, isAllowedOrigin } from "./cors.server";

describe("which websites may call the public API", () => {
  it("allows the Vercel site", () => {
    expect(isAllowedOrigin("https://pixel-quiz-lockbox.vercel.app", allowedOrigins(), false)).toBe(true);
  });
  it("rejects any other website", () => {
    expect(isAllowedOrigin("https://evil.example.com", allowedOrigins(), false)).toBe(false);
    expect(isAllowedOrigin("https://pixel-quiz-lockbox.vercel.app.evil.com", allowedOrigins(), false)).toBe(false);
  });
  it("allows local development servers only in development", () => {
    expect(isAllowedOrigin("http://localhost:8090", [], true)).toBe(true);
    expect(isAllowedOrigin("http://localhost:8090", [], false)).toBe(false);
  });
});

describe("browser pre-checks and responses", () => {
  const req = (origin: string) =>
    new Request("https://pixel-quiz-lockbox.lovable.app/api/public/hp/submit-quiz", { method: "OPTIONS", headers: { origin } });

  it("lets the Vercel site send sign-in and access headers", async () => {
    const { preflight } = await import("./cors.server");
    const res = preflight(req("https://pixel-quiz-lockbox.vercel.app"));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://pixel-quiz-lockbox.vercel.app");
    expect(res.headers.get("access-control-allow-headers")).toContain("x-hp-access");
  });

  it("refuses other websites", async () => {
    const { preflight, originRejected } = await import("./cors.server");
    expect(preflight(req("https://evil.example.com")).status).toBe(403);
    expect(originRejected(req("https://evil.example.com"))?.status).toBe(403);
  });
});
