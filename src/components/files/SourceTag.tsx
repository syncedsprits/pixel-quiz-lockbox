import { BadgeCheck, CircleDashed, FileInput, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const styles = {
  verified: { icon: BadgeCheck, className: "bg-success-soft text-success", label: "Verified" },
  imported: { icon: FileInput, className: "bg-info-soft text-info", label: "From imported files" },
  missing: { icon: CircleDashed, className: "bg-muted text-muted-foreground", label: "Not provided yet" },
  unconfirmed: { icon: HelpCircle, className: "bg-warning-soft text-warning", label: "Needs confirmation" },
};

/** Shows where a piece of project information came from. */
export function SourceTag({
  type,
  source,
  className,
}: {
  type: keyof typeof styles;
  source?: string | undefined;
  className?: string;
}) {
  const s = styles[type];
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", s.className, className)}
      title={source ? `${s.label} · ${source}` : s.label}
    >
      <s.icon className="size-3 shrink-0" />
      <span className="truncate">
        {s.label}
        {source ? ` · ${source}` : ""}
      </span>
    </span>
  );
}

export function NotProvided({ what }: { what?: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
      <SourceTag type="missing" />
      <p className="mt-2">{what ? `${what} hasn't been provided yet.` : "Not provided yet."}</p>
    </div>
  );
}

export function SourceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="font-semibold">Information labels:</span>
      <SourceTag type="verified" />
      <SourceTag type="imported" />
      <SourceTag type="unconfirmed" />
      <SourceTag type="missing" />
    </div>
  );
}
