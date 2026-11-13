import { AlertCircle, CheckCircle2, Eye, Loader2, RotateCcw, X } from "lucide-react";

import { DocumentIcon } from "@/components/projects/DocumentIcon";
import { Button } from "@/components/ui/button";
import { extractionSummary } from "@/lib/files/extracted";
import { formatBytes, getFormat } from "@/lib/files/formats";
import type { QueueItem } from "@/lib/files/hooks";
import type { StoredFile } from "@/lib/files/store";
import { cn } from "@/lib/utils";

const stageLabel = {
  reading: "Reading file",
  checking: "Checking file",
  extracting: "Extracting content",
  saving: "Saving to browser storage",
};

export function UploadQueue({
  items,
  onRemove,
  onRetry,
  onPreview,
}: {
  items: QueueItem[];
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  onPreview: (file: StoredFile) => void;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2" aria-label="Selected files">
      {items.map((item) => {
        const format = getFormat(item.file.name);
        return (
          <li key={item.key} className="rounded-xl border bg-background p-3">
            <div className="flex items-center gap-3">
              <DocumentIcon kind={format?.kind ?? "doc"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.file.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {format?.label ?? "Unknown type"} · {formatBytes(item.file.size)}
                  {item.status === "queued" && " · Ready to upload"}
                  {item.status === "uploading" && item.stage && ` · ${stageLabel[item.stage]}…`}
                  {item.status === "done" && item.result && ` · Saved · ${item.result.summary}`}
                </p>
              </div>
              {item.status === "uploading" && <Loader2 className="size-4 animate-spin text-primary" aria-label="Uploading" />}
              {item.status === "done" && <CheckCircle2 className="size-5 text-success" aria-label="Saved" />}
              {item.status === "failed" && <AlertCircle className="size-5 text-destructive" aria-label="Failed" />}
              {item.status === "done" && item.result && (
                <Button size="sm" variant="soft" onClick={() => onPreview(item.result!)}>
                  <Eye /> Preview
                </Button>
              )}
              {item.status === "failed" && (
                <Button size="sm" variant="outline" onClick={() => onRetry(item.key)}>
                  <RotateCcw /> Retry
                </Button>
              )}
              {item.status !== "uploading" && (
                <Button variant="ghost" size="icon" onClick={() => onRemove(item.key)} aria-label={`Remove ${item.file.name} from list`}>
                  <X />
                </Button>
              )}
            </div>
            {(item.status === "uploading" || item.status === "done") && (
              <div
                className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={item.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.file.name} progress`}
              >
                <div
                  className={cn("h-full rounded-full transition-[width] duration-300", item.status === "done" ? "bg-success" : "bg-gradient-primary")}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            )}
            {item.status === "failed" && item.error && (
              <p className="mt-2 rounded-lg bg-destructive-soft px-3 py-2 text-xs font-medium text-destructive">{item.error}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
