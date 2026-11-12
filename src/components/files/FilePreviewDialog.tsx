import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProject } from "@/data/projects";
import type { ProjectDocument } from "@/data/types";
import { fetchProtectedFile } from "@/lib/access/protected-fetch";
import { downloadBlob, downloadUrl, responseError } from "@/lib/files/download";
import { extractContent, ExtractionError } from "@/lib/files/extract";
import { extractionSummary, type Extracted } from "@/lib/files/extracted";
import { formatBytes, getExtension, getFormat } from "@/lib/files/formats";
import { recordRecentFile } from "@/lib/files/recent";
import type { StoredFile } from "@/lib/files/store";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExtractedView } from "./ExtractedView";

export type FileTarget =
  | { source: "reference"; projectId: string; doc: ProjectDocument }
  | { source: "upload"; file: StoredFile };

export function targetInfo(t: FileTarget) {
  if (t.source === "reference") {
    return {
      id: t.doc.id,
      projectId: t.projectId,
      name: t.doc.name,
      ext: getExtension(t.doc.downloadName),
      typeLabel: t.doc.typeLabel,
      mime: t.doc.mimeType,
      size: t.doc.sizeBytes,
      date: `Added ${formatDate(t.doc.addedAt)}`,
      kind: t.doc.kind,
    };
  }
  const f = t.file;
  return {
    id: f.id,
    projectId: f.projectId,
    name: f.name,
    ext: f.extension,
    typeLabel: getFormat(f.name)?.label ?? f.extension.toUpperCase(),
    mime: f.mimeType,
    size: f.size,
    date: `Uploaded ${formatDateTime(f.uploadedAt)}`,
    kind: getFormat(f.name)?.kind ?? "doc",
  };
}

export async function downloadTarget(t: FileTarget) {
  const info = targetInfo(t);
  try {
    if (t.source === "reference") await downloadUrl(t.doc.url, t.doc.downloadName, t.doc.mimeType);
    else downloadBlob(t.file.blob, t.file.name);
    recordRecentFile({ projectId: info.projectId, fileId: info.id, name: info.name, kind: info.kind, source: t.source });
  } catch (e) {
    toast.error("Download failed", {
      description: e instanceof Error && e.message ? e.message : `${info.name} couldn't be downloaded. Please try again.`,
    });
  }
}

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; extracted: Extracted; blobUrl: string };

export function FilePreviewDialog({
  target,
  initialTab = "preview",
  onOpenChange,
}: {
  target: FileTarget | null;
  initialTab?: "preview" | "details";
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [tab, setTab] = useState(initialTab);
  const [pdfMode, setPdfMode] = useState<"document" | "text">("document");

  useEffect(() => setTab(initialTab), [initialTab, target]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    let url = "";
    setState({ status: "loading" });
    setPdfMode("document");
    const info = targetInfo(target);
    recordRecentFile({ projectId: info.projectId, fileId: info.id, name: info.name, kind: info.kind, source: target.source });
    (async () => {
      try {
        let blob: Blob;
        let extracted: Extracted;
        if (target.source === "reference") {
          const res = await fetchProtectedFile(target.doc.url);
          if (!res.ok) throw new Error(await responseError(res, "The file couldn't be loaded"));
          const buffer = await res.arrayBuffer();
          blob = new Blob([buffer], { type: target.doc.mimeType });
          extracted = await extractContent(info.ext, buffer, target.doc.mimeType);
        } else {
          blob = target.file.blob;
          extracted = target.file.extracted;
        }
        url = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "ready", extracted, blobUrl: url });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof ExtractionError || e instanceof Error ? e.message : "This file couldn't be previewed.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [target]);

  const info = target ? targetInfo(target) : null;
  const project = info ? getProject(info.projectId) : undefined;
  const isPdf = info?.ext === "pdf";
  const isImage = info ? ["png", "jpg", "jpeg", "webp"].includes(info.ext) : false;

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-2xl">
        {info && target && (
          <>
            <DialogHeader>
              <DialogTitle className="break-words pr-6 text-lg font-bold">{info.name}</DialogTitle>
              <DialogDescription>
                {info.typeLabel} · {formatBytes(info.size)} · {info.date}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "preview" | "details")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList className="rounded-xl">
                  <TabsTrigger value="preview" className="rounded-lg">
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="details" className="rounded-lg">
                    Details
                  </TabsTrigger>
                </TabsList>
                <Button size="sm" variant="soft" onClick={() => downloadTarget(target)}>
                  <Download /> Download
                </Button>
              </div>

              <TabsContent value="preview" className="mt-4">
                {state.status === "loading" && (
                  <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading the file…
                  </p>
                )}
                {state.status === "error" && (
                  <p className="rounded-xl bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive">{state.message}</p>
                )}
                {state.status === "ready" && (
                  <div className="space-y-3">
                    {isPdf && (
                      <div className="flex gap-1.5">
                        {(["document", "text"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPdfMode(m)}
                            className={cn(
                              "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                              pdfMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {m === "document" ? "Document" : "Extracted text"}
                          </button>
                        ))}
                      </div>
                    )}
                    {isPdf && pdfMode === "document" ? (
                      <iframe src={state.blobUrl} title={`Preview of ${info.name}`} className="h-[65vh] w-full rounded-xl border bg-muted" />
                    ) : isImage ? (
                      <div className="space-y-3">
                        <img src={state.blobUrl} alt={info.name} className="mx-auto max-h-[60vh] rounded-xl border object-contain" />
                        <ExtractedView extracted={state.extracted} fileName={info.name} />
                      </div>
                    ) : (
                      <ExtractedView extracted={state.extracted} fileName={info.name} />
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["File name", info.name],
                    ["Project", project?.shortName ?? "Unknown project"],
                    ["File type", info.typeLabel],
                    ["MIME type", info.mime || "Not reported"],
                    ["Size", formatBytes(info.size)],
                    ["Date", info.date],
                    [
                      "Stored in",
                      target.source === "reference" ? "Supplied reference document (secure storage)" : "This browser only (local mode)",
                    ],
                    [
                      "Processing",
                      target.source === "upload"
                        ? extractionSummary(target.file.extracted)
                        : state.status === "ready"
                          ? extractionSummary(state.extracted)
                          : "Read when previewed",
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-muted p-3">
                      <dt className="text-xs font-semibold text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 break-words font-semibold text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
                {target.source === "reference" && <p className="mt-3 text-sm text-muted-foreground">{target.doc.description}</p>}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
