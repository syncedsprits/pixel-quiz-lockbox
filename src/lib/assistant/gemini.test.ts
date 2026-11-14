import { describe, expect, it } from "vitest";
import { GeminiError, geminiErrorKind, shouldTryNextModel } from "./gemini.server";

describe("geminiErrorKind", () => {
  it("treats 429 as quota/rate limit", () => expect(geminiErrorKind(429)).toBe("rate_limit"));
  it("treats 403 as a rejected key", () => expect(geminiErrorKind(403)).toBe("auth"));
  it("treats 503 as unavailable", () => expect(geminiErrorKind(503)).toBe("unavailable"));
});

describe("shouldTryNextModel", () => {
  it("falls back when a model is over its free-tier quota", () =>
    expect(shouldTryNextModel(new GeminiError("rate_limit", "x"))).toBe(true));
  it("falls back when a model is busy", () => expect(shouldTryNextModel(new GeminiError("unavailable", "x"))).toBe(true));
  it("does not fall back when the key is rejected", () => expect(shouldTryNextModel(new GeminiError("auth", "x"))).toBe(false));
  it("does not fall back when the key is missing", () =>
    expect(shouldTryNextModel(new GeminiError("missing_key", "x"))).toBe(false));
});
