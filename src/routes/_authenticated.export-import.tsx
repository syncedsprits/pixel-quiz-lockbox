import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Download, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { FileDropzone } from "@/components/files/FileDropzone";
import { FilePreviewDialog, type FileTarget } from "@/components/files/FilePreviewDialog";
import { LocalStorageNotice } from "@/components/files/LocalStorageNotice";
import { PackageSummary } from "@/components/files/PackageSummary";
import { UploadQueue } from "@/components/files/UploadQueue";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProject, projects } from "@/data/projects";
import { useUploadQueue } from "@/lib/files/hooks";
import { buildHandoverPackage } from "@/lib/handover-package";

export const Route = createFileRoute("/_authenticated/export-import")({
  head: () => ({
    meta: [
      { title: "Export / Import — HandoverPulse" },
      { name: "description", content: "Export a project's handover package or import documents, data, slides, archives, chats and images into a project." },
      { property: "og:title", content: "Export / Import — HandoverPulse" },
      { property: "og:description", content: "Export a project's handover package or import files into a project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExportImportPage,
});

function ExportImportPage() {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [destination, setDestination] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<FileTarget | null>(null);
  const [dismissedPackage, setDismissedPackage] = useState<string | null>(null);
  const queue = useUploadQueue();
  const queued = queue.items.filter((i) => i.status === "queued").length;
  const destinationProject = getProject(destination);

  // The latest successfully imported HandoverPulse package, shown in the import preview as before.
  const latestPackage = useMemo(
    () =>
      [...queue.items]
        .reverse()
        .find((i) => i.status === "done" && i.result?.extracted?.kind === "package" && i.key !== dismissedPackage),
    [queue.items, dismissedPackage],
  );

  function exportProject() {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const blob = new Blob([JSON.stringify(buildHandoverPackage(project), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-handover.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Handover package exported", { description: `${project.shortName} downloaded as JSON.` });
  }

  async function upload() {
    if (!destinationProject) return;
    setUploading(true);
    const { ok, failed } = await queue.uploadAll(destinationProject.id);
    setUploading(false);
    if (ok) toast.success(`${ok} file${ok === 1 ? "" : "s"} shared with the project`, { description: `Added to ${destinationProject.shortName}` });
    if (failed) toast.error(`${failed} file${failed === 1 ? "" : "s"} couldn't be uploaded`, { description: "See the list for details." });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export / Import"
        description="Export a project's handover package, or import documents, data, slides, archives, chat exports and images into a project."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Export a project">
          <p className="text-sm text-muted-foreground">
            Includes description, lead, team, milestones, documents list and onboarding quiz.
          </p>
          <div className="mt-5 space-y-3">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-11 rounded-xl bg-background" aria-label="Project to export">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="hero" size="lg" className="w-full" onClick={exportProject}>
              <Download /> Download package
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Import files">
          <div className="space-y-3">
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-11 rounded-xl bg-background" aria-label="Project to import into">
                <SelectValue placeholder="Choose the project these files belong to" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(36rem,90vw)] rounded-xl">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="whitespace-normal">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FileDropzone onFiles={queue.add} title="Drop files or click to browse — select as many as you like" />
            <LocalStorageNotice />
          </div>
        </SectionCard>
      </div>

      {queue.items.length > 0 && (
        <SectionCard
          title={`Selected files (${queue.items.length})`}
          action={
            queue.items.some((i) => i.status === "done") ? (
              <Button variant="ghost" size="sm" onClick={queue.clearFinished}>
                Clear finished
              </Button>
            ) : undefined
          }
        >
          <UploadQueue
            items={queue.items}
            onRemove={queue.remove}
            onRetry={(key) => {
              const item = queue.items.find((i) => i.key === key);
              const target = item?.projectId ?? destinationProject?.id;
              if (!target) {
                toast.error("Choose a project first");
                return;
              }
              void queue.retry(key, target);
            }}
            onPreview={(file) => setPreview({ source: "upload", file })}
          />
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {destinationProject ? (
                <>
                  Files will be added to <strong className="text-foreground">{destinationProject.shortName}</strong> only.
                </>
              ) : (
                "Choose a project above before uploading — files are never added to a project automatically."
              )}
            </p>
            <div className="flex gap-2">
              {destinationProject && queue.items.some((i) => i.status === "done") && (
                <Button asChild variant="outline" size="lg">
                  <Link to="/projects/$projectId" params={{ projectId: destinationProject.id }}>
                    Open project <ArrowRight />
                  </Link>
                </Button>
              )}
              <Button variant="hero" size="lg" disabled={!destinationProject || !queued || uploading} onClick={upload}>
                <Upload /> {uploading ? "Uploading…" : queued ? `Upload ${queued} file${queued === 1 ? "" : "s"}` : "Upload"}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {latestPackage?.result?.extracted.kind === "package" && (
        <SectionCard
          title="Import preview"
          action={
            <Button variant="ghost" size="icon" onClick={() => setDismissedPackage(latestPackage.key)} aria-label="Clear import preview">
              <X />
            </Button>
          }
        >
          <PackageSummary data={latestPackage.result.extracted.data} fileName={latestPackage.result.name} />
          <p className="mt-3 text-xs text-muted-foreground">
            The package file is saved under {getProject(latestPackage.result.projectId)?.shortName}. Its contents are shown for review and
            don't replace that project's details.
          </p>
        </SectionCard>
      )}

      <FilePreviewDialog target={preview} onOpenChange={(o) => !o && setPreview(null)} />
    </div>
  );
}
