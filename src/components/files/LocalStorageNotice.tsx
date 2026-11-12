import { HardDrive } from "lucide-react";

import { cn } from "@/lib/utils";

/** Explains that uploads live in this browser only, because no storage server is configured. */
export function LocalStorageNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning", className)}>
      <HardDrive className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <strong>Local mode:</strong> uploaded files are saved in this browser on this device only. They aren't sent to a
        server, won't appear on other devices, and are removed if you clear this browser's data.
      </span>
    </p>
  );
}
