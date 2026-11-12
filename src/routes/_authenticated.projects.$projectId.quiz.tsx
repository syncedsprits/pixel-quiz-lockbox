import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getProject } from "@/data/projects";
import { accessStatusQuery } from "@/lib/access/access-queries";
import { clearAccessToken, storeAccessToken } from "@/lib/access/access-token";
import { submitQuiz } from "@/lib/access/access.functions";
import { QUIZ_PASS_MIN_CORRECT, type QuizGrade } from "@/lib/access/quiz-grading";
import { saveQuizResult } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/quiz")({
  loader: ({ params }) => {
    const project = getProject(params.projectId);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Onboarding quiz · ${loaderData.project.name} — HandoverPulse` },
          { name: "description", content: `Check your understanding of ${loaderData.project.name} before taking over.` },
          { property: "og:title", content: `Onboarding quiz · ${loaderData.project.name}` },
          { property: "og:description", content: `Check your understanding of ${loaderData.project.name} before taking over.` },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Quiz unavailable — HandoverPulse" }, { name: "robots", content: "noindex" }],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { project } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const questions = project.quiz;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizGrade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const q = questions[index];
  if (!q) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-extrabold">No onboarding quiz yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This project's knowledge hasn't been documented yet, so there are no questions to answer.
        </p>
        <Button asChild variant="hero" className="mt-5">
          <Link to="/projects/$projectId" params={{ projectId: project.id }}>
            Back to project
          </Link>
        </Button>
      </div>
    );
  }
  const answered = selected !== null;
  const isLast = index === questions.length - 1;

  function choose(i: number) {
    if (answered) return;
    setSelected(i);
    setAnswers((a) => {
      const copy = a.slice(0, index);
      copy[index] = i;
      return copy;
    });
  }

  async function next() {
    if (selected === null) return;
    if (isLast) {
      // The score is calculated on the server from the real answer key.
      setSubmitting(true);
      setSubmitError(null);
      try {
        const { accessToken, ...grade } = await submitQuiz({ data: { projectId: project.id, answers } });
        // The server replaced any earlier access for this project, so drop the old token too.
        clearAccessToken(project.id);
        queryClient.removeQueries({ queryKey: accessStatusQuery(project.id).queryKey });
        if (grade.passed && accessToken) {
          storeAccessToken(project.id, accessToken);
          saveQuizResult(project.id, { score: grade.score, total: grade.total, completedAt: new Date().toISOString() });
          setResult(grade);
          // A pass (2+ correct) opens email verification right away; the verify page re-checks the pass on the server.
          await navigate({ to: "/projects/$projectId/verify", params: { projectId: project.id } });
          return;
        }
        setResult({ ...grade, passed: false });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Your answers couldn't be checked. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setResult(null);
    setSubmitError(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {project.shortName}
      </Link>

      {result?.passed ? (
        <div className="surface-card animate-fade-up p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success">
            <Trophy className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">Onboarding complete</h1>
          <p className="mt-2 text-muted-foreground">
            You answered <strong className="text-foreground">{result.score} of {result.total}</strong> correctly.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Next, verify your email to open the project files.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              variant="hero"
              onClick={() => navigate({ to: "/projects/$projectId/verify", params: { projectId: project.id } })}
            >
              Continue to email verification <ArrowRight />
            </Button>
          </div>
        </div>
      ) : result ? (
        <div className="surface-card animate-fade-up p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive-soft text-destructive">
            <XCircle className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">Not quite there yet</h1>
          <p className="mt-2 text-muted-foreground">
            You answered <strong className="text-foreground">{result.score} of {result.total}</strong> correctly.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You need at least {QUIZ_PASS_MIN_CORRECT} correct answers to continue. Review the questions and try again.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="hero" onClick={restart}>
              <RotateCcw /> Retake Quiz
            </Button>
          </div>
        </div>
      ) : (
        <div key={q.id} className="surface-card animate-fade-up p-6 sm:p-8">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span>Onboarding quiz</span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {questions.map((qq, i) => (
              <span key={qq.id} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          <h1 className="mt-6 text-xl font-extrabold text-foreground sm:text-2xl">{q.prompt}</h1>

          <div className="mt-6 space-y-2.5" role="radiogroup">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.answerIndex;
              const isChosen = i === selected;
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  disabled={answered}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border-2 bg-background px-4 py-3.5 text-left text-sm font-semibold transition-all",
                    !answered && "hover:border-primary/40 hover:bg-card",
                    answered && isCorrect && "border-success bg-success-soft text-success",
                    answered && isChosen && !isCorrect && "border-destructive bg-destructive-soft text-destructive",
                    answered && !isCorrect && !isChosen && "opacity-60",
                  )}
                >
                  {opt}
                  {answered && isCorrect && <CheckCircle2 className="size-5 shrink-0" />}
                  {answered && isChosen && !isCorrect && <XCircle className="size-5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {answered && (
            <p className="mt-5 animate-fade-in rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">{selected === q.answerIndex ? "Correct. " : "Not quite. "}</strong>
              {q.explanation}
            </p>
          )}

          {submitError && (
            <p className="mt-5 rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">{submitError}</p>
          )}

          <div className="mt-6 flex justify-end">
            <Button variant="hero" onClick={() => void next()} disabled={!answered || submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isLast ? "Finish" : "Next question"} {!submitting && <ArrowRight />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
