import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeader: () => null }));

const { hasFileAccess } = await import("./access.server");
const verified = { quiz_score: 4, email_verified_at: "2026-11-19T00:00:00Z" };

describe("Old Admin approval gate", () => {
  it("correct OTP without a request gives no file or AI access", () => {
    expect(hasFileAccess({ ...verified, approval_status: "none" })).toBe(false);
  });
  it("a pending request gives no access", () => {
    expect(hasFileAccess({ ...verified, approval_status: "pending" })).toBe(false);
  });
  it("a declined request gives no access", () => {
    expect(hasFileAccess({ ...verified, approval_status: "declined" })).toBe(false);
  });
  it("an approved request gives access", () => {
    expect(hasFileAccess({ ...verified, approval_status: "approved" })).toBe(true);
  });
  it("approval without a verified email gives no access", () => {
    expect(hasFileAccess({ quiz_score: 4, email_verified_at: null, approval_status: "approved" })).toBe(false);
  });
});
