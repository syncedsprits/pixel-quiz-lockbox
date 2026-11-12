import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";

import { ACCEPT_ATTRIBUTE, formatBytes, MAX_FILE_BYTES } from "@/lib/files/formats";
import { cn } from "@/lib/utils";

export function FileDropzone({
  onFiles,
  title = "Drop files or click to browse",
  compact = false,
  inputRef: externalRef,
}: {
  onFiles: (files: File[]) => void;
  title?: string;
  compact?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? ownRef;
  const [dragging, setDragging] = useState(false);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center rounded-2xl border-2 border-dashed bg-background px-6 text-center transition-colors",
          compact ? "py-6" : "py-9",
          dragging ? "border-primary bg-primary-soft" : "hover:border-primary/40",
        )}
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Upload className="size-5" />
        </span>
        <span className="mt-3 text-sm font-bold text-foreground">{title}</span>
        <span className="mt-1 text-xs text-muted-foreground">
          PDF, Word, TXT, MD, RTF, JSON, CSV, Excel, PowerPoint, ZIP, chat exports and images · up to {formatBytes(MAX_FILE_BYTES)} each
        </span>
      </button>
    </>
  );
}
