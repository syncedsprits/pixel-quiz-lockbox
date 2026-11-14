import { describe, expect, it } from "vitest";
import { geminiErrorKind } from "./gemini.server";

describe("geminiErrorKind", () => {
  it("treats 429 as quota/rate limit", () => expect(geminiErrorKind(429)).toBe("rate_limit"));
  it("treats 403 as a rejected key", () => expect(geminiErrorKind(403)).toBe("auth"));
  it("treats 503 as unavailable", () => expect(geminiErrorKind(503)).toBe("unavailable"));
});
