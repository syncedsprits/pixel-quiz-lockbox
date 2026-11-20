/**
 * Shared project uploads (Lovable Cloud). Files are stored as shared project resources: everyone
 * with access to a project sees and can open them. Every call is scoped by projectId and checked on
 * the server (sign-in, plus quiz + verified email code for quiz-protected projects).
 */
import { backendAuthHeaders, callRemote, remoteBackendOrigin } from "@/lib/backend/remote-backend";
import type { Extracted } from "./extracted";
import type { FileCategory } from "./formats";
import type { SharedUpload } from "./uploads-schemas";

export interface StoredFile {
  id: string;
  projectId: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  uploadedAt: string;
  /** "processed" when readable content was extracted; "stored" when only the original was kept. */
  processing: "processed" | "stored";
  /** Short description of what was read from the file. */
  summary: string;
  hasText: boolean;
  /** True when the signed-in user uploaded it and may remove it. */
  canRemove: boolean;
  /** Who uploaded it ("you", a masked email, or "a project member"). */
  uploadedBy: string;
  storage: "cloud";
  /** Same-site, access-checked address of the original file. */
  url: string;
  /** Present only right after this browser uploaded the file. Otherwise read from `url` when previewed. */
  extracted?: Extracted;
  blob?: Blob;
}

export const FILES_CHANGED_EVENT = "handoverpulse:files-changed";

export class StorageUnavailableError extends Error {
  constructor() {
    super("The shared file library couldn't be reached. Please check your connection and try again.");
  }
}

export const uploadUrl = (projectId: string, id: string) =>
  `/api/project-uploads/${encodeURIComponent(projectId)}/${encodeURIComponent(id)}`;

function fromShared(s: SharedUpload): StoredFile {
  return {
    ...s,
    category: s.category as FileCategory,
    storage: "cloud",
    url: uploadUrl(s.projectId, s.id),
  };
}

function notify(projectId: string) {
  window.dispatchEvent(new CustomEvent(FILES_CHANGED_EVENT, { detail: { projectId } }));
}

async function list(projectId: string | null): Promise<StoredFile[]> {
  const origin = remoteBackendOrigin();
  const rows = origin
    ? await callRemote<SharedUpload[]>(origin, "list-uploads", { projectId })
    : await (await import("./uploads.functions")).listUploads({ data: { projectId } });
  return rows.filter((r) => projectId === null || r.projectId === projectId).map(fromShared);
}

export function listFiles(projectId: string): Promise<StoredFile[]> {
  return list(projectId);
}

/** Shared uploads of every project the signed-in user can open. */
export function listAllFiles(): Promise<StoredFile[]> {
  return list(null);
}

/** Uploads one file to a project's shared library. Resolves only after the server confirms the save. */
export async function saveFile(input: {
  projectId: string;
  file: File;
  buffer: ArrayBuffer;
  extracted: Extracted;
  summary: string;
  hasText: boolean;
  processing: "processed" | "stored";
}): Promise<StoredFile> {
  const origin = remoteBackendOrigin();
  const path = `/api/${origin ? "public/hp-upload" : "project-upload"}/${encodeURIComponent(input.projectId)}`;
  const form = new FormData();
  form.append("file", new File([input.buffer], input.file.name, { type: input.file.type }));
  form.append("summary", input.summary);
  form.append("hasText", String(input.hasText));
  form.append("processing", input.processing);
  let res: Response;
  try {
    res = await fetch(`${origin ?? ""}${path}`, {
      method: "POST",
      mode: origin ? "cors" : "same-origin",
      credentials: origin ? "omit" : "same-origin",
      cache: "no-store",
      headers: await backendAuthHeaders(),
      body: form,
    });
  } catch {
    throw new StorageUnavailableError();
  }
  const body = (await res.json().catch(() => null)) as { result?: SharedUpload; error?: string } | null;
  if (!res.ok || !body?.result) throw new Error(body?.error || "The file couldn't be saved. Please try again.");
  const saved = fromShared(body.result);
  notify(input.projectId);
  return { ...saved, extracted: input.extracted, blob: new Blob([input.buffer], { type: saved.mimeType }) };
}

/** Removes a shared file from its project (only its uploader may do this; checked on the server). */
export async function deleteFile(projectId: string, id: string): Promise<void> {
  const origin = remoteBackendOrigin();
  if (origin) await callRemote(origin, "delete-upload", { projectId, uploadId: id });
  else await (await import("./uploads.functions")).deleteUpload({ data: { projectId, uploadId: id } });
  notify(projectId);
}
