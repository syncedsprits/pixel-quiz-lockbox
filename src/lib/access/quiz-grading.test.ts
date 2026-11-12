import { describe, expect, it } from "vitest";

import { getProject, TRANS_SHIELD_ID } from "@/data/projects";
import { gradeQuiz, maskEmail } from "./quiz-grading";
import { OTP_EMAIL_SUBJECT, canResend, codeFromRandom, isOtpExpired, otpEmailText } from "./otp-rules";

const quiz = getProject(TRANS_SHIELD_ID)!.quiz;
const correct = quiz.map((q) => q.answerIndex);
const wrong = quiz.map((q) => (q.answerIndex + 1) % q.options.length);
const withCorrect = (n: number) => correct.map((c, i) => (i < n ? c : wrong[i]));

describe("quiz pass rule (at least 2 of 4 correct)", () => {
  it("uses the existing four questions", () => expect(quiz).toHaveLength(4));
  it("0 correct fails", () => expect(gradeQuiz(quiz, withCorrect(0))).toEqual({ score: 0, total: 4, passed: false }));
  it("1 correct fails", () => expect(gradeQuiz(quiz, withCorrect(1))).toEqual({ score: 1, total: 4, passed: false }));
  it("2 correct passes", () => expect(gradeQuiz(quiz, withCorrect(2))).toEqual({ score: 2, total: 4, passed: true }));
  it("3 correct passes", () => expect(gradeQuiz(quiz, withCorrect(3))).toEqual({ score: 3, total: 4, passed: true }));
  it("4 correct passes", () => expect(gradeQuiz(quiz, withCorrect(4))).toEqual({ score: 4, total: 4, passed: true }));
  it("rejects unanswered questions", () => {
    expect(() => gradeQuiz(quiz, correct.slice(0, 3))).toThrow();
    expect(() => gradeQuiz(quiz, [correct[0], null, correct[2], correct[3]])).toThrow();
    expect(() => gradeQuiz(quiz, [0, 1, 9, 2])).toThrow();
  });
});

describe("OTP timing (60 seconds)", () => {
  const sent = new Date("2026-11-12T10:00:00Z");
  it("is valid at 59 seconds", () => expect(isOtpExpired(sent, new Date("2026-11-12T10:00:59Z"))).toBe(false));
  it("expires at 60 seconds", () => expect(isOtpExpired(sent, new Date("2026-11-12T10:01:00Z"))).toBe(true));
  it("blocks resend before 60 seconds", () => expect(canResend(sent, new Date("2026-11-12T10:00:30Z"))).toBe(false));
  it("allows resend after 60 seconds", () => expect(canResend(sent, new Date("2026-11-12T10:01:00Z"))).toBe(true));
});

describe("maskEmail", () => {
  it("hides most of the local part", () => expect(maskEmail("jane.doe@gmail.com")).toBe("ja••••••@gmail.com"));
});

describe("OTP code generation", () => {
  it("always yields exactly six digits", () => {
    expect(codeFromRandom(() => 0)).toBe("000000");
    expect(codeFromRandom(() => 123456)).toBe("123456");
    expect(codeFromRandom(() => 4_293_999_999)).toMatch(/^\d{6}$/);
  });
  it("rejects values in the biased tail instead of using them", () => {
    const values = [4_294_967_295, 42];
    expect(codeFromRandom(() => values.shift()!)).toBe("000042");
  });
});

describe("OTP email wording", () => {
  it("uses the required subject", () => expect(OTP_EMAIL_SUBJECT).toBe("Your Project File Access Verification Code"));
  it("states the 60-second validity and contains the code", () => {
    const body = otpEmailText("482915");
    expect(body).toContain("482915");
    expect(body).toContain("This code is valid for 60 seconds. Do not share this code with anyone.");
  });
});
