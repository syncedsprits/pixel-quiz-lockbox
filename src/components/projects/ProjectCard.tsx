import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/UserAvatar";
import type { Project } from "@/data/types";
import { accessStatusQuery } from "@/lib/access/access-queries";
import { formatDate } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  // A quiz-protected project opens with the role question and quiz, unless this session already has access.
  const isProtected = project.quiz.length > 0;
  const access = useQuery({ ...accessStatusQuery(project.id), enabled: isProtected });
  const target = !isProtected || access.data?.emailVerified
    ? "/projects/$projectId"
    : access.data?.quizPassed
      ? "/projects/$projectId/verify"
      : "/projects/$projectId/quiz";
  return (
    <article
      className="surface-card interactive-lift group flex animate-fade-up flex-col p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-gradient-panel text-primary">
          <FolderOpen className="size-5" />
        </span>
        <StatusBadge status={project.status} />
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug text-foreground">{project.name}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

      <div className="mt-4 flex items-center gap-2.5">
        <UserAvatar name={project.lead?.name ?? "?"} />
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold text-foreground">{project.lead?.name ?? "Not provided yet"}</p>
          <p className="truncate text-xs text-muted-foreground">{project.lead?.role ?? "Project lead"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>Progress</span>
          <span className="text-foreground">{project.progress !== undefined ? `${project.progress}%` : "Not provided yet"}</span>
        </div>
        <ProgressBar value={project.progress ?? 0} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          {project.lastUpdated
            ? `Updated ${formatDate(project.lastUpdated)}`
            : project.handoverDate
              ? `Handover ${project.handoverDate.value}`
              : "Last update not provided"}
        </span>
        <Button asChild size="sm" variant="soft">
          <Link to={target} params={{ projectId: project.id }}>
            Open Project
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
