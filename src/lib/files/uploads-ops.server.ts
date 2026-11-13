import type { z } from "zod";

import { getProject, projects } from "@/data/projects";
import { getAccessSession, hasFileAccess, userFromRequest } from "@/lib/access/access.server";
import { checkSignature, getFormat, validateFile, type FileCategory } from "./formats";
import { canRemoveSharedUpload, canSeeSharedUploads, UPLOAD_SUMMARY_MAX } from "./shared-access";
import type { deleteUploadSchema, listUploadsSchema, SharedUpload } from "./uploads-schemas";

/**
 * Shared project uploads. Files live in the private "project-uploads" bucket under
 * <projectId>/<uploadId>/<file name>, metadata in project_uploads. Only this server code (trusted
 * credentials) touches either; every call checks the signed-in caller's access to that project.
 * Used by the server functions (Lovable hosting) and the /api/public routes (site hosted elsewhere).
 */
const BUCKET = "project-uploads";

type Row = {
  id: string;
  project_id: string;
  name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  processing: string;
  summary: string;
  has_text: boolean;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
};

const COLUMNS =
  "id, project_id, name, extension, mime_type, size_bytes, category, processing, summary, has_text, storage_path, uploaded_by, created_at";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** True when the caller may see this project's shared uploads (reads this request's access token). */
async function canAccess(projectId: string, userId: string): Promise<boolean> {
  const project = getProject(projectId);
  if (!project) return false;
  if (project.quiz.length === 0) return canSeeSharedUploads(project, false);
  return canSeeSharedUploads(project, hasFileAccess(await getAccessSession(projectId, userId)));
}

function toShared(r: Row, userId: string): SharedUpload {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    extension: r.extension,
    mimeType: r.mime_type,
    size: Number(r.size_bytes),
    category: r.category,
    uploadedAt: r.created_at,
    processing: r.processing === "processed" ? "processed" : "stored",
    summary: r.summary,
    hasText: r.has_text,
    canRemove: canRemoveSharedUpload(r.uploaded_by, userId),
  };
}

/** Shared uploads of one project, or of every project the caller can open when projectId is null. */
export async function runListUploads(data: z.output<typeof listUploadsSchema>, userId: string): Promise<SharedUpload[]> {
  const ids = data.projectId ? [data.projectId] : projects.map((p) => p.id);
  const allowed: string[] = [];
  for (const id of ids) if (await canAccess(id, userId)) allowed.push(id);
  if (!allowed.length) return [];
  const sb = await admin();
  const { data: rows, error } = await sb
    .from("project_uploads")
    .select(COLUMNS)
    .in("project_id", allowed)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Shared files couldn't be loaded. Please try again.");
  return (rows as Row[]).filter((r) => allowed.includes(r.project_id)).map((r) => toShared(r, userId));
}

/** Removes a shared upload. Only its uploader may do this. */
export async function runDeleteUpload(data: z.output<typeof deleteUploadSchema>, userId: string): Promise<{ ok: true }> {
  if (!(await canAccess(data.projectId, userId))) throw new Error("You don't have access to this project's files.");
  const sb = await admin();
  const { data: row } = await sb
    .from("project_uploads")
    .select(COLUMNS)
    .eq("id", data.uploadId)
    .eq("project_id", data.projectId)
    .maybeSingle();
  if (!row) throw new Error("That file isn't in this project.");
  const r = row as Row;
  if (!canRemoveSharedUpload(r.uploaded_by, userId)) throw new Error("Only the person who uploaded this file can remove it.");
  const { error: rmErr } = await sb.storage.from(BUCKET).remove([r.storage_path]);
  if (rmErr) throw new Error("The file couldn't be removed. Please try again.");
  const { error } = await sb.from("project_uploads").delete().eq("id", r.id);
  if (error) throw new Error("The file couldn't be removed. Please try again.");
  return { ok: true };
}

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Stores one uploaded file (multipart form: file, summary, hasText) as a shared project resource. */
export async function handleUploadRequest(request: Request, projectId: string): Promise<Response> {
  const user = await userFromRequest(request);
  if (!user) return json(401, { error: "Please sign in again." });
  if (!(await canAccess(projectId, user.id))) return json(403, { error: "You don't have access to this project's files." });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !file || typeof file === "string") return json(400, { error: "No file was received." });
  const valid = validateFile({ name: file.name, size: file.size, type: file.type });
  if (!valid.ok) return json(400, { error: valid.error });
  const buffer = await file.arrayBuffer();
  const sigError = checkSignature(valid.ext, new Uint8Array(buffer.slice(0, 16)));
  if (sigError) return json(400, { error: sigError });

  const name = file.name.split(/[\\/]/).pop()!.slice(0, 255);
  const format = getFormat(name)!;
  const summary = String(form.get("summary") ?? "").slice(0, UPLOAD_SUMMARY_MAX);
  const hasText = form.get("hasText") === "true";
  const processing = form.get("processing") === "processed" ? "processed" : "stored";
  const id = crypto.randomUUID();
  const safeName = name.replace(/[^\w.\- ()]+/g, "_");
  const storagePath = `${projectId}/${id}/${safeName}`;
  const mime = file.type || "application/octet-stream";

  const sb = await admin();
  const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (upErr) {
    console.error("[uploads] storage upload failed", upErr.message);
    return json(500, { error: "The file couldn't be saved. Please try again." });
  }
  const { data: row, error } = await sb
    .from("project_uploads")
    .insert({
      id,
      project_id: projectId,
      name,
      extension: valid.ext,
      mime_type: mime,
      size_bytes: file.size,
      category: format.category satisfies FileCategory,
      processing,
      summary,
      has_text: hasText,
      storage_path: storagePath,
      uploaded_by: user.id,
      uploader_email: user.email || null,
    })
    .select(COLUMNS)
    .single();
  if (error || !row) {
    await sb.storage.from(BUCKET).remove([storagePath]);
    console.error("[uploads] insert failed", error?.message);
    return json(500, { error: "The file couldn't be saved. Please try again." });
  }
  return json(200, { result: toShared(row as Row, user.id) });
}

/** Returns the original bytes of a shared upload to a caller with access to its project. */
export async function serveUpload(request: Request, projectId: string, uploadId: string): Promise<Response> {
  const user = await userFromRequest(request);
  if (!user) return json(401, { error: "Sign in to open project files." });
  if (!(await canAccess(projectId, user.id))) return json(403, { error: "Pass the onboarding quiz and verify your email to open this file." });
  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return json(404, { error: "File not found." });
  const sb = await admin();
  const { data: row } = await sb.from("project_uploads").select(COLUMNS).eq("id", uploadId).eq("project_id", projectId).maybeSingle();
  if (!row) return json(404, { error: "File not found." });
  const r = row as Row;
  const { data, error } = await sb.storage.from(BUCKET).download(r.storage_path);
  if (error || !data) return json(404, { error: "This file couldn't be found in storage." });
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": r.mime_type,
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(r.name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
