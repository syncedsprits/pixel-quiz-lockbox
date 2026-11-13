import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Eye, Info, Loader2, Lock, MailCheck, PlayCircle, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SectionCard } from "@/components/common/SectionCard";
import { DocumentIcon } from "@/components/projects/DocumentIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Project } from "@/data/types";
import { accessStatusQuery } from "@/lib/access/access-queries";
import { QUIZ_PASS_MIN_CORRECT } from "@/lib/access/quiz-grading";
import { formatBytes, getFormat } from "@/lib/files/formats";
import { useProjectFiles, useUploadQueue } from "@/lib/files/hooks";
import { forgetRecentFile } from "@/lib/files/recent";
import { deleteFile, type StoredFile } from "@/lib/files/store";
import { formatDate, formatDateTime } from "@/lib/format";
import { orderDocumentsForRole } from "@/lib/roles/role-order";
import { FileDropzone } from "./FileDropzone";
import { downloadTarget, FilePreviewDialog, type FileTarget } from "./FilePreviewDialog";
import { LocalStorageNotice } from "./LocalStorageNotice";
import { SourceTag } from "./SourceTag";
import { UploadQueue } from "./UploadQueue";

function FileRow({
  icon,
  name,
  meta,
  description,
  tag,
  onPreview,
  onDownload,
  onDetails,
  onRemove,
}: {
  icon: React.ReactNode;
  name: string;
  meta: string;
  description?: string;
  tag?: React.ReactNode;
  onPreview: () => void;
  onDownload: () => void;
  onDetails: () => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{meta}</p>
          {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
          {tag && <div className="mt-1.5">{tag}</div>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
        <Button size="sm" variant="soft" onClick={onPreview}>
          <Eye /> Preview
        </Button>
        <Button variant="ghost" size="icon" onClick={onDownload} aria-label={`Download ${name}`}>
          <Download />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDetails} aria-label={`Details for ${name}`}>
          <Info />
        </Button>
        {onRemove && (
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={onRemove} aria-label={`Remove ${name}`}>
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  );
}

/** Shown instead of the files until the quiz is passed and the email OTP is verified. */
function LockedFiles({ project, quizPassed }: { project: Project; quizPassed: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border bg-background p-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-panel text-primary">
        <Lock className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">Project files are locked</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {quizPassed
            ? "You passed the onboarding quiz. Verify your email with a one-time code to open the files."
            : `Answer at least ${QUIZ_PASS_MIN_CORRECT} of ${project.quiz.length} onboarding quiz questions correctly, then verify your email with a one-time code to open the files.`}
        </p>
      </div>
      <Button asChild variant="hero" size="sm" className="shrink-0">
        {quizPassed ? (
          <Link to="/projects/$projectId/verify" params={{ projectId: project.id }}>
            <MailCheck /> Verify email
          </Link>
        ) : (
          <Link to="/projects/$projectId/quiz" params={{ projectId: project.id }}>
            <PlayCircle /> Start Quiz
          </Link>
        )}
      </Button>
    </div>
  );
}

export function ProjectFilesSection({ project }: { project: Project }) {
  const isProtected = project.quiz.length > 0;
  const access = useQuery({ ...accessStatusQuery(project.id), enabled: isProtected });
  const unlocked = !isProtected || !!access.data?.emailVerified;

  useEffect(() => {
    if (unlocked && isProtected && window.location.hash === "#project-files") {
      document.getElementById("project-files")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [unlocked, isProtected]);

  if (!unlocked) {
    return (
      <div id="project-files" className="scroll-mt-6">
        <SectionCard title="Project Files and Resources">
          {access.isPending ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking file access…
            </p>
          ) : access.isError ? (
            <p className="rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">
              File access couldn't be checked. Please refresh the page.
            </p>
          ) : (
            <LockedFiles project={project} quizPassed={!!access.data?.quizPassed} />
          )}
        </SectionCard>
      </div>
    );
  }

  return <UnlockedFilesSection project={project} role={access.data?.role ?? null} />;
}

function UnlockedFilesSection({ project, role }: { project: Project; role: string | null }) {
  // Same documents, shown in the order that suits the role picked before the quiz (Project Overview first).
  const documents = orderDocumentsForRole(project.documents, role);
  const { files, loading, error } = useProjectFiles(project.id);
  const queue = useUploadQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ target: FileTarget; tab: "preview" | "details" } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StoredFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const queued = queue.items.filter((i) => i.status === "queued").length;

  async function upload() {
    setUploading(true);
    const { ok, failed } = await queue.uploadAll(project.id);
    setUploading(false);
    if (ok) toast.success(`${ok} file${ok === 1 ? "" : "s"} shared with the project`, { description: project.shortName });
    if (failed) toast.error(`${failed} file${failed === 1 ? "" : "s"} couldn't be uploaded`, { description: "See the list for details." });
  }

  async function confirmDelete() {
    const f = pendingDelete;
    if (!f) return;
    setPendingDelete(null);
    try {
      await deleteFile(project.id, f.id);
      forgetRecentFile(project.id, f.id);
      toast.success("File removed", { description: f.name });
    } catch (e) {
      toast.error("Couldn't remove the file", { description: e instanceof Error ? e.message : undefined });
    }
  }

  return (
    <div id="project-files" className="scroll-mt-6">
    <SectionCard
      title="Project Files and Resources"
      action={
        <Button size="sm" variant="soft" onClick={() => inputRef.current?.click()}>
          <Upload /> Upload files
        </Button>
      }
    >
      {project.documents.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Reference documents ({project.documents.length})</h3>
            <SourceTag type="verified" source="supplied by the project team" />
          </div>
          {role && <p className="mb-2 text-xs text-muted-foreground">Ordered for your role: {role}</p>}
          <ul className="space-y-2">
            {documents.map((d) => {
              const target: FileTarget = { source: "reference", projectId: project.id, doc: d };
              return (
                <FileRow
                  key={d.id}
                  icon={<DocumentIcon kind={d.kind} />}
                  name={d.name}
                  meta={`${d.typeLabel} · ${formatBytes(d.sizeBytes)} · Added ${formatDate(d.addedAt)}`}
                  description={d.description}
                  onPreview={() => setPreview({ target, tab: "preview" })}
                  onDownload={() => downloadTarget(target)}
                  onDetails={() => setPreview({ target, tab: "details" })}
                />
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">Uploaded files ({files.length})</h3>
        {files.length > 0 && <SourceTag type="imported" />}
      </div>
      <LocalStorageNotice className="mb-3" />
      {error && <p className="mb-3 rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
      {loading ? (
        <p className="py-4 text-sm text-muted-foreground">Loading files…</p>
      ) : files.length ? (
        <ul className="mb-4 space-y-2">
          {files.map((f) => {
            const target: FileTarget = { source: "upload", file: f };
            return (
              <FileRow
                key={f.id}
                icon={<DocumentIcon kind={getFormat(f.name)?.kind ?? "doc"} />}
                name={f.name}
                meta={`${getFormat(f.name)?.label ?? f.extension} · ${formatBytes(f.size)} · Uploaded ${formatDateTime(f.uploadedAt)}`}
                description={f.summary}
                onPreview={() => setPreview({ target, tab: "preview" })}
                onDownload={() => downloadTarget(target)}
                onDetails={() => setPreview({ target, tab: "details" })}
                onRemove={f.canRemove ? () => setPendingDelete(f) : undefined}
              />
            );
          })}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">No files have been uploaded to this project yet.</p>
      )}

      <FileDropzone compact inputRef={inputRef} onFiles={queue.add} title={`Drop files for ${project.shortName} or click to browse`} />
      {queue.items.length > 0 && (
        <div className="mt-3 space-y-3">
          <UploadQueue
            items={queue.items}
            onRemove={queue.remove}
            onRetry={(key) => void queue.retry(key, project.id)}
            onPreview={(file) => setPreview({ target: { source: "upload", file }, tab: "preview" })}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {queue.items.some((i) => i.status === "done") && (
              <Button variant="ghost" size="sm" onClick={queue.clearFinished}>
                Clear finished
              </Button>
            )}
            <Button variant="hero" size="sm" disabled={!queued || uploading} onClick={upload}>
              <Upload /> {uploading ? "Uploading…" : queued ? `Upload ${queued} file${queued === 1 ? "" : "s"}` : "Upload"}
            </Button>
          </div>
        </div>
      )}

      <FilePreviewDialog target={preview?.target ?? null} initialTab={preview?.tab ?? "preview"} onOpenChange={(o) => !o && setPreview(null)} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this file?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be removed from {project.shortName} for everyone. Other projects aren't affected. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Remove file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
    </div>
  );
}
