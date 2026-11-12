import type { QuizQuestion } from "@/data/types";

/** Minimum number of correct answers needed to continue to email verification. */
export const QUIZ_PASS_MIN_CORRECT = 2;

export interface QuizGrade {
  score: number;
  total: number;
  passed: boolean;
}

/**
 * Grades a full set of answers against the quiz's real answer key.
 * Every question must be answered with a valid option index; anything else is rejected
 * so unanswered or skipped questions can never count as correct.
 */
export function gradeQuiz(quiz: QuizQuestion[], answers: unknown): QuizGrade {
  if (!Array.isArray(answers) || answers.length !== quiz.length) {
    throw new Error("Answer every question before finishing the quiz.");
  }
  let score = 0;
  quiz.forEach((q, i) => {
    const a = answers[i];
    if (typeof a !== "number" || !Number.isInteger(a) || a < 0 || a >= q.options.length) {
      throw new Error("Answer every question before finishing the quiz.");
    }
    if (a === q.answerIndex) score += 1;
  });
  return { score, total: quiz.length, passed: score >= QUIZ_PASS_MIN_CORRECT };
}

/** "jane.doe@gmail.com" -> "ja•••••@gmail.com" */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
