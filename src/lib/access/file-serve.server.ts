import { getDocument } from "@/data/projects";
import { getAccessSession, hasFileAccess, userIdFromRequest } from "./access.server";

/**
 * Serves a protected reference document. The caller must be signed in (bearer token), and this
 * browser session's access token must belong to that same user's session that passed the quiz
 * AND verified an email code for this exact project. Used by /api/project-files (same site)
 * and /api/public/hp-files (site hosted elsewhere).
 */
export async function serveProjectFile(request: Request, projectId: string, docId: string): Promise<Response> {
  const deny = (status: number, message: string) =>
    Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

  const doc = getDocument(projectId, docId);
  if (!doc) return deny(404, "File not found.");

  const userId = await userIdFromRequest(request);
  if (!userId) return deny(401, "Sign in to open project files.");
  const session = await getAccessSession(projectId, userId);
  if (!hasFileAccess(session)) {
    return deny(403, "Pass the onboarding quiz and verify your email to open this file.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from("project-documents").download(doc.storagePath);
  if (error || !data) return deny(404, "This file hasn't been uploaded to secure storage yet.");

  const download = new URL(request.url).searchParams.get("download") === "1";
  const encoded = encodeURIComponent(doc.downloadName);
  return new Response(data, {
    status: 200,
    headers: {
      "content-type": doc.mimeType,
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
