import { describe, expect, it } from "vitest";

import { entrySchema } from "./validation";

describe("demo sign-in entry rule", () => {
  it("accepts any non-empty email and password", () => {
    expect(entrySchema.safeParse({ email: "anyone@anywhere.test", password: "x" }).success).toBe(true);
    expect(entrySchema.safeParse({ email: "not-even-an-email", password: "1" }).success).toBe(true);
  });

  it("rejects an empty email", () => {
    expect(entrySchema.safeParse({ email: "   ", password: "secret" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(entrySchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
