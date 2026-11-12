import type { ProjectStatus } from "@/data/types";
import { cn } from "@/lib/utils";

export const statusMeta: Record<ProjectStatus, { label: string; className: string; dot: string }> = {
  "in-progress": { label: "In Progress", className: "bg-info-soft text-info", dot: "bg-info" },
  handover: { label: "In Handover", className: "bg-lavender-soft text-accent-foreground", dot: "bg-lavender" },
  "on-hold": { label: "On Hold", className: "bg-warning-soft text-warning", dot: "bg-warning" },
};

// Statuses that may appear in older imported packages.
const legacyMeta: Record<string, { label: string; className: string; dot: string }> = {
  active: statusMeta["in-progress"],
  completed: { label: "Completed", className: "bg-success-soft text-success", dot: "bg-success" },
};

export function StatusBadge({ status, className }: { status: ProjectStatus | string; className?: string }) {
  const meta = statusMeta[status as ProjectStatus] ?? legacyMeta[status] ?? { label: status, className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
