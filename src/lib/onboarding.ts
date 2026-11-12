/** Per-project onboarding progress, kept in the browser for this stage. */
const RESULT_KEY = (projectId: string) => `handoverpulse.quiz-result.${projectId}`;
const SPOTLIGHT_KEY = (projectId: string) => `handoverpulse.spotlight-dismissed.${projectId}`;

export interface QuizResult {
  score: number;
  total: number;
  completedAt: string;
}

export function getQuizResult(projectId: string): QuizResult | null {
  try {
    const raw = window.localStorage.getItem(RESULT_KEY(projectId));
    return raw ? (JSON.parse(raw) as QuizResult) : null;
  } catch {
    return null;
  }
}

export function saveQuizResult(projectId: string, result: QuizResult) {
  window.localStorage.setItem(RESULT_KEY(projectId), JSON.stringify(result));
}

export function isSpotlightDismissed(projectId: string): boolean {
  try {
    return window.sessionStorage.getItem(SPOTLIGHT_KEY(projectId)) === "1";
  } catch {
    return false;
  }
}

export function dismissSpotlight(projectId: string) {
  window.sessionStorage.setItem(SPOTLIGHT_KEY(projectId), "1");
}
