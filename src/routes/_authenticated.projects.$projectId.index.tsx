import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  ExternalLink,
  GitBranch,
  Globe,
  GraduationCap,
  History,
  PlayCircle,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SectionCard } from "@/components/common/SectionCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { NotProvided, SourceLegend, SourceTag } from "@/components/files/SourceTag";
import { ProjectFilesSection } from "@/components/files/ProjectFilesSection";
import { Spotlight } from "@/components/onboarding/Spotlight";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProject } from "@/data/projects";
import type { Project } from "@/data/types";
import { extractedText } from "@/lib/files/extracted";
import { useProjectFiles } from "@/lib/files/hooks";
import { formatDateTime } from "@/lib/format";
import { dismissSpotlight, getQuizResult, isSpotlightDismissed, type QuizResult } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
  loader: ({ params }) => {
    const project = getProject(params.projectId);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.project.shortName} — HandoverPulse` },
          { name: "description", content: loaderData.project.description },
          { property: "og:title", content: `${loaderData.project.shortName} — HandoverPulse` },
          { property: "og:description", content: loaderData.project.description },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Project unavailable — HandoverPulse" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: ProjectNotFound,
  component: ProjectOverview,
});

function ProjectNotFound() {
  return (
    <div className="surface-card mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-extrabold">Project not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This project doesn't exist or you don't have access.</p>
      <Button asChild variant="hero" className="mt-5">
        <Link to="/projects">Back to projects</Link>
      </Button>
    </div>
  );
}

function ExternalLinkCard({ title, icon: Icon, url, note }: { title: string; icon: typeof Globe; url: string; note: string }) {
  return (
    <SectionCard title={title}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-panel text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-semibold text-foreground">{url}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
      <Button asChild variant="soft" size="sm" className="mt-4">
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open in new tab <ExternalLink />
        </a>
      </Button>
    </SectionCard>
  );
}

function Architecture({ project }: { project: Project }) {
  const a = project.architecture;
  if (!a) return <NotProvided what="Technical architecture" />;
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Data flow</h3>
          <SourceTag type="verified" source={a.flow.source} />
        </div>
        <ol className="flex flex-wrap items-center gap-2">
          {a.flow.value.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-xl bg-primary-soft px-3 py-1.5 text-xs font-bold text-secondary-foreground">{step}</span>
              {i < a.flow.value.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Architecture layers</h3>
          <SourceTag type="verified" source={a.layers.source} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {a.layers.value.map((l, i) => (
            <div key={l.name} className="rounded-xl border bg-background p-3.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Layer {i + 1}</p>
              <p className="mt-0.5 font-semibold text-foreground">{l.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{l.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {project.stack.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Technology stack</h3>
            <SourceTag type="verified" source={project.stackSource} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((s) => (
              <span key={s} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {a.hardware && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Hardware pinout & sensor thresholds</h3>
            <SourceTag type="verified" source={a.hardware.source} />
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>ESP32 pin</TableHead>
                  <TableHead>Role & thresholds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.hardware.value.map((h) => (
                  <TableRow key={h.component}>
                    <TableCell className="font-semibold">{h.component}</TableCell>
                    <TableCell className="whitespace-nowrap">{h.pin}</TableCell>
                    <TableCell className="text-muted-foreground">{h.logic}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { title: "AI / RAG engine", data: a.ai },
          { title: "Frontend (SCADA)", data: a.frontend },
          { title: "Security", data: a.security },
        ].map(
          (b) =>
            b.data && (
              <div key={b.title} className="rounded-xl border bg-background p-3.5">
                <p className="font-semibold text-foreground">{b.title}</p>
                <SourceTag type="verified" source={b.data.source} className="mt-1" />
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                  {b.data.value.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            ),
        )}
      </div>

      {a.access && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Role-based access</h3>
            <SourceTag type="verified" source={a.access.source} />
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  {a.access.value.headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.access.value.rows.map((r) => (
                  <TableRow key={r[0]}>
                    {r.map((c, i) => (
                      <TableCell key={i} className={i === 0 ? "font-semibold" : "text-muted-foreground"}>
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectOverview() {
  const { project } = Route.useLoaderData();
  const navigate = useNavigate();
  const quizRef = useRef<HTMLButtonElement>(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const { files } = useProjectFiles(project.id);
  const hasQuiz = project.quiz.length > 0;

  useEffect(() => {
    const r = getQuizResult(project.id);
    setResult(r);
    if (!hasQuiz || r || isSpotlightDismissed(project.id)) return;
    const t = window.setTimeout(() => setShowSpotlight(true), 500);
    return () => window.clearTimeout(t);
  }, [project.id, hasQuiz]);

  const startQuiz = useCallback(() => {
    dismissSpotlight(project.id);
    setShowSpotlight(false);
    navigate({ to: "/projects/$projectId/quiz", params: { projectId: project.id } });
  }, [navigate, project.id]);

  const closeSpotlight = useCallback(() => {
    dismissSpotlight(project.id);
    setShowSpotlight(false);
  }, [project.id]);

  const filesWithText = files.filter((f) => f.hasText);
  const activity = [
    ...files.map((f) => ({ at: f.uploadedAt, text: `File uploaded: ${f.name}` })),
    ...(result ? [{ at: result.completedAt, text: `Onboarding quiz completed · ${result.score}/${result.total} correct` }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All projects
      </Link>

      {/* Header + Start Quiz */}
      <section className="animate-fade-up rounded-3xl bg-gradient-hero p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <StatusBadge status={project.status} />
            <h1 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">{project.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{project.description}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              {project.lead ? (
                <span className="flex items-center gap-2">
                  <UserAvatar name={project.lead.name} />
                  <span>
                    <span className="block font-bold text-foreground">{project.lead.name}</span>
                    <span className="block text-xs text-muted-foreground">{project.lead.role}</span>
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Project lead: Not provided yet</span>
              )}
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-4" /> Handover date: {project.handoverDate?.value ?? "Not provided yet"}
              </span>
            </div>
          </div>

          <div className="w-full rounded-2xl bg-card p-5 shadow-card lg:w-80">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <GraduationCap className="size-4 text-primary" /> Project onboarding
            </p>
            {!hasQuiz ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                The onboarding quiz becomes available once this project's knowledge has been documented.
              </p>
            ) : result ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-success">
                <Trophy className="size-4" /> Completed · {result.score}/{result.total} correct
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                A {project.quiz.length}-question check on the essentials before you take over.
              </p>
            )}
            <Button ref={quizRef} variant="hero" size="xl" className="mt-4 w-full" onClick={startQuiz} disabled={!hasQuiz}>
              <PlayCircle className="size-5!" />
              {result ? "Retake Quiz" : "Start Quiz"}
            </Button>
          </div>
        </div>
      </section>

      <SourceLegend />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Project Status" className={project.overviewRemoved ? "lg:col-span-3" : "lg:col-span-1"}>
          <StatusBadge status={project.status} />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Progress</p>
          {project.progress !== undefined ? (
            <>
              <p className="text-4xl font-extrabold text-foreground">{project.progress}%</p>
              <ProgressBar value={project.progress} className="mt-3" />
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Not provided yet</p>
          )}
          <div className="mt-5 rounded-xl bg-muted p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lifecycle state</p>
            {project.lifecycle ? (
              <>
                <p className="mt-1 text-sm font-semibold text-foreground">{project.lifecycle.value}</p>
                <SourceTag type="verified" source={project.lifecycle.source} className="mt-2" />
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-muted-foreground">Not provided yet</p>
            )}
          </div>
        </SectionCard>

        {!project.overviewRemoved && (
        <SectionCard title="Project Overview" className="lg:col-span-2">
          {project.overview ? (
            <>
              <div className="space-y-3 text-sm leading-relaxed text-foreground">
                {project.overview.value.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <SourceTag type="verified" source={project.overview.source} className="mt-4" />
            </>
          ) : (
            <NotProvided what="A project overview" />
          )}
        </SectionCard>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExternalLinkCard title="Project Website" icon={Globe} url={project.website} note="External site · opens in a new tab." />
        <ExternalLinkCard
          title="GitHub Repository"
          icon={GitBranch}
          url={project.repository}
          note="Repository link only — GitHub isn't connected or synced to HandoverPulse."
        />
      </div>

      <ProjectFilesSection project={project} />

      <SectionCard title="Technical Architecture">
        <Architecture project={project} />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Current Development Status">
          {project.developmentStatus ? (
            <>
              <ol className="relative space-y-4 border-l-2 border-border pl-6">
                {project.developmentStatus.done.value.map((m) => (
                  <li key={m} className="relative">
                    <span className="absolute -left-[2.15rem] top-0 grid size-6 place-items-center rounded-full bg-card">
                      <CheckCircle2 className="size-5 text-success" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{m}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </li>
                ))}
                {project.developmentStatus.inProgress.value.map((m) => (
                  <li key={m} className="relative">
                    <span className="absolute -left-[2.15rem] top-0 grid size-6 place-items-center rounded-full bg-card">
                      <Circle className="size-5 text-muted-foreground" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{m}</p>
                    <p className="text-xs text-muted-foreground">In progress</p>
                  </li>
                ))}
              </ol>
              <SourceTag type="verified" source={project.developmentStatus.done.source} className="mt-4" />
            </>
          ) : (
            <NotProvided what="Development status" />
          )}
        </SectionCard>

        <SectionCard title="Team">
          {project.team.length ? (
            <>
              <ul className="grid gap-3 sm:grid-cols-2">
                {project.team.map((m) => (
                  <li key={m.name} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                    <UserAvatar name={m.name} className="size-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <SourceTag type="verified" source={project.teamSource} className="mt-4" />
            </>
          ) : (
            <NotProvided what="Team information" />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Pending Tasks and Continuation Guidance">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Known pending tasks & next steps</h3>
              {project.pendingTasks.length ? (
                <ul className="space-y-2">
                  {project.pendingTasks.map((t) => (
                    <li key={t.value} className="rounded-xl border bg-background p-3">
                      <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {t.value}
                      </p>
                      <SourceTag type="verified" source={t.source} className="mt-2" />
                    </li>
                  ))}
                </ul>
              ) : (
                <NotProvided what="A list of pending tasks" />
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Known blockers</h3>
              {project.blockers.length ? (
                <ul className="space-y-2">
                  {project.blockers.map((b) => (
                    <li key={b.value} className="rounded-xl border bg-background p-3 text-sm">
                      {b.value}
                      <SourceTag type="verified" source={b.source} className="mt-2" />
                    </li>
                  ))}
                </ul>
              ) : (
                <NotProvided what="Blocker information" />
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Important technical decisions</h3>
              {project.decisions.length ? (
                <ul className="space-y-2">
                  {project.decisions.map((d) => (
                    <li key={d.value} className="rounded-xl border bg-background p-3 text-sm text-foreground">
                      {d.value}
                      <div>
                        <SourceTag type="verified" source={d.source} className="mt-2" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <NotProvided what="Decision records" />
              )}
            </div>

            {project.toConfirm.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-foreground">Differences between documents to confirm</h3>
                <ul className="space-y-2">
                  {project.toConfirm.map((t) => (
                    <li key={t} className="rounded-xl border bg-background p-3 text-sm text-foreground">
                      {t}
                      <div>
                        <SourceTag type="unconfirmed" source="noticed while comparing the documents" className="mt-2" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Information from imported files</h3>
              {filesWithText.length ? (
                <div className="rounded-xl border bg-background p-3 text-sm">
                  <p className="text-foreground">
                    {filesWithText.length} uploaded file{filesWithText.length === 1 ? " has" : "s have"} readable content in
                    Project Files:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {filesWithText.slice(0, 6).map((f) => (
                      <li key={f.id} className="break-all">
                        {f.name}
                      </li>
                    ))}
                  </ul>
                  <SourceTag type="imported" className="mt-2" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No imported files with readable content yet.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">AI suggestions</h3>
              <p className="text-sm text-muted-foreground">
                No AI suggestions are shown — the AI Assistant isn't connected yet, so nothing here is generated.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {activity.length > 0 && (
        <SectionCard title="Project Activity">
          <ol className="space-y-3">
            {activity.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex items-start gap-3 text-sm">
                <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 break-words text-foreground">{a.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.at)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Activity recorded in this browser only.</p>
        </SectionCard>
      )}

      {hasQuiz && (
        <Spotlight
          targetRef={quizRef}
          open={showSpotlight}
          message="Start your project onboarding to continue."
          detail={`A quick ${project.quiz.length}-question quiz on ${project.shortName}.`}
          primaryLabel="Start Quiz"
          onPrimary={startQuiz}
          onDismiss={closeSpotlight}
        />
      )}
    </div>
  );
}
