import { HardDrive } from "lucide-react";

import { cn } from "@/lib/utils";

/** Explains that uploads are shared project resources. */
export function LocalStorageNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning", className)}>
      <HardDrive className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <strong>Shared files:</strong> uploaded files are stored securely and shown to everyone who has access to this
        project. Only the person who uploaded a file can remove it.
      </span>
    </p>
  );
}
