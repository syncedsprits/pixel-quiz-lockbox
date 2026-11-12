import { FileJson } from "lucide-react";

import { StatusBadge } from "@/components/projects/StatusBadge";
import { formatDateTime } from "@/lib/format";
import type { HandoverPackage } from "@/lib/handover-package";

export function PackageSummary({ data, fileName }: { data: HandoverPackage; fileName: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lavender-soft text-accent-foreground">
        <FileJson className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-bold text-foreground">{data.project.name}</p>
          <StatusBadge status={data.project.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{data.project.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ["Lead", data.project.lead.name],
            ["Team", `${data.project.team.length} people`],
            ["Milestones", data.project.milestones.length],
            ["Documents", data.project.documents.length],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl bg-muted p-3">
              <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-bold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {fileName} · exported {formatDateTime(data.exportedAt)}.
        </p>
      </div>
    </div>
  );
}
