import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Circle, FileStack, FolderKanban, ListTodo, Repeat2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { DocumentIcon } from "@/components/projects/DocumentIcon";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { StatusBadge, statusMeta } from "@/components/projects/StatusBadge";
import { Button } from "@/components/ui/button";
import { getProject, projects } from "@/data/projects";
import type { DocumentKind, ProjectStatus } from "@/data/types";
import { useProjectFiles } from "@/lib/files/hooks";
import { getRecentFiles, type RecentFileEntry } from "@/lib/files/recent";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HandoverPulse" },
      { name: "description", content: "Your projects, handovers, pending tasks and recent files at a glance." },
      { property: "og:title", content: "Dashboard — HandoverPulse" },
      { property: "og:description", content: "Your projects, handovers, pending tasks and recent files at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

// Pending tasks come only from each project's documented next steps.
const pendingTasks = projects.flatMap((p) =>
  p.pendingTasks.map((t, i) => ({ id: `${p.id}-${i}`, projectId: p.id, title: t.value, source: t.source })),
);

function Dashboard() {
  const { session } = useAuth();
  const firstName = session?.user.name.split(" ")[0] ?? "there";
  const [done, setDone] = useState<Set<string>>(new Set());

  const recent = projects.slice(0, 3);
  const active = projects.filter((p) => p.status === "in-progress" || p.status === "handover");
  const { files: uploaded } = useProjectFiles(null);
  const referenceCount = projects.reduce((n, p) => n + p.documents.length, 0);
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);
  useEffect(() => setRecentFiles(getRecentFiles().filter((f) => getProject(f.projectId)).slice(0, 4)), []);
  const statusCounts = (Object.keys(statusMeta) as ProjectStatus[]).map((s) => ({
    status: s,
    count: projects.filter((p) => p.status === s).length,
  }));
  const openTasks = pendingTasks.filter((t) => !done.has(t.id)).length;
  const handoverProject = projects.find((p) => p.status === "handover");

  function toggleTask(id: string, title: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        toast.success("Task completed", { description: title });
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative animate-fade-up overflow-hidden rounded-3xl bg-gradient-hero p-6 shadow-card sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent-foreground">Welcome back,</p>
            <h1 className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">{firstName} 👋</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              You have <strong className="text-foreground">{openTasks} pending tasks</strong> and{" "}
              <strong className="text-foreground">{active.length} projects</strong> in motion today.
            </p>
          </div>
          {handoverProject && (
            <div className="rounded-2xl bg-card/80 p-4 shadow-soft backdrop-blur md:max-w-xs">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-foreground">
                <Sparkles className="size-3.5" /> Handover in progress
              </p>
              <p className="mt-1.5 font-bold text-foreground">{handoverProject.name}</p>
              <Button asChild size="sm" variant="hero" className="mt-3">
                <Link to="/projects/$projectId" params={{ projectId: handoverProject.id }}>
                  Continue onboarding <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Total projects" value={projects.length} hint="Across your workspace" icon={FolderKanban} />
        <StatCard index={1} label="Active projects" value={active.length} hint="In progress or in handover" icon={Repeat2} tone="lavender" />
        <StatCard index={2} label="Pending tasks" value={openTasks} hint="Documented next steps" icon={ListTodo} tone="warning" />
        <StatCard
          index={3}
          label="Project files"
          value={referenceCount + uploaded.length}
          hint={`${referenceCount} reference · ${uploaded.length} uploaded here`}
          icon={FileStack}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent projects */}
        <SectionCard
          title="Recent projects"
          className="xl:col-span-2"
          action={
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to="/projects">View all</Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.lead?.name ?? "Lead not provided yet"} · {p.handoverDate ? `Handover ${p.handoverDate.value}` : "Last update not provided"}
                    </p>
                  </div>
                  <StatusBadge status={p.status} className="hidden sm:inline-flex" />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Project status */}
        <SectionCard title="Project status">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            {statusCounts.map(({ status, count }) =>
              count ? (
                <div
                  key={status}
                  className={cn("h-full", statusMeta[status].dot)}
                  style={{ width: `${(count / projects.length) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-5 space-y-3">
            {statusCounts.map(({ status, count }) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span className={cn("size-2.5 rounded-full", statusMeta[status].dot)} />
                  {statusMeta[status].label}
                </span>
                <span className="font-bold text-foreground">{count}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Active projects */}
        <SectionCard title="Active projects" className="xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className="rounded-2xl border bg-background p-4 transition-all hover:border-primary/30 hover:bg-card hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{p.shortName}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Lead: {p.lead?.name ?? "Not provided yet"}</p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={p.progress ?? 0} />
                  <span className="shrink-0 text-xs font-bold text-foreground">
                    {p.progress !== undefined ? `${p.progress}%` : "Progress not provided"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Pending tasks */}
        <SectionCard title="Pending tasks">
          {pendingTasks.length === 0 && <p className="text-sm text-muted-foreground">No pending tasks have been documented.</p>}
          <ul className="space-y-2">
            {pendingTasks.map((t) => {
              const isDone = done.has(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id, t.title)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted"
                    aria-pressed={isDone}
                  >
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                    ) : (
                      <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-semibold text-foreground", isDone && "text-muted-foreground line-through")}>
                        {t.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{getProject(t.projectId)?.shortName}</span>
                        <span>· Due date not provided</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      {/* Recently accessed files */}
      <SectionCard title="Recently accessed files">
        {recentFiles.length === 0 && (
          <p className="text-sm text-muted-foreground">Files you preview or download will appear here.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentFiles.map((f) => {
            const project = getProject(f.projectId);
            if (!project) return null;
            return (
              <Link
                key={`${f.projectId}-${f.fileId}`}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="flex items-center gap-3 rounded-2xl border bg-background p-3.5 transition-all hover:border-primary/30 hover:bg-card hover:shadow-card"
              >
                <DocumentIcon kind={f.kind as DocumentKind} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{f.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.shortName} · {formatDateTime(f.at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
