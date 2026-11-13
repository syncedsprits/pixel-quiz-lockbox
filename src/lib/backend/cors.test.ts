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
