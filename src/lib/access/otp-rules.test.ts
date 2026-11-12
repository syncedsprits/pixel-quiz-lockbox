import { describe, expect, it } from "vitest";

import { OTP_TTL_SECONDS, canResend, codeFromRandom, isOtpExpired, otpEmailText } from "./otp-rules";

describe("email verification code rules", () => {
  it("codes are exactly 6 digits", () => {
    expect(codeFromRandom(() => 7)).toBe("000007");
    expect(codeFromRandom(() => 4_123_482_916)).toMatch(/^\d{6}$/);
  });

  it("email states the code on one line and contains no link", () => {
    const text = otpEmailText("482916");
    expect(text).toContain("Your verification code is: 482916");
    expect(text).not.toMatch(/https?:\/\//);
  });

  it("a code is valid for 60 seconds", () => {
    expect(OTP_TTL_SECONDS).toBe(60);
    const sent = new Date("2026-01-01T00:00:00Z");
    expect(isOtpExpired(sent, new Date("2026-01-01T00:00:59Z"))).toBe(false);
    expect(isOtpExpired(sent, new Date("2026-01-01T00:01:00Z"))).toBe(true);
  });

  it("a new code can be requested only after 60 seconds", () => {
    const sent = new Date("2026-01-01T00:00:00Z");
    expect(canResend(sent, new Date("2026-01-01T00:00:59Z"))).toBe(false);
    expect(canResend(sent, new Date("2026-01-01T00:01:00Z"))).toBe(true);
  });
});
