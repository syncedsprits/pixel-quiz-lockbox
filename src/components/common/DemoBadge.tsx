import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-lavender/30 bg-lavender-soft px-2.5 py-1 text-xs font-bold text-accent-foreground",
        className,
      )}
    >
      <FlaskConical className="size-3.5" />
      Demo Mode
    </span>
  );
}
